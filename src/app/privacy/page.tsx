import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | FiscalNinja',
  description:
    'Privacy Policy for FiscalNinja — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Effective Date: March 1, 2026
        </p>

        <div className="prose prose-gray max-w-none prose-headings:scroll-mt-20 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-10 prose-h2:mb-4 prose-p:leading-relaxed prose-li:leading-relaxed">
          <p>
            FiscalNinja (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;)
            operates the website{' '}
            <a href="https://fiscalninja.co" className="text-blue-600 hover:underline">
              fiscalninja.co
            </a>{' '}
            and the FiscalNinja application (collectively, the
            &quot;Service&quot;). This Privacy Policy explains how we collect,
            use, share, and protect your information when you use our Service.
          </p>

          {/* 1 */}
          <h2>1. Information We Collect</h2>
          <h3 className="text-lg font-medium mt-6 mb-3">
            1.1 Information You Provide
          </h3>
          <ul>
            <li>
              <strong>Account information:</strong> email address, full name,
              company name.
            </li>
            <li>
              <strong>Receipt images:</strong> photos of trucking receipts you
              upload for processing.
            </li>
            <li>
              <strong>Expense data:</strong> vendor names, amounts, dates,
              categories, and notes — either entered manually or extracted by AI.
            </li>
            <li>
              <strong>Fleet data:</strong> truck numbers, license plates, VINs,
              driver names, emails, and phone numbers.
            </li>
            <li>
              <strong>Payment information:</strong> processed securely by Stripe.
              We never store your credit card numbers, CVV, or full card details
              on our servers.
            </li>
          </ul>
          <h3 className="text-lg font-medium mt-6 mb-3">
            1.2 Information Collected Automatically
          </h3>
          <ul>
            <li>
              <strong>Usage data:</strong> pages visited, features used, and
              timestamps.
            </li>
            <li>
              <strong>Device data:</strong> browser type, operating system, and
              screen resolution.
            </li>
            <li>
              <strong>Log data:</strong> IP address, access times, and referring
              URLs.
            </li>
          </ul>

          {/* 2 */}
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, operate, and maintain the Service.</li>
            <li>
              Process receipt images using AI to extract expense data
              automatically.
            </li>
            <li>Generate expense reports and analytics for your account.</li>
            <li>Process subscription payments and manage billing.</li>
            <li>
              Send transactional emails (account confirmations, team invites,
              billing receipts).
            </li>
            <li>Respond to support requests and communicate with you.</li>
            <li>
              Improve the Service, fix bugs, and develop new features.
            </li>
            <li>Detect and prevent fraud or abuse.</li>
          </ul>

          {/* 3 */}
          <h2>3. How We Share Your Information</h2>
          <p>
            We do not sell your personal data. We share information only with the
            following third-party service providers, strictly to operate the
            Service:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database hosting, authentication, and
              file storage.
            </li>
            <li>
              <strong>Stripe</strong> — payment processing and subscription
              management.
            </li>
            <li>
              <strong>Google Gemini API</strong> — AI-powered OCR processing of
              receipt images.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting and serverless
              functions.
            </li>
            <li>
              <strong>Resend</strong> — transactional email delivery (team
              invitations, notifications).
            </li>
          </ul>
          <p>
            Each provider is bound by their own privacy policies and data
            processing agreements. We may also disclose information if required
            by law, court order, or governmental authority.
          </p>

          {/* 4 */}
          <h2>4. Data Storage &amp; Security</h2>
          <p>
            Your data is stored in Supabase-managed PostgreSQL databases and
            object storage. We implement the following security measures:
          </p>
          <ul>
            <li>
              <strong>Encryption at rest:</strong> all data stored in our
              databases and file storage is encrypted.
            </li>
            <li>
              <strong>Encryption in transit:</strong> all data transmitted
              between your browser and our servers uses HTTPS/TLS.
            </li>
            <li>
              <strong>Row-Level Security (RLS):</strong> database policies ensure
              users can only access their own data.
            </li>
            <li>
              <strong>Role-Based Access Control:</strong> team members
              (managers, drivers) have limited permissions based on their role.
            </li>
            <li>
              <strong>Secure authentication:</strong> powered by Supabase Auth
              with email verification.
            </li>
          </ul>
          <p>
            While we take reasonable measures to protect your data, no method of
            electronic transmission or storage is 100% secure. We cannot
            guarantee absolute security.
          </p>

          {/* 5 */}
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>
              <strong>Access:</strong> request a copy of the personal data we
              hold about you.
            </li>
            <li>
              <strong>Export:</strong> download your expense data, receipts, and
              reports at any time through the Service.
            </li>
            <li>
              <strong>Correction:</strong> update or correct inaccurate
              information in your account settings.
            </li>
            <li>
              <strong>Deletion:</strong> request deletion of your account and
              associated data by contacting us at{' '}
              <a
                href="mailto:support@fiscalninja.co"
                className="text-blue-600 hover:underline"
              >
                support@fiscalninja.co
              </a>
              .
            </li>
          </ul>
          <p>
            We will respond to data requests within 30 days. Some data may be
            retained as required by law or for legitimate business purposes.
          </p>

          {/* 6 */}
          <h2>6. Cookies &amp; Tracking</h2>
          <p>
            We use essential cookies to maintain your authentication session and
            ensure the Service functions correctly. We do not use third-party
            advertising cookies or cross-site tracking pixels.
          </p>
          <p>
            You can control cookies through your browser settings, but disabling
            essential cookies may prevent the Service from working properly.
          </p>

          {/* 7 */}
          <h2>7. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for use by individuals under the age of
            18. We do not knowingly collect personal information from children.
            If you believe a child under 18 has provided us with personal
            information, please contact us at{' '}
            <a
              href="mailto:support@fiscalninja.co"
              className="text-blue-600 hover:underline"
            >
              support@fiscalninja.co
            </a>{' '}
            and we will promptly delete the information.
          </p>

          {/* 8 */}
          <h2>8. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. If you
            cancel your account or request deletion:
          </p>
          <ul>
            <li>
              Your data will be permanently deleted within <strong>30 days</strong>{' '}
              of account closure.
            </li>
            <li>
              Backup copies may persist for an additional 30 days before being
              purged.
            </li>
            <li>
              Certain records may be retained as required by law (e.g., billing
              records for tax purposes).
            </li>
          </ul>

          {/* 9 */}
          <h2>9. Third-Party Services</h2>
          <p>
            The Service integrates with the following third-party providers.
            Please review their privacy policies for details on how they handle
            your data:
          </p>
          <ul>
            <li>
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Supabase Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Stripe Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Privacy Policy
              </a>{' '}
              (Gemini API)
            </li>
            <li>
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Vercel Privacy Policy
              </a>
            </li>
            <li>
              <a
                href="https://resend.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Resend Privacy Policy
              </a>
            </li>
          </ul>

          {/* 10 */}
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make
            material changes, we will notify you via email or by posting a
            prominent notice on the Service at least 30 days before the changes
            take effect. Your continued use of the Service after the effective
            date constitutes acceptance of the updated policy.
          </p>

          {/* 11 */}
          <h2>11. Contact</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or
            our data practices, please contact us at:
          </p>
          <p>
            <strong>Email:</strong>{' '}
            <a
              href="mailto:support@fiscalninja.co"
              className="text-blue-600 hover:underline"
            >
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
          <Link href="/terms" className="hover:text-gray-900 transition-colors">
            Terms of Service &rarr;
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
