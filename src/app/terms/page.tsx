import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | FiscalNinja',
  description:
    'Terms of Service for FiscalNinja — AI-powered expense management for trucking companies.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Fiscal<span className="text-blue-600">Ninja</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective Date: March 1, 2026
        </p>

        <div className="prose prose-gray max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-li:leading-relaxed">
          {/* 1 */}
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using FiscalNinja (&quot;Service&quot;), available at{' '}
            <a href="https://fiscalninja.co" className="text-blue-600 hover:underline">
              fiscalninja.co
            </a>
            , you agree to be bound by these Terms of Service (&quot;Terms&quot;).
            If you do not agree to all of these Terms, you may not access or use
            the Service. These Terms constitute a legally binding agreement
            between you (&quot;User,&quot; &quot;you&quot;) and FiscalNinja
            (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;).
          </p>

          {/* 2 */}
          <h2>2. Description of Service</h2>
          <p>
            FiscalNinja is an AI-powered expense management platform designed
            for trucking companies. The Service allows users to upload receipt
            images, automatically extract expense data using artificial
            intelligence (Google Gemini OCR), manage trucks and drivers, track
            expenses by category, generate reports, and export data for tax
            filing purposes.
          </p>

          {/* 3 */}
          <h2>3. Account Registration &amp; Security</h2>
          <p>
            To use the Service, you must create an account by providing a valid
            email address and company name. You are responsible for:
          </p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials.</li>
            <li>
              All activities that occur under your account, including actions
              taken by team members you invite.
            </li>
            <li>
              Providing accurate and complete information during registration.
            </li>
            <li>
              Notifying us immediately at{' '}
              <a href="mailto:support@fiscalninja.co" className="text-blue-600 hover:underline">
                support@fiscalninja.co
              </a>{' '}
              if you suspect unauthorized use of your account.
            </li>
          </ul>
          <p>
            We reserve the right to suspend or terminate accounts that violate
            these Terms or that we reasonably believe have been compromised.
          </p>

          {/* 4 */}
          <h2>4. Free Trial &amp; Subscription Terms</h2>
          <h3 className="text-lg font-medium mt-6 mb-3">4.1 Free Trial</h3>
          <p>
            All new accounts are eligible for a 14-day free trial. The trial
            provides full access to the features of your selected plan. A valid
            payment method is required to start the trial. You will not be
            charged during the trial period unless you explicitly upgrade.
          </p>
          <h3 className="text-lg font-medium mt-6 mb-3">4.2 Subscription Plans</h3>
          <p>We offer three subscription tiers:</p>
          <ul>
            <li>
              <strong>Solo</strong> — $29/month (up to 5 trucks, 5 drivers, 200
              receipts/month)
            </li>
            <li>
              <strong>Fleet</strong> — $79/month (up to 25 trucks, 25 drivers,
              1,000 receipts/month)
            </li>
            <li>
              <strong>Enterprise</strong> — $149/month (up to 100 trucks, 100
              drivers, unlimited receipts)
            </li>
          </ul>
          <h3 className="text-lg font-medium mt-6 mb-3">4.3 Billing</h3>
          <p>
            Subscriptions are billed monthly through Stripe. By subscribing, you
            authorize us to charge your payment method on a recurring basis.
            Prices are in US dollars and do not include applicable taxes.
          </p>
          <h3 className="text-lg font-medium mt-6 mb-3">4.4 Refund Policy</h3>
          <p>
            Monthly subscriptions are non-refundable. If you cancel, your
            subscription remains active until the end of the current billing
            period. We do not provide partial refunds for unused time on monthly
            plans.
          </p>

          {/* 5 */}
          <h2>5. Acceptable Use Policy</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable laws or regulations.
            </li>
            <li>
              Upload content that is fraudulent, misleading, defamatory, or
              infringes on third-party rights.
            </li>
            <li>
              Attempt to gain unauthorized access to the Service, other user
              accounts, or our systems.
            </li>
            <li>
              Reverse-engineer, decompile, or disassemble any part of the
              Service.
            </li>
            <li>
              Use the Service to transmit malware, viruses, or other harmful
              code.
            </li>
            <li>
              Resell, redistribute, or sublicense the Service without our
              written consent.
            </li>
          </ul>

          {/* 6 */}
          <h2>6. Data &amp; Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            , which describes how we collect, use, and protect your data. By
            using the Service, you consent to our data practices as described in
            the Privacy Policy.
          </p>
          <p>
            You retain ownership of all data you upload to the Service. We do
            not sell your data to third parties. We use your data solely to
            provide and improve the Service.
          </p>

          {/* 7 */}
          <h2>7. AI Processing Disclaimer</h2>
          <p>
            FiscalNinja uses artificial intelligence (Google Gemini) to extract
            data from receipt images. While we strive for high accuracy, AI
            processing is inherently imperfect and may produce errors.
          </p>
          <p>
            <strong>
              You are solely responsible for reviewing and verifying all
              AI-extracted data before using it for accounting, tax filing, or
              any other purpose.
            </strong>{' '}
            FiscalNinja does not guarantee the accuracy, completeness, or
            reliability of any AI-generated output and shall not be held liable
            for errors resulting from AI processing.
          </p>

          {/* 8 */}
          <h2>8. Intellectual Property</h2>
          <p>
            The Service, including its design, logos, features, code, and
            documentation, is the intellectual property of FiscalNinja and is
            protected by copyright and trademark laws. You are granted a limited,
            non-exclusive, non-transferable license to use the Service for its
            intended purpose during your active subscription.
          </p>
          <p>
            You retain all ownership rights to the content you upload. By
            uploading content, you grant us a limited license to process and
            store it as necessary to provide the Service.
          </p>

          {/* 9 */}
          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, FiscalNinja and its
            officers, directors, employees, and agents shall not be liable for
            any indirect, incidental, special, consequential, or punitive
            damages, including but not limited to loss of profits, data, or
            business opportunities, arising out of or related to your use of the
            Service.
          </p>
          <p>
            Our total aggregate liability for any claim arising from or related
            to these Terms or the Service shall not exceed the total amount you
            paid to us in the twelve (12) months preceding the claim.
          </p>

          {/* 10 */}
          <h2>10. Termination</h2>
          <p>
            You may cancel your subscription at any time through your account
            settings or by contacting us at{' '}
            <a href="mailto:support@fiscalninja.co" className="text-blue-600 hover:underline">
              support@fiscalninja.co
            </a>
            . Upon cancellation, your subscription remains active until the end
            of the current billing period, after which your access to premium
            features will be revoked.
          </p>
          <p>
            We may suspend or terminate your account immediately if you violate
            these Terms, engage in fraudulent activity, or if required by law.
            Upon termination, we will retain your data for 30 days to allow for
            export, after which it may be permanently deleted.
          </p>

          {/* 11 */}
          <h2>11. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. If we make
            material changes, we will notify you via email or by posting a
            notice on the Service at least 30 days before the changes take
            effect. Your continued use of the Service after the effective date
            constitutes acceptance of the updated Terms.
          </p>

          {/* 12 */}
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the
            laws of the State of Florida, United States, without regard to its
            conflict of law provisions. Any disputes arising under these Terms
            shall be resolved in the state or federal courts located in Florida.
          </p>

          {/* 13 */}
          <h2>13. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a href="mailto:support@fiscalninja.co" className="text-blue-600 hover:underline">
              support@fiscalninja.co
            </a>
          </p>
          <p>
            <strong>Website:</strong>{' '}
            <a href="https://fiscalninja.co" className="text-blue-600 hover:underline">
              fiscalninja.co
            </a>
          </p>
        </div>

        {/* Bottom nav */}
        <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            &larr; Back to Home
          </Link>
          <Link href="/privacy" className="hover:text-gray-900 transition-colors">
            Privacy Policy &rarr;
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} FiscalNinja. All rights reserved.
      </footer>
    </div>
  );
}
