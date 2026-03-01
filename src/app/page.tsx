'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Logo from '@/components/brand/Logo';
import {
  BarChart3,
  ShieldCheck,
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Check,
  Star,
  ChevronDown,
  Camera,
  Bot,
  FileSpreadsheet,
  Smartphone,
  Zap,
  TrendingUp,
  Heart,
  DollarSign,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ╔══════════════════════════════════════════════════════╗
   ║  SCROLL-TRIGGERED FADE-IN ANIMATION COMPONENT      ║
   ╚══════════════════════════════════════════════════════╝ */

function FadeIn({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ╔══════════════════════════════════════════════════════╗
   ║  FAQ ACCORDION COMPONENT                            ║
   ╚══════════════════════════════════════════════════════╝ */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left group"
      >
        <span className="text-base font-semibold text-gray-900 pr-4 group-hover:text-blue-600 transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? 'max-h-40 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ╔══════════════════════════════════════════════════════╗
   ║  DATA                                               ║
   ╚══════════════════════════════════════════════════════╝ */

const PAIN_POINTS: { emoji: string; title: string; desc: string }[] = [
  {
    emoji: '📸',
    title: 'Blurry photos via WhatsApp',
    desc: 'Drivers text stacks of blurry receipt photos with no context — vendor, date, and amount are anyone\'s guess.',
  },
  {
    emoji: '⌨️',
    title: '20+ hours/month of data entry',
    desc: 'Someone in the office spends entire weekends manually typing amounts into spreadsheets row by row.',
  },
  {
    emoji: '💸',
    title: '$3,000–$5,000 in lost deductions',
    desc: 'Receipts get lost between the cab, the glove box, and the office. Lost receipts mean lost tax deductions every year.',
  },
];

const HOW_STEPS: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: Camera,
    title: 'Upload',
    desc: 'Drivers snap a photo from any smartphone. Our mobile-first upload works on the road, at the pump, or in the shop.',
  },
  {
    icon: Bot,
    title: 'AI Extracts',
    desc: 'Our Gemini-powered OCR reads vendor, amount, date, tax, and category — with 95%+ accuracy, even on crumpled receipts.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Export',
    desc: 'Download organized Excel reports, generate PDF summaries, or export CSV files — in one click.',
  },
];

const BENEFITS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Clock, title: 'Save 20+ hours/month', desc: 'Eliminate manual data entry completely' },
  { icon: DollarSign, title: 'Never lose a deduction', desc: 'Every receipt captured and organized' },
  { icon: Heart, title: 'Happier drivers', desc: 'Faster reimbursements = lower turnover' },
  { icon: Zap, title: 'Instant exports', desc: 'Excel, PDF, and CSV in one click' },
  { icon: TrendingUp, title: 'Real-time reports', desc: 'Know your expenses instantly' },
  { icon: Smartphone, title: 'Mobile-first design', desc: 'Works on any smartphone' },
];

const TESTIMONIALS = [
  {
    quote: 'Saved me 25 hours a month. Absolute game-changer for my operation.',
    name: 'John M.',
    role: 'Fleet Owner',
    detail: '12 trucks',
    stars: 5,
  },
  {
    quote: 'Our drivers actually love using it. No more lost receipts or WhatsApp chaos.',
    name: 'Sarah K.',
    role: 'Office Manager',
    detail: '8 trucks',
    stars: 5,
  },
  {
    quote: 'Found $4,000 in missed deductions the first tax season. Paid for itself 10x over.',
    name: 'Mike D.',
    role: 'Solo Operator',
    detail: 'Owner-operator',
    stars: 5,
  },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: Camera, title: 'Mobile Upload', desc: 'Camera-friendly interface optimized for drivers on the road' },
  { icon: Bot, title: 'AI OCR Engine', desc: '95%+ accuracy on receipts — even faded, crumpled, or hand-written' },
  { icon: FileSpreadsheet, title: 'Excel Export', desc: 'Professionally formatted expense reports ready for your accountant' },
  { icon: Zap, title: 'Fast Exports', desc: 'Excel, PDF, and CSV reports ready for your accountant' },
  { icon: Users, title: 'Multi-User Access', desc: 'Drivers, managers, and owners — each with the right permissions' },
  { icon: BarChart3, title: 'Visual Reports', desc: 'Interactive charts to visualize spending trends by category and driver' },
  { icon: Shield, title: 'Data Protection', desc: 'AES-256 encryption, row-level security, and GDPR compliance' },
];

const PLANS = [
  {
    name: 'Solo',
    desc: '1–5 trucks',
    price: 29,
    highlight: false,
    features: [
      'Up to 5 trucks',
      'Up to 5 drivers',
      '200 receipts/month',
      'AI data extraction',
      'Excel & CSV export',
      'Spending dashboard',
      'Email support',
    ],
  },
  {
    name: 'Fleet',
    desc: '6–25 trucks',
    price: 79,
    highlight: true,
    features: [
      'Everything in Solo',
      'Up to 25 trucks',
      'Up to 25 drivers',
      '1,000 receipts/month',
      'Multi-user access',
      'Excel, PDF & CSV export',
      'Advanced reports & PDF',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    desc: '26–100 trucks',
    price: 149,
    highlight: false,
    features: [
      'Everything in Fleet',
      'Up to 100 trucks',
      'Up to 100 drivers',
      'Unlimited receipts',
      'Custom integrations',
      'Dedicated account manager',
      'SSO authentication',
      'Phone support & SLA',
    ],
  },
];

const FAQS = [
  {
    q: 'How accurate is the OCR?',
    a: '95%+ for standard receipts. You can always review and edit the extracted data before exporting — we show the original image side-by-side so nothing slips through.',
  },
  {
    q: 'Can drivers use their own phones?',
    a: 'Yes! FiscalNinja works on any smartphone with a camera. No special hardware or app download required — just open the browser, snap a photo, and you\'re done.',
  },
  {
    q: 'What export formats do you support?',
    a: 'We support Excel (.xlsx), CSV, and professionally formatted PDF reports. All exports can be filtered by date range, truck, driver, and category — ready to hand to your accountant.',
  },
  {
    q: 'What if I have more than 100 trucks?',
    a: 'We offer custom enterprise pricing for larger fleets. Contact our sales team and we\'ll build a plan that fits your operation.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes, every plan comes with a 14-day free trial. You can upgrade, downgrade, or cancel anytime.',
  },
  {
    q: 'How does team management work?',
    a: 'Owners can invite managers and drivers to their account. Each role has specific permissions — drivers can upload receipts, managers can view reports, and owners have full control.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use AES-256 encryption, TLS 1.3 for data in transit, and Supabase row-level security to ensure each user can only access their own data. We never sell your data.',
  },
  {
    q: 'Can I track expenses by truck or driver?',
    a: 'Yes. Every receipt can be assigned to a specific truck and driver. Reports and dashboards let you break down spending by truck, driver, category, and date range.',
  },
  {
    q: 'What types of receipts can I upload?',
    a: 'Any receipt image — fuel, maintenance, tolls, food, lodging, and more. Our AI handles gas station receipts, repair shop invoices, hotel bills, and even handwritten receipts.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. There are no long-term contracts. You can upgrade, downgrade, or cancel your subscription at any time from your account settings.',
  },
];

/* ╔══════════════════════════════════════════════════════╗
   ║  LANDING PAGE                                       ║
   ╚══════════════════════════════════════════════════════╝ */

export default function Home() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      {/* ───────────── NAVBAR ───────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="md" showText />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#problem" className="hover:text-gray-900 transition-colors">Problem</a>
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Button asChild size="sm" className="rounded-lg">
              <Link href="/auth/signup">
                Start Free Trial
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 -mr-2"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="Toggle navigation"
            >
              <div className="space-y-1.5">
                <span className={`block h-0.5 w-5 bg-gray-600 transition-transform ${mobileNav ? 'translate-y-2 rotate-45' : ''}`} />
                <span className={`block h-0.5 w-5 bg-gray-600 transition-opacity ${mobileNav ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 w-5 bg-gray-600 transition-transform ${mobileNav ? '-translate-y-2 -rotate-45' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileNav && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 pb-4 pt-2 space-y-3">
            {['problem', 'how-it-works', 'features', 'pricing', 'faq'].map((id) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setMobileNav(false)}
                className="block text-sm text-gray-600 hover:text-gray-900 py-1.5 capitalize"
              >
                {id.replace(/-/g, ' ')}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════
           SECTION 1 — HERO
         ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/80 via-white to-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-400/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-20 lg:pt-28 lg:pb-28">
          <div className="max-w-3xl mx-auto text-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-xs font-semibold text-blue-700 mb-8">
                <Zap className="h-3.5 w-3.5" />
                AI-Powered Receipt Management for Trucking
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
                Stop Wasting{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  20 Hours a Month
                </span>{' '}
                on Receipt Entry
              </h1>
            </FadeIn>

            <FadeIn delay={200}>
              <p className="mt-6 text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Truck drivers snap photos. Our AI extracts the data.
                You download organized expense reports. It&apos;s that simple.
              </p>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="rounded-xl px-8 py-6 text-base font-bold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30">
                  <Link href="/auth/signup">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-xl px-8 py-6 text-base">
                  <a href="#how-it-works">See How It Works</a>
                </Button>
              </div>
              <p className="mt-5 text-xs text-gray-500">
                14-day free trial &middot; Cancel anytime
              </p>
            </FadeIn>

            {/* Visual: 3-step mini flow */}
            <FadeIn delay={400}>
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {[
                  { icon: Camera, label: 'Driver snaps photo', step: '1' },
                  { icon: Bot, label: 'AI extracts data', step: '2' },
                  { icon: FileSpreadsheet, label: 'Export organized report', step: '3' },
                ].map((item, i) => (
                  <div
                    key={item.step}
                    className="relative flex flex-col items-center gap-3 bg-white/80 backdrop-blur rounded-2xl border border-gray-100 p-6 shadow-sm"
                  >
                    <div className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {item.step}
                    </div>
                    <item.icon className="h-8 w-8 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    {i < 2 && (
                      <ArrowRight className="hidden sm:block absolute -right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 z-10" />
                    )}
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 2 — PROBLEM
         ═══════════════════════════════════════════════ */}
      <section id="problem" className="py-24 bg-gray-50/70">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
                The Problem
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                The Receipt Chaos Trucking Companies Face
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PAIN_POINTS.map((p, i) => (
              <FadeIn key={p.title} delay={i * 150}>
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center hover:shadow-lg transition-shadow h-full">
                  <div className="text-5xl mb-5">{p.emoji}</div>
                  <h3 className="text-lg font-bold mb-3">{p.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 3 — HOW IT WORKS (SOLUTION)
         ═══════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                How FiscalNinja Works
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Three Steps. Zero Headaches.
              </h2>
              <p className="mt-4 text-gray-600">
                From receipt photo to organized report in under 30 seconds.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-4 max-w-5xl mx-auto">
            {HOW_STEPS.map((s, i) => (
              <FadeIn key={s.title} delay={i * 150}>
                <div className="relative text-center">
                  {/* Arrow connector between steps (desktop only) */}
                  {i < HOW_STEPS.length - 1 && (
                    <div className="hidden md:flex absolute top-8 -right-3 lg:-right-2 z-10 items-center translate-x-1/2">
                      <div className="w-6 lg:w-8 h-[2px] bg-blue-300" />
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[7px] border-l-blue-400" />
                    </div>
                  )}
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 mb-6 mx-auto ring-4 ring-blue-100/50">
                    <s.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 4 — BENEFITS
         ═══════════════════════════════════════════════ */}
      <section className="py-24 bg-gray-50/70">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                Benefits
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Save Time. Save Money. Stay Organized.
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <FadeIn key={b.title} delay={i * 100}>
                <div className="flex items-start gap-4 bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow h-full">
                  <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <b.icon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-sm text-gray-600">{b.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 5 — SOCIAL PROOF
         ═══════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                Testimonials
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Trusted by Trucking Companies Across North America
              </h2>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 150}>
                <div className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-lg transition-shadow h-full flex flex-col">
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 leading-relaxed flex-1">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.role} &middot; {t.detail}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 6 — FEATURES
         ═══════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-gray-50/70">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                Features
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Everything You Need in One Platform
              </h2>
              <p className="mt-4 text-gray-600">
                From the truck cab to tax season, FiscalNinja handles the
                paperwork so you can focus on running your business.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:border-gray-200 transition-all group h-full">
                  <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <f.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 7 — PRICING
         ═══════════════════════════════════════════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-4">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                Pricing
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Simple Pricing for Every Fleet Size
              </h2>
              <p className="mt-4 text-gray-600">
                Start with a 14-day free trial.
                Upgrade, downgrade, or cancel anytime.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-1.5 text-xs font-semibold text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                14-day free trial on all plans &middot; Cancel anytime
              </div>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 150}>
                <div
                  className={`relative rounded-2xl border p-8 flex flex-col h-full ${
                    plan.highlight
                      ? 'border-blue-600 bg-white shadow-xl shadow-blue-600/10 ring-1 ring-blue-600 scale-[1.02]'
                      : 'border-gray-200 bg-white hover:shadow-lg'
                  } transition-all`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">
                      <Star className="h-3 w-3 fill-white" />
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">${plan.price}</span>
                      <span className="text-gray-500 text-sm">/month</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Billed monthly &middot; 14-day free trial</p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`w-full rounded-xl py-3 font-bold ${
                      plan.highlight
                        ? 'shadow-lg shadow-blue-600/25'
                        : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                    variant={plan.highlight ? 'default' : 'default'}
                  >
                    <Link href="/auth/signup">
                      Start Free Trial
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={300}>
            <p className="text-center text-sm text-gray-500 mt-10">
              Need more than 100 trucks?{' '}
              <a href="mailto:sales@fiscalninja.com" className="text-blue-600 font-medium hover:text-blue-700">
                Contact us for custom enterprise pricing.
              </a>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 8 — FAQ
         ═══════════════════════════════════════════════ */}
      <section id="faq" className="py-24 bg-gray-50/70">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                FAQ
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold">
                Frequently Asked Questions
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="bg-white rounded-2xl border border-gray-100 px-8 divide-y divide-gray-100">
              {FAQS.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           SECTION 9 — FINAL CTA
         ═══════════════════════════════════════════════ */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-12 lg:p-16 text-white">
              <h2 className="text-3xl lg:text-4xl font-bold">
                Ready to Save 20 Hours a Month?
              </h2>
              <p className="mt-4 text-blue-100 max-w-xl mx-auto">
                Join trucking companies across North America who eliminated
                receipt chaos and reclaimed their weekends.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-xl px-10 py-6 text-base font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-xl"
                >
                  <Link href="/auth/signup">
                    Start Your Free Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-blue-200">
                14-day free trial &middot; Cancel anytime
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  30-day money-back guarantee
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  GDPR compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  AES-256 encryption
                </span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
           FOOTER
         ═══════════════════════════════════════════════ */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Logo size="md" showText />
              </Link>
              <p className="text-sm text-gray-500 leading-relaxed">
                AI-powered receipt management built for the trucking industry.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><a href="#features" className="hover:text-gray-900 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a></li>
                <li><a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><Link href="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
                <li><a href="mailto:support@fiscalninja.com" className="hover:text-gray-900 transition-colors">Contact</a></li>
                <li><Link href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Connect</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li>
                  <a
                    href="https://twitter.com/fiscalninja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a
                    href="https://linkedin.com/company/fiscalninja"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-900 transition-colors"
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} FiscalNinja. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                AES-256 Encrypted
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
