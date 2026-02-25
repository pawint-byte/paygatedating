import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using PayGate Dating ("the Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service. You must be at least 18 years old 
              to use this Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              PayGate Dating is a free-to-join online dating platform that uses a 5-chapter progression system to facilitate 
              meaningful connections between users. The Service includes profile creation, matching, messaging through 
              chapters, wallet management, and pay-as-you-go chapter fees.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To use certain features of the Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not share your account with others</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Chapter System and Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Our unique 5-chapter system requires incremental payments to advance through interaction stages:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Chapter 1 (The Spark):</strong> $5 - First move</li>
              <li><strong>Chapter 2 (The Curiosity):</strong> $5 - First response</li>
              <li><strong>Chapter 3 (Getting Real):</strong> $10 - Deeper conversation and photos</li>
              <li><strong>Chapter 4 (Face to Face):</strong> $15 - Video calls and shared experiences</li>
              <li><strong>Chapter 5 (Beyond the Screen):</strong> $20 - Exchange contact information</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Payment responsibility alternates between the match initiator and recipient at each chapter. 
              All payments are processed securely through our payment partners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Trial Credits and Referrals</h2>
            <p className="text-muted-foreground leading-relaxed">
              New users receive $15 in trial credits upon registration. You may earn $5 in credits for each 
              successful referral when the referred user completes their profile. Trial credits and referral 
              bonuses are non-transferable and may expire. We reserve the right to modify or discontinue 
              promotional offers at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Pay-As-You-Go Model</h2>
            <p className="text-muted-foreground leading-relaxed">
              PayGate Dating operates on a pay-as-you-go model with no subscriptions or recurring charges. 
              Users pay chapter fees only when they choose to advance a connection. Chapter fees are non-refundable 
              once a chapter has been unlocked. Gift purchases include a service fee (10% of gift value or $5 minimum, 
              whichever is greater). All payments are processed securely through our payment partners.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Use the Service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Impersonate any person or entity</li>
              <li>Upload malicious software or content</li>
              <li>Spam or solicit other users for commercial purposes</li>
              <li>Attempt to circumvent the gate payment system</li>
              <li>Create multiple accounts to abuse promotions</li>
              <li>Share explicit or inappropriate content without consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Content Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of content you upload. By posting content, you grant us a non-exclusive, 
              worldwide license to use, display, and distribute your content in connection with the Service. 
              You are responsible for ensuring you have the right to share any content you upload.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Safety and Reporting</h2>
            <p className="text-muted-foreground leading-relaxed">
              We are committed to user safety. If you encounter inappropriate behavior, please use our reporting 
              features. We reserve the right to investigate reports and take action, including account suspension 
              or termination, at our discretion. Always exercise caution when meeting people from online platforms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account at any time for violations of these terms or for any 
              reason at our discretion. You may delete your account at any time through your account settings. 
              Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We do not guarantee successful 
              matches or relationships. We are not responsible for the conduct of users on or off the platform. 
              Use the Service at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, PayGate Dating shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes via email 
              or through the Service. Your continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact us at support@paygate-dating.com.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/privacy">
            <Button variant="outline" data-testid="link-privacy-policy">
              View Privacy Policy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
