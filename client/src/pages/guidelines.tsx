import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/footer";
import { Seo } from "@/components/seo";

const guidelines = [
  ["Be honest", "Use current, accurate profile information. State the intent of your knock clearly and do not misrepresent who you are or what you want."],
  ["Respect the door", "A member may decline a knock, pause a story, or stop communicating. Do not pressure them to open, pay, share contact details, or continue."],
  ["Communicate with consent", "No harassment, threats, hate, unwanted sexual content, spam, impersonation, or attempts to move someone off-platform against their wishes."],
  ["Protect personal information", "Never exchange street addresses, passwords, banking information, or government identification in chat. Do not publish another person's private information."],
  ["Use payments and gifts correctly", "Chapter fees unlock product access; they do not buy affection or guarantee a response. Retailers fulfill gift products and shipping. PayGate's gift service fee is separate."],
  ["Report harmful behavior", "Use report or ghost controls when available and contact support for site abuse. Accounts may be limited or removed for violating these guidelines or the Terms of Service."],
];

export default function Guidelines() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Community Guidelines | PayGate Dating"
        description="The conduct expected from every PayGate Dating community member."
        canonicalPath="/guidelines"
      />
      <main className="container mx-auto max-w-4xl px-6 py-12 flex-1">
        <Link href="/">
          <Button variant="ghost" className="mb-8" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <p className="text-primary font-medium uppercase tracking-wide text-sm mb-3">Respect at every chapter</p>
        <h1 className="text-4xl font-bold font-serif mb-4">Community Guidelines</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Knock, state your intent, and wait for the other person to open the door. Access to PayGate never creates an obligation to another member.
        </p>
        <div className="space-y-5">
          {guidelines.map(([title, text], index) => (
            <section key={title} className="rounded-lg border bg-card p-6 flex gap-5">
              <span className="text-primary font-bold text-xl" aria-hidden="true">{index + 1}</span>
              <div>
                <h2 className="text-xl font-semibold mb-2">{title}</h2>
                <p className="text-muted-foreground leading-relaxed">{text}</p>
              </div>
            </section>
          ))}
        </div>
        <p className="mt-10 text-muted-foreground">
          These guidelines supplement the <Link href="/terms" className="text-primary underline">Terms of Service</Link>.
        </p>
      </main>
      <Footer />
    </div>
  );
}