import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Gate = "serious_romance" | "activity_partner";
type SetupDraft = {
  firstName: string;
  gate: Gate;
  wants: string;
  willNot: string;
  photo: string | null;
  bio: string;
  revision: number;
};
type SetupState = {
  accepted: boolean;
  gate: Gate | null;
  draft: SetupDraft | null;
};
type DraftInput = Pick<SetupDraft, "firstName" | "gate" | "wants" | "willNot" | "photo">;

const initialForm: DraftInput = {
  firstName: "",
  gate: "serious_romance",
  wants: "",
  willNot: "",
  photo: null,
};

function SetupLoading() {
  return (
    <div className="min-h-[100dvh] bg-background px-5 py-10">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="mb-12 h-4 w-28 rounded bg-muted" />
        <div className="grid gap-10 md:grid-cols-[1fr_0.8fr]">
          <div className="space-y-6">
            <div className="h-12 w-3/4 rounded bg-muted" />
            <div className="h-5 w-full rounded bg-muted" />
            <div className="h-14 rounded-xl bg-muted" />
            <div className="h-32 rounded-xl bg-muted" />
            <div className="h-14 rounded-xl bg-muted" />
          </div>
          <div className="h-96 rounded-3xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function MemberSetup() {
  const { user } = useAuth();
  const setupKey = ["/api/setup", user?.id];
  const [, setLocation] = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<DraftInput>(initialForm);
  const [mode, setMode] = useState<"form" | "preview" | null>(null);
  const [formError, setFormError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const { data: setup, isLoading, isError, refetch } = useQuery<SetupState>({
    queryKey: setupKey,
    queryFn: async () => (await apiRequest("GET", "/api/setup")).json(),
  });

  const saveDraft = useMutation({
    mutationFn: async (input: DraftInput) => {
      const response = await apiRequest("PUT", "/api/setup/draft", input);
      return (await response.json()) as SetupDraft;
    },
    onSuccess: (draft) => {
      queryClient.setQueryData<SetupState>(setupKey, (previous) => ({
        accepted: previous?.accepted ?? false,
        gate: previous?.gate ?? null,
        draft,
      }));
      setMode("preview");
      setFormError("");
    },
    onError: (error: Error) => setFormError(error.message || "Your draft could not be saved. Please try again."),
  });

  const acceptDraft = useMutation({
    mutationFn: async (revision: number) => {
      const response = await apiRequest("POST", "/api/setup/accept", {
        revision, referralCode: localStorage.getItem("referralCode") || undefined,
      });
      return (await response.json()) as { profile: unknown; gate: Gate; destination: string };
    },
    onSuccess: (result) => {
      localStorage.removeItem("referralCode");
      queryClient.setQueryData<SetupState>(setupKey, { accepted: true, gate: result.gate, draft: null });
      queryClient.invalidateQueries({ queryKey: ["/api/setup"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setLocation(result.destination);
    },
    onError: (error: Error) => setFormError(error.message || "This draft could not be accepted. Please try again."),
  });

  const clearDraft = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/setup/draft");
    },
    onSuccess: () => {
      queryClient.setQueryData<SetupState>(setupKey, { accepted: false, gate: null, draft: null });
      setForm({ ...initialForm });
      setMode("form");
      setFormError("");
      if (fileInput.current) fileInput.current.value = "";
    },
    onError: (error: Error) => setFormError(error.message || "The draft could not be cleared. Please try again."),
  });

  const draft = setup?.draft;
  const update = <K extends keyof DraftInput>(key: K, value: DraftInput[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFormError("");
  };

  const choosePhoto = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError("Your photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    setPhotoLoading(true);
    reader.onload = () => {
      update("photo", typeof reader.result === "string" ? reader.result : null);
      setPhotoLoading(false);
    };
    reader.onerror = () => {
      setFormError("That photo could not be read. Try another file.");
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.firstName.trim() || !form.wants.trim() || !form.willNot.trim()) {
      setFormError("Add your name and both short notes to continue.");
      return;
    }
    saveDraft.mutate({
      firstName: form.firstName.trim(),
      gate: form.gate,
      wants: form.wants.trim(),
      willNot: form.willNot.trim(),
      photo: form.photo,
    });
  };

  if (isLoading) return <SetupLoading />;
  if (isError || !setup) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">PayGate Dating</p>
          <h1 className="mt-4 font-serif text-3xl">Your setup is waiting</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">We couldn’t load your saved setup. Retry before continuing; nothing has been changed.</p>
          <Button className="mt-6 w-full" onClick={() => refetch()}>Try again</Button>
        </section>
      </main>
    );
  }

  const isPreview = (mode ?? (draft ? "preview" : "form")) === "preview" && !!draft;
  const previewDraft = isPreview ? draft : null;
  const displayedPhoto = previewDraft ? previewDraft.photo : form.photo;
  const displayedName = previewDraft?.firstName ?? form.firstName;
  const displayedGate = previewDraft?.gate ?? form.gate;
  const displayedWants = previewDraft?.wants ?? form.wants;
  const displayedBoundary = previewDraft?.willNot ?? form.willNot;

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 md:py-10">
        <div className="flex items-center justify-between border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <span className="font-serif text-xl">P</span>
            </div>
            <span className="text-sm font-semibold tracking-wide">PayGate <span className="font-normal text-muted-foreground">Dating</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Your choice, always
          </div>
        </div>

        <div className="grid items-start gap-12 py-10 md:grid-cols-[1.08fr_0.92fr] md:gap-16 md:py-16">
          <section className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">A deliberate beginning</p>
            <h1 className="mt-4 max-w-lg font-serif text-4xl leading-[1.08] tracking-tight sm:text-5xl">
              Start with what feels right to you.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Choose the kind of connection you’re open to. Your draft stays private until you decide to accept it.
            </p>

            {isPreview && draft ? (
              <div className="mt-9 space-y-6">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Check className="h-4 w-4" /> Draft saved
                </div>
                <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-sm">
                  <div className="relative flex min-h-60 items-end bg-muted">
                    {draft.photo ? (
                      <img src={draft.photo} alt={`${draft.firstName}'s draft profile`} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_70%_15%,hsl(var(--primary)/.22),transparent_45%),linear-gradient(140deg,hsl(var(--muted)),hsl(var(--accent)))]">
                        <span className="font-serif text-8xl text-primary/40">{draft.firstName.slice(0, 1).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/5 to-transparent" />
                    <div className="relative z-10 p-6 text-background">
                      <span className="inline-flex rounded-full border border-background/40 bg-background/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] backdrop-blur">
                        {draft.gate === "serious_romance" ? "Serious Romance" : "Activity Partner"}
                      </span>
                      <h2 className="mt-3 font-serif text-3xl">{draft.firstName}</h2>
                    </div>
                  </div>
                  <div className="space-y-4 p-6">
                    <p className="text-sm leading-7 text-foreground/85">{draft.bio}</p>
                    <div className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Looking for</p>
                        <p className="mt-1 leading-6">{draft.wants}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">A boundary</p>
                        <p className="mt-1 leading-6">{draft.willNot}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm font-medium leading-6 text-primary">Only you can see this until you accept. Nothing messages anyone for you.</p>
                {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                <div className="flex flex-col gap-3 sm:flex-row">
                   <Button className="flex-1" onClick={() => acceptDraft.mutate(draft.revision)} disabled={acceptDraft.isPending || clearDraft.isPending}>
                    {acceptDraft.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Accepting…</> : <>Accept <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                   <Button variant="outline" className="flex-1" disabled={acceptDraft.isPending || clearDraft.isPending} onClick={() => {
                    setForm({ firstName: draft.firstName, gate: draft.gate, wants: draft.wants, willNot: draft.willNot, photo: draft.photo });
                    setMode("form");
                    setFormError("");
                  }}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit
                  </Button>
                   <Button variant="ghost" className="flex-1" onClick={() => clearDraft.mutate()} disabled={clearDraft.isPending || acceptDraft.isPending}>
                    <RotateCcw className="mr-2 h-4 w-4" /> Start over
                  </Button>
                </div>
                {clearDraft.isPending && <p className="text-xs text-muted-foreground">Clearing your saved draft…</p>}
              </div>
            ) : (
              <form className="mt-9 space-y-6" onSubmit={submitDraft}>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" autoComplete="given-name" maxLength={60} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} placeholder="First name" required />
                  <p className="text-right text-xs text-muted-foreground">{form.firstName.length}/60</p>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Which gate</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      ["serious_romance", "Serious Romance", "Looking for a meaningful relationship."],
                      ["activity_partner", "Activity Partner", "Meet someone for shared plans and interests."],
                    ] as const).map(([value, title, caption]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={form.gate === value}
                        onClick={() => update("gate", value)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${form.gate === value ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}
                      >
                        <span className="block text-sm font-semibold">{title}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{caption}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="space-y-2">
                  <Label htmlFor="wants">What you want</Label>
                  <Textarea id="wants" maxLength={240} value={form.wants} onChange={(event) => update("wants", event.target.value)} placeholder="A few words about what you’d welcome…" className="min-h-24 resize-y" required />
                  <p className="text-right text-xs text-muted-foreground">{form.wants.length}/240</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="willNot">What you will not do</Label>
                  <Textarea id="willNot" maxLength={240} value={form.willNot} onChange={(event) => update("willNot", event.target.value)} placeholder="A boundary that matters to you…" className="min-h-24 resize-y" required />
                  <p className="text-right text-xs text-muted-foreground">{form.willNot.length}/240</p>
                </div>

                <div className="space-y-2">
                  <Label>One photo <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose one profile photo" onChange={(event) => choosePhoto(event.target.files?.[0])} />
                    <Button type="button" variant="outline" disabled={photoLoading} onClick={() => fileInput.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" /> {form.photo ? "Change photo" : "Choose photo"}
                    </Button>
                    {form.photo && <Button type="button" variant="ghost" disabled={photoLoading} onClick={() => update("photo", null)}>Remove photo</Button>}
                    <span className="text-xs text-muted-foreground">JPEG, PNG or WebP · up to 2 MB</span>
                  </div>
                  {displayedPhoto && (
                    <div className="mt-3 h-32 w-28 overflow-hidden rounded-xl border border-border">
                      <img src={displayedPhoto} alt="Selected profile photo preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>

                {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={saveDraft.isPending || photoLoading}>
                  {saveDraft.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving your draft…</> : <>Make my draft <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            )}
          </section>

          <aside className="relative hidden md:block">
            <div className="absolute -right-4 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-border bg-card p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your first impression</span>
                <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">Private draft</span>
              </div>
              <div className="mt-7 overflow-hidden rounded-2xl border border-border">
                <div className="relative grid min-h-72 place-items-center bg-[radial-gradient(ellipse_at_70%_15%,hsl(var(--primary)/.2),transparent_45%),linear-gradient(140deg,hsl(var(--muted)),hsl(var(--accent)))]">
                  {displayedPhoto ? <img src={displayedPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="font-serif text-8xl text-primary/30">{displayedName ? displayedName.slice(0, 1).toUpperCase() : "P"}</div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent px-5 pb-5 pt-16 text-background">
                    <span className="text-[10px] uppercase tracking-[0.16em]">{displayedGate === "serious_romance" ? "Serious Romance" : "Activity Partner"}</span>
                    <p className="mt-1 font-serif text-3xl">{displayedName || "Your name"}</p>
                  </div>
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">A note from you</p>
                  <p className="text-sm leading-6">{displayedWants || "Your draft will reflect what you’re looking for."}</p>
                  {displayedBoundary && <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">{displayedBoundary}</p>}
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                You choose when your profile is accepted. No one is contacted for you.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
