import { Heart } from "lucide-react";
import { Link } from "wouter";
import { SocialShare } from "@/components/social-share";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">PayGate</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Meaningful connections worth investing in. Join 10,000+ members
              finding quality matches.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hover:text-foreground transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hover:text-foreground transition-colors"
                >
                  Pricing
                </button>
              </li>
              <li>
                <button
                  onClick={() =>
                    document
                      .getElementById("testimonials")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="hover:text-foreground transition-colors"
                >
                  Success Stories
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Safety Tips
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  Community Guidelines
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-cookies">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} PayGate Dating. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Share:</span>
            <SocialShare />
          </div>
          <p className="text-sm text-muted-foreground">
            Made with <Heart className="w-3 h-3 inline text-primary" /> for
            meaningful connections
          </p>
        </div>
      </div>
    </footer>
  );
}
