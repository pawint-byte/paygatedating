import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border" data-testid="nav-header">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2.5 md:py-4 flex items-center justify-between gap-2 md:gap-4">
        <Link href="/" className="flex min-w-0 items-center">
          <img src="/paygate-logo.png" alt="PayGate Dating" className="h-8 w-auto max-w-[112px] object-contain sm:h-10 sm:max-w-none" data-testid="img-logo" />
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

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <ThemeToggle />
          <a href="/api/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" data-testid="button-login">
              Log In
            </Button>
          </a>
          <a href="/api/login">
            <Button size="sm" data-testid="button-get-started">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
