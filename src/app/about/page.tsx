import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About | FiscalNinja',
  description:
    'About FiscalNinja — AI-powered expense management built for the trucking industry.',
};

export default function AboutPage() {
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

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
          Built for trucking companies
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Expense management,{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            simplified
          </span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          FiscalNinja was built to solve a simple but painful problem: trucking
          companies drowning in paper receipts, spreadsheets, and manual data
          entry. We believe fleet operators deserve better tools.
        </p>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid sm:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Our Story
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Every trucking company deals with the same headache — hundreds of
              fuel receipts, toll slips, and maintenance invoices piling up in
              gloveboxes and desk drawers. Come tax season, it&apos;s chaos.
            </p>
            <p className="text-gray-600 leading-relaxed">
              FiscalNinja was born from this frustration. We built an
              AI-powered platform that turns a photo of a receipt into
              categorized, export-ready expense data in seconds. No more manual
              entry. No more lost receipts. Just snap, upload, and move on.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Our Mission
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Save truckers time and money on expense management — so they can
              focus on what matters: running their fleet and growing their
              business.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We&apos;re committed to building the simplest, most reliable
              expense management tool in the trucking industry. Every feature we
              ship is designed with owner-operators and fleet managers in mind.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            What FiscalNinja Does
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'AI Receipt Scanning',
                desc: 'Upload a photo and let Gemini AI extract vendor, amount, date, and category automatically.',
              },
              {
                title: 'Fleet Management',
                desc: 'Track trucks and drivers in one place. Assign receipts to specific vehicles and team members.',
              },
              {
                title: 'Expense Reports',
                desc: 'Real-time analytics and spending insights. Know exactly where your money goes.',
              },
              {
                title: 'Tax-Ready Exports',
                desc: 'Export to CSV, PDF, or Excel. Organized by category and ready for your accountant.',
              },
              {
                title: 'Team Access',
                desc: 'Invite managers and drivers with role-based permissions. Everyone sees only what they need.',
              },
              {
                title: 'Secure & Private',
                desc: 'Row-level security, encrypted storage, and HTTPS everywhere. Your data stays yours.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-100 p-6"
              >
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact + CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Ready to simplify your expenses?
        </h2>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
          Start your 14-day free trial today. No commitment — cancel anytime.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Get Started Free
          </Link>
          <Link
            href="mailto:support@fiscalninja.co"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Contact Us
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Questions? Reach us at{' '}
          <a
            href="mailto:support@fiscalninja.co"
            className="text-blue-600 hover:underline"
          >
            support@fiscalninja.co
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>&copy; {new Date().getFullYear()} FiscalNinja. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              Home
            </Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
