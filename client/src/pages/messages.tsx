import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { LockKeyhole, MessageCircle, MessageSquare, RefreshCw, Send } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Match, Message, Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface MatchWithProfile extends Match {
  otherProfile: Profile;
}

type DraftUpdate = string | ((current: string) => string);
interface SendVariables {
  matchId: string;
  content: string;
}

const CHAT_GATES = new Set(["gate3", "gate4", "gate5", "completed"]);
const MESSAGE_LIMIT = 2000;

const threadKey = (id: string) => [`/api/matches/${id}/messages`];
const unauthorized = (error: unknown) => error instanceof Error && /\b401\b/.test(error.message);
const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message.trim() ? error.message : fallback;

function gateLabel(gate: Match["currentGate"]) {
  return {
    gate1: "Gate 1 · The Spark",
    gate2: "Gate 2 · The Curiosity",
    gate3: "Gate 3 · Getting Real",
    gate4: "Gate 4 · Face to Face",
    gate5: "Gate 5 · Beyond the Screen",
    completed: "Connected",
  }[gate];
}

function nameFor(profile: Profile) {
  return profile.displayName || "Your match";
}

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "?";
}

function asDate(value: Message["createdAt"] | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function messageTime(value: Message["createdAt"]) {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date) : "Time unavailable";
}

function ErrorState({
  title,
  error,
  fallback,
  onRetry,
  testId,
}: {
  title: string;
  error: unknown;
  fallback: string;
  onRetry: () => void;
  testId: string;
}) {
  const authError = unauthorized(error);
  return (
    <Alert variant="destructive" data-testid={testId}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{authError ? "Your session has expired" : title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{authError ? "Please sign in again to continue." : errorText(error, fallback)}</p>
        {authError ? (
          <Button type="button" variant="outline" size="sm" onClick={() => { window.location.href = "/api/login"; }}>
            Sign in again
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onRetry} data-testid={`${testId}-retry`}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function AuthState({ loading = false }: { loading?: boolean }) {
  return (
    <div className="flex min-h-[55vh] items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {loading ? <RefreshCw className="h-7 w-7 animate-spin text-primary" aria-hidden="true" /> : <MessageSquare className="h-7 w-7 text-primary" aria-hidden="true" />}
          </div>
          <CardTitle>{loading ? "Checking your account" : "Sign in to view messages"}</CardTitle>
          <CardDescription>{loading ? "Loading your secure conversations." : "Your conversations are available after you sign in."}</CardDescription>
        </CardHeader>
        {!loading && (
          <CardContent className="flex justify-center">
            <Button type="button" onClick={() => { window.location.href = "/api/login"; }} data-testid="button-messages-login">Sign in</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function MatchRow({
  match,
  locked = false,
  selected = false,
  onSelect,
}: {
  match: MatchWithProfile;
  locked?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const name = nameFor(match.otherProfile);
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onSelect}
      aria-pressed={!locked && selected}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${locked ? "cursor-not-allowed border-dashed bg-muted/30 opacity-75" : selected ? "border-primary bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/60"}`}
      data-testid={`${locked ? "locked-conversation" : "conversation"}-${match.id}`}
    >
      <Avatar className={locked ? "h-10 w-10 opacity-70" : "h-11 w-11"}>
        <AvatarImage src={match.otherProfile.photos?.[0] || undefined} alt="" />
        <AvatarFallback className={!locked ? "bg-primary/10 text-primary" : undefined}>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{gateLabel(match.currentGate)}</span>
      </span>
      {locked ? <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Conversation locked" /> : <MessageCircle className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />}
    </button>
  );
}

function LoadingList() {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">Loading your conversations</span>
      {[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3 rounded-lg border p-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>)}
    </div>
  );
}

function ConversationThread({
  match,
  currentUserId,
  draft,
  updateDraft,
  pendingMatchId,
  sendError,
  sendMessage,
  clearSendError,
  lastSent,
}: {
  match: MatchWithProfile;
  currentUserId: string;
  draft: string;
  updateDraft: (matchId: string, update: DraftUpdate) => void;
  pendingMatchId: string | null;
  sendError: Error | null;
  sendMessage: (matchId: string, content: string) => boolean;
  clearSendError: (matchId: string) => void;
  lastSent: { matchId: string; version: number };
}) {
  const matchId = match.id;
  const name = nameFor(match.otherProfile);
  const [validationError, setValidationError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const messagesQuery = useQuery<Message[]>({
    queryKey: threadKey(matchId),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const scrollToEnd = (behavior: ScrollBehavior = "auto") => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior });
  };
  useEffect(() => {
    if (!messagesQuery.isSuccess || initialScrollDone.current) return;
    initialScrollDone.current = true;
    window.requestAnimationFrame(() => scrollToEnd());
  }, [messagesQuery.isSuccess]);
  useEffect(() => {
    if (lastSent.matchId === matchId) window.requestAnimationFrame(() => scrollToEnd("smooth"));
  }, [lastSent.matchId, lastSent.version, matchId]);

  const composerDisabled = messagesQuery.isLoading || messagesQuery.isError || pendingMatchId !== null;
  const submit = () => {
    if (composerDisabled) return;
    const content = draft.trim();
    if (!content) return setValidationError("Write a message before sending.");
    if (content.length > MESSAGE_LIMIT) return setValidationError(`Messages must be ${MESSAGE_LIMIT} characters or fewer.`);
    setValidationError(null);
    sendMessage(matchId, content);
  };
  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/20 p-4 md:p-5">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11"><AvatarImage src={match.otherProfile.photos?.[0] || undefined} alt="" /><AvatarFallback className="bg-primary/10 text-primary">{initials(name)}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><CardTitle className="truncate text-lg">{name}</CardTitle><CardDescription className="truncate">{gateLabel(match.currentGate)}</CardDescription></div>
          <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">Chapter 3+</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {messagesQuery.isLoading ? (
          <div className="space-y-3 p-4 md:p-6" role="status" aria-live="polite"><span className="sr-only">Loading messages</span><Skeleton className="h-16 w-3/4 rounded-2xl" /><Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" /></div>
        ) : messagesQuery.isError ? (
          <div className="p-4 md:p-6"><ErrorState title="Couldn't load this conversation" error={messagesQuery.error} fallback="We couldn't load your messages. Please try again." onRetry={() => void messagesQuery.refetch()} testId="messages-thread-error" /></div>
        ) : (
          <div ref={scrollRef} className="h-[60vh] min-h-[16rem] max-h-[32rem] space-y-3 overflow-y-auto p-4 md:p-6" role="log" aria-live="polite" aria-label={`Messages with ${name}`}>
            {messagesQuery.data?.length ? messagesQuery.data.map((message) => {
              const own = message.senderId === currentUserId;
              const date = asDate(message.createdAt);
              return (
                <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[75%] ${own ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted"}`}>
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <time dateTime={date?.toISOString()} className={`mt-1.5 block text-[11px] ${own ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                      <span className="sr-only">{own ? "You sent this message" : `${name} sent this message`} </span>{messageTime(message.createdAt)}
                    </time>
                  </div>
                </div>
              );
            }) : (
              <div className="flex h-full min-h-[16rem] flex-col items-center justify-center px-6 text-center"><MessageCircle className="mb-3 h-10 w-10 text-primary" aria-hidden="true" /><h3 className="font-medium">Start your conversation</h3><p className="mt-1 text-sm text-muted-foreground">Say hello and keep writing this chapter together.</p></div>
            )}
          </div>
        )}
        <div className="border-t bg-background p-4">
          {validationError && <p className="mb-2 text-sm text-destructive" role="alert">{validationError}</p>}
          {sendError && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              <span>{unauthorized(sendError) ? "Your session expired. Sign in again to send this message." : errorText(sendError, "We couldn't send your message. Please try again.")} Your draft is still here.</span>
              {unauthorized(sendError) ? <Button type="button" variant="outline" size="sm" onClick={() => { window.location.href = "/api/login"; }}>Sign in again</Button> : <Button type="button" variant="outline" size="sm" onClick={submit} disabled={composerDisabled || !draft.trim()}>Retry</Button>}
            </div>
          )}
          <form onSubmit={submitForm} aria-label={`Send a message to ${name}`}>
            <label htmlFor={`message-draft-${matchId}`} className="sr-only">Message to {name}</label>
            <div className="flex items-end gap-2">
              <Textarea id={`message-draft-${matchId}`} value={draft} onChange={(event) => { updateDraft(matchId, event.target.value); clearSendError(matchId); setValidationError(null); }} placeholder={`Write to ${name}...`} maxLength={MESSAGE_LIMIT} rows={2} disabled={composerDisabled} aria-describedby={`message-help-${matchId}`} data-testid="input-message-draft" className="min-h-[2.75rem] resize-y" />
              <Button type="submit" size="icon" aria-label={pendingMatchId ? "Sending message" : "Send message"} disabled={composerDisabled || !draft.trim()} data-testid="button-send-message">{pendingMatchId ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}</Button>
            </div>
            <div id={`message-help-${matchId}`} className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground"><span>Messages are limited to {MESSAGE_LIMIT} characters.</span><span aria-live="polite">{draft.length}/{MESSAGE_LIMIT}</span></div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Messages() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const pendingMatchIdRef = useRef<string | null>(null);
  const [sendFailure, setSendFailure] = useState<{ matchId: string; error: Error } | null>(null);
  const [lastSent, setLastSent] = useState({ matchId: "", version: 0 });
  const matchesQuery = useQuery<MatchWithProfile[]>({ queryKey: ["/api/matches"], enabled: Boolean(user) });
  const matches = matchesQuery.data ?? [];
  const contactMatches = useMemo(() => matches.filter((match) => match.status !== "declined"), [matches]);
  const unlocked = useMemo(() => contactMatches.filter((match) => CHAT_GATES.has(match.currentGate)), [contactMatches]);
  const locked = useMemo(() => contactMatches.filter((match) => !CHAT_GATES.has(match.currentGate)), [contactMatches]);
  const selected = unlocked.find((match) => match.id === selectedId);

  const updateDraft = (matchId: string, update: DraftUpdate) => setDrafts((current) => {
    const oldValue = current[matchId] ?? "";
    const value = typeof update === "function" ? update(oldValue) : update;
    if (value === oldValue) return current;
    if (!value) {
      const next = { ...current };
      delete next[matchId];
      return next;
    }
    return { ...current, [matchId]: value };
  });
  const clearSendError = (matchId: string) => setSendFailure((current) => current?.matchId === matchId ? null : current);
  const sendMutation = useMutation<Message, Error, SendVariables>({
    mutationFn: async ({ matchId, content }) => {
      const response = await apiRequest("POST", `/api/matches/${matchId}/messages`, { content });
      return (await response.json()) as Message;
    },
    onSuccess: (message, { matchId, content }) => {
      updateDraft(matchId, (current) => current.trim() === content ? "" : current);
      setSendFailure(null);
      queryClient.setQueryData<Message[]>(threadKey(matchId), (current = []) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      void queryClient.invalidateQueries({ queryKey: threadKey(matchId) });
      setLastSent((current) => ({ matchId, version: current.version + 1 }));
    },
    onError: (error, { matchId }) => setSendFailure({ matchId, error }),
    onSettled: (_message, _error, variables) => {
      if (variables && pendingMatchIdRef.current === variables.matchId) {
        pendingMatchIdRef.current = null;
        setPendingMatchId(null);
      }
    },
  });
  const sendMessage = (matchId: string, content: string) => {
    // The ref makes the guard synchronous even across rapid clicks and remounts.
    if (pendingMatchIdRef.current !== null) return false;
    pendingMatchIdRef.current = matchId;
    setPendingMatchId(matchId);
    setSendFailure(null);
    sendMutation.mutate({ matchId, content });
    return true;
  };
  useEffect(() => {
    if (!unlocked.length) return setSelectedId(null);
    if (!selectedId || !unlocked.some((match) => match.id === selectedId)) setSelectedId(unlocked[0].id);
  }, [selectedId, unlocked]);

  if (authLoading) return <AuthState loading />;
  if (!user) return <AuthState />;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6"><h1 className="text-2xl font-bold tracking-tight">Messages</h1><p className="text-muted-foreground">Have thoughtful conversations with your matches.</p></div>
      {matchesQuery.isLoading ? <LoadingList /> : matchesQuery.isError ? (
        <ErrorState title="Couldn't load your conversations" error={matchesQuery.error} fallback="We couldn't load your matches. Please try again." onRetry={() => void matchesQuery.refetch()} testId="messages-list-error" />
      ) : !matches.length ? (
        <Card><CardContent className="flex min-h-[22rem] flex-col items-center justify-center px-6 text-center"><MessageSquare className="mb-5 h-14 w-14 rounded-full bg-primary/10 p-3 text-primary" aria-hidden="true" /><h2 className="text-xl font-semibold">No matches to message yet</h2><p className="mt-2 max-w-md text-muted-foreground">Start with a match, then keep turning pages together. Conversations open at Chapter 3 (Getting Real).</p><Button type="button" className="mt-6" onClick={() => setLocation("/matches")} data-testid="button-view-matches-empty">View Matches</Button></CardContent></Card>
      ) : !contactMatches.length ? (
        <Card><CardContent className="flex min-h-[22rem] flex-col items-center justify-center px-6 text-center"><MessageSquare className="mb-5 h-14 w-14 rounded-full bg-muted p-3 text-muted-foreground" aria-hidden="true" /><h2 className="text-xl font-semibold">No active conversations</h2><p className="mt-2 max-w-md text-muted-foreground">Declined matches are no longer available for contact. View your matches to find an active connection.</p><Button type="button" className="mt-6" onClick={() => setLocation("/matches")} data-testid="button-view-matches-ended">View Matches</Button></CardContent></Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(15rem,20rem)_minmax(0,1fr)]">
          <aside className="space-y-4" aria-label="Message conversations">
            <Card><CardHeader className="p-4 pb-3"><CardTitle className="text-base">Your conversations</CardTitle><CardDescription>{unlocked.length === 1 ? "1 conversation ready" : `${unlocked.length} conversations ready`}</CardDescription></CardHeader><CardContent className="space-y-1 p-2 pt-0">{unlocked.length ? unlocked.map((match) => <MatchRow key={match.id} match={match} selected={match.id === selectedId} onSelect={() => setSelectedId(match.id)} />) : <p className="px-3 pb-3 pt-2 text-sm text-muted-foreground">No conversations are open yet.</p>}</CardContent></Card>
            {locked.length > 0 && <Card><CardHeader className="p-4 pb-3"><div className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><CardTitle className="text-base">Before Chapter 3 (Getting Real)</CardTitle><CardDescription className="mt-1">Chat unlocks at Gate 3. Keep writing your story together to get there.</CardDescription></div></div></CardHeader><CardContent className="space-y-2 p-2 pt-0">{locked.map((match) => <MatchRow key={match.id} match={match} locked />)}<Button type="button" variant="outline" className="mt-1 w-full" onClick={() => setLocation("/matches")} data-testid="button-view-matches-locked">View Matches</Button></CardContent></Card>}
          </aside>
          <section aria-label="Selected conversation">
            {selected ? <ConversationThread key={selected.id} match={selected} currentUserId={user.id} draft={drafts[selected.id] ?? ""} updateDraft={updateDraft} pendingMatchId={pendingMatchId} sendError={sendFailure?.matchId === selected.id ? sendFailure.error : null} sendMessage={sendMessage} clearSendError={clearSendError} lastSent={lastSent} /> : <Card className="flex min-h-[32rem] items-center justify-center"><CardContent className="max-w-md px-6 text-center"><LockKeyhole className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden="true" /><h2 className="text-xl font-semibold">Chat opens at Gate 3</h2><p className="mt-2 text-muted-foreground">Chapter 3 (Getting Real) is where conversations begin. Select a Gate 3+ match when one is ready.</p><Button type="button" variant="outline" className="mt-5" onClick={() => setLocation("/matches")} data-testid="button-view-matches-thread-empty">View Matches</Button></CardContent></Card>}
          </section>
        </div>
      )}
    </div>
  );
}