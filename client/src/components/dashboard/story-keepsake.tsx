import { useQuery } from "@tanstack/react-query";
import { BookOpen, Heart, Sparkles, Clock, Copy, Check, Send, Search, MessageSquare, Handshake, Star } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface StoryChapter {
  number: number;
  name: string;
  ledBy: string | null;
  ledByName: string | null;
  paidAt: string | null;
  cost: number;
}

interface StoryData {
  matchId: string;
  matchDate: string;
  completedDate: string;
  journeyDays: number;
  initiator: {
    id: string;
    displayName: string;
    photo: string | null;
  };
  recipient: {
    id: string;
    displayName: string;
    photo: string | null;
  };
  chapters: StoryChapter[];
}

interface StoryKeepsakeProps {
  matchId: string;
  currentUserId: string;
}

const chapterIcons = [Send, Search, MessageSquare, Handshake, Star];

export function StoryKeepsake({ matchId, currentUserId }: StoryKeepsakeProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: story, isLoading } = useQuery<StoryData>({
    queryKey: [`/api/matches/${matchId}/story`],
    enabled: !!matchId,
  });

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse" data-testid="story-keepsake-loading">
        <div className="h-8 bg-muted rounded w-48 mx-auto mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!story) return null;

  const isInitiator = currentUserId === story.initiator.id;
  const me = isInitiator ? story.initiator : story.recipient;
  const them = isInitiator ? story.recipient : story.initiator;

  const myChaptersLed = story.chapters.filter((c) => c.ledBy === currentUserId).length;
  const theirChaptersLed = story.chapters.filter((c) => c.ledBy && c.ledBy !== currentUserId).length;

  const matchDate = new Date(story.matchDate);
  const formattedDate = matchDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleCopy = async () => {
    const text = `Our Story — ${me.displayName} & ${them.displayName}\n` +
      `Started: ${formattedDate}\n` +
      `Journey: ${story.journeyDays} day${story.journeyDays !== 1 ? "s" : ""}\n\n` +
      story.chapters.map((c) =>
        `Chapter ${c.number}: ${c.name} -- Led by ${c.ledByName || "..."}`
      ).join("\n") +
      `\n\nWritten on PayGate Dating`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Story copied!", description: "Share your story with the world." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Try again.", variant: "destructive" });
    }
  };

  return (
    <Card
      className="overflow-hidden"
      data-testid="story-keepsake"
    >
      <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/20 p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-serif font-semibold text-foreground" data-testid="text-story-title">
              Your Story Together
            </h3>
            <BookOpen className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-sm text-muted-foreground font-serif italic">
            A {story.journeyDays}-day journey, five chapters
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="text-center">
            <Avatar className="w-14 h-14 mx-auto mb-1 ring-2 ring-rose-200 dark:ring-rose-800">
              <AvatarImage src={me.photo || undefined} alt={me.displayName} />
              <AvatarFallback className="bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 font-semibold">
                {me.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground" data-testid="text-story-me">{me.displayName}</p>
            <p className="text-[10px] text-muted-foreground">Led {myChaptersLed} chapter{myChaptersLed !== 1 ? "s" : ""}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
            <span className="text-[10px] text-muted-foreground">{formattedDate}</span>
          </div>

          <div className="text-center">
            <Avatar className="w-14 h-14 mx-auto mb-1 ring-2 ring-amber-200 dark:ring-amber-800">
              <AvatarImage src={them.photo || undefined} alt={them.displayName} />
              <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold">
                {them.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground" data-testid="text-story-them">{them.displayName}</p>
            <p className="text-[10px] text-muted-foreground">Led {theirChaptersLed} chapter{theirChaptersLed !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="space-y-2">
          {story.chapters.map((chapter, idx) => {
            const isLedByMe = chapter.ledBy === currentUserId;
            const chapterDate = chapter.paidAt
              ? new Date(chapter.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : null;

            let durationLabel = "";
            if (idx > 0 && chapter.paidAt && story.chapters[idx - 1].paidAt) {
              const prev = new Date(story.chapters[idx - 1].paidAt!).getTime();
              const curr = new Date(chapter.paidAt).getTime();
              const diffDays = Math.ceil((curr - prev) / (1000 * 60 * 60 * 24));
              if (diffDays <= 0) durationLabel = "Same day";
              else if (diffDays === 1) durationLabel = "1 day";
              else durationLabel = `${diffDays} days`;
            }

            return (
              <div
                key={chapter.number}
                className={`flex items-center gap-3 rounded-lg p-3 transition-colors ${
                  chapter.ledBy
                    ? isLedByMe
                      ? "bg-rose-100/60 dark:bg-rose-900/20 border border-rose-200/50 dark:border-rose-800/30"
                      : "bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30"
                    : "bg-muted/40 border border-border/50"
                }`}
                data-testid={`story-chapter-${chapter.number}`}
              >
                {(() => { const ChIcon = chapterIcons[idx]; return <ChIcon className="w-5 h-5 text-muted-foreground shrink-0" />; })()}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Chapter {chapter.number}: {chapter.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {chapter.ledByName && (
                      <span>Led by {isLedByMe ? "you" : chapter.ledByName}</span>
                    )}
                    {chapterDate && (
                      <>
                        <span>·</span>
                        <span>{chapterDate}</span>
                      </>
                    )}
                    {durationLabel && (
                      <>
                        <span>·</span>
                        <Clock className="w-3 h-3 inline" />
                        <span>{durationLabel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-rose-200/40 dark:border-rose-800/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-serif italic">
                {story.journeyDays === 1
                  ? "A story written in a single day"
                  : `${story.journeyDays} days of showing up`}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-copy-story"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Story
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
