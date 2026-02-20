import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Heart } from "lucide-react";

export function NavHeader() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" data-testid="nav-header">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-xl tracking-tight">PayGate</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => scrollToSection("how-it-works")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-how-it-works"
          >
            How It Works
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-pricing"
          >
            Pricing
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-testimonials"
          >
            Success Stories
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/api/login">
            <Button variant="ghost" data-testid="button-login">
              Log In
            </Button>
          </a>
          <a href="/api/login">
            <Button data-testid="button-get-started">Get Started</Button>
          </a>
        </div>
      </div>
    </header>
  );
}
