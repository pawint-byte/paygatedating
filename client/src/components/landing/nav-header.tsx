import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border" data-testid="nav-header">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center">
          <img src="/paygate-logo.png" alt="PayGate Dating" className="h-10 w-auto" data-testid="img-logo" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-how-it-works"
          >
            How It Works
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-pricing"
          >
            Pricing
          </Link>
          <Link
            href="/stories"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            data-testid="link-stories"
          >
            Stories
          </Link>
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
