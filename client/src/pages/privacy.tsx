import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-8" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2026</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              PayGate Dating ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our dating 
              platform and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Account Information:</strong> Name, email address, date of birth, gender, and profile photos</li>
              <li><strong>Profile Details:</strong> Bio, interests, preferences, location, and relationship goals</li>
              <li><strong>Communications:</strong> Messages exchanged with other users through our gate system</li>
              <li><strong>Payment Information:</strong> Billing details processed by our secure payment partners</li>
              <li><strong>Items of Interest:</strong> Wishlist items and gift preferences you choose to share</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Device Information:</strong> Device type, operating system, browser type</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform</li>
              <li><strong>Location Data:</strong> General location based on IP address or with your permission</li>
              <li><strong>Cookies:</strong> Session and preference cookies for functionality and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li>Provide and improve our dating services</li>
              <li>Create and manage your account</li>
              <li>Match you with compatible users based on preferences</li>
              <li>Process payments and manage your wallet</li>
              <li>Send service-related communications and updates</li>
              <li>Ensure platform safety and prevent fraud</li>
              <li>Analyze usage patterns to improve features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>With Other Users:</strong> Profile information is visible to potential matches as part of the service</li>
              <li><strong>Service Providers:</strong> Third parties who help us operate the platform (payment processors, hosting)</li>
              <li><strong>Affiliate Partners:</strong> When you use gift purchasing features through Amazon, Net-a-Porter, or MR PORTER</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We do not sell your personal information to third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mt-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure payment processing through certified partners</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls limiting employee access to personal data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              However, no method of transmission over the internet is 100% secure. We cannot guarantee 
              absolute security of your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Restrict Processing:</strong> Limit how we use your data in certain circumstances</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              To exercise these rights, please contact us at privacy@paygate-dating.com or use the settings 
              in your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide services. 
              After account deletion, we may retain certain information for legal, safety, or business purposes 
              for up to 3 years. Anonymized data may be retained indefinitely for analytics.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use cookies and similar technologies for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
              <li><strong>Essential Cookies:</strong> Required for platform functionality and security</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              <li><strong>Analytics Cookies:</strong> Understand how users interact with our service</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You can manage cookie preferences through your browser settings. Disabling certain cookies 
              may affect platform functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              PayGate Dating is intended for users 18 years and older. We do not knowingly collect information 
              from children under 18. If we discover we have collected information from a minor, we will 
              delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for international transfers in compliance 
              with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Third-Party Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our platform may contain links to third-party websites (such as Amazon, Net-a-Porter, and MR PORTER for gift purchasing). 
              We are not responsible for the privacy practices of these external sites. We encourage you to 
              review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant changes 
              via email or through the platform. The "Last updated" date indicates when changes were made. 
              Your continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none text-muted-foreground space-y-2 mt-4">
              <li>Email: privacy@paygate-dating.com</li>
              <li>Support: support@paygate-dating.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <Link href="/terms">
            <Button variant="outline" data-testid="link-terms-of-service">
              View Terms of Service
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
