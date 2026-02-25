import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Messages() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Messages Coming Soon</h2>
        <p className="text-muted-foreground mb-6">
          Once you reach Chapter 3 (Getting Real) with a match, you'll be able
          to chat with them here. Start by sending interest requests and writing
          your first chapters together!
        </p>
        <Button onClick={() => setLocation("/matches")} data-testid="button-view-matches">
          View My Matches
        </Button>
      </div>
    </div>
  );
}
