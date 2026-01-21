import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Sparkles, CheckCircle, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProfileCompleteness {
  score: number;
  suggestions: string[];
  hasProfile: boolean;
  hasDisplayName: boolean;
  hasBio: boolean;
  hasPhotos: boolean;
  hasInterests: boolean;
  hasLocation: boolean;
  hasLookingFor: boolean;
  hasWishlistItems: boolean;
}

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: completeness } = useQuery<ProfileCompleteness>({
    queryKey: ["/api/profile/completeness"],
    enabled: isOpen,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0 && completeness) {
      const welcomeMessage = completeness.score < 50
        ? `Hi there! I'm your dating coach. I noticed your profile is ${completeness.score}% complete. Would you like some tips to make it more attractive to potential matches?`
        : completeness.score < 80
        ? `Welcome back! Your profile is looking good at ${completeness.score}% complete. I can help you add the finishing touches or give you some matching tips!`
        : `Great job on your profile! It's ${completeness.score}% complete. How can I help you today - matching tips, conversation starters, or understanding the gate system?`;
      
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [isOpen, completeness, messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble responding right now. Please try again!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "How do I write a great bio?",
    "Explain the gate system",
    "Tips for my first message",
    "What should I add to my wishlist?",
  ];

  return (
    <>
      <Button
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 z-[9999] rounded-full shadow-lg h-12 w-12",
          isOpen && "invisible"
        )}
        onClick={() => setIsOpen(true)}
        data-testid="button-open-assistant"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[600px] flex flex-col shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">Dating Coach</CardTitle>
                {completeness && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Progress value={completeness.score} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground">{completeness.score}%</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          {completeness && completeness.suggestions.length > 0 && (
            <div className="px-4 py-2 bg-muted/50 border-b">
              <p className="text-xs font-medium mb-1.5 text-muted-foreground">Profile checklist:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  { key: "hasPhotos", label: "Photos", done: completeness.hasPhotos },
                  { key: "hasBio", label: "Bio", done: completeness.hasBio },
                  { key: "hasInterests", label: "Interests", done: completeness.hasInterests },
                  { key: "hasLookingFor", label: "Looking For", done: completeness.hasLookingFor },
                ].map((item) => (
                  <Badge
                    key={item.key}
                    variant={item.done ? "default" : "secondary"}
                    className="text-xs gap-1"
                  >
                    {item.done ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                    {item.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                      data-testid={`message-${msg.role}-${idx}`}
                    >
                      {msg.content || (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-1">
                  {quickQuestions.map((q, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => sendMessage(), 100);
                      }}
                      data-testid={`button-quick-question-${idx}`}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 border-t flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                data-testid="button-send-message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
