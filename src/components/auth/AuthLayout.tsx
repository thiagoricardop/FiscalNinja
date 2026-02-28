import { Receipt, ShieldCheck, Zap, TrendingUp, Lock, ScanLine, FileCheck, Check, Clock, Camera, Bot, FileSpreadsheet } from 'lucide-react';
import Logo from '@/components/brand/Logo';

const HIGHLIGHTS = [
  'Save 20+ hours/month — zero manual data entry',
  'AI OCR with 95%+ accuracy on receipts',
  'AES-256 encryption & row-level security',
  'Track spending by truck, driver, and category',
  'Excel, PDF, and QuickBooks export in one click',
  '14-day free trial on every plan — no card required',
];

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand / Value Proposition */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-10 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-indigo-400/20 blur-2xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <Logo size="lg" showText className="mb-16" />

          {/* Headline */}
          <h1 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Stop Wasting 20 Hours a Month on Receipt Entry
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Drivers snap photos. Our AI extracts the data. You download organized expense reports.
          </p>

          {/* 3-step mini flow */}
          <div className="flex items-center gap-3 mb-8">
            {[
              { icon: Camera, text: 'Snap' },
              { icon: Bot, text: 'Extract' },
              { icon: FileSpreadsheet, text: 'Export' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-blue-100">{text}</span>
                </div>
                {i < 2 && (
                  <div className="flex items-center mt-[-18px]">
                    <div className="w-4 h-[2px] bg-white/30" />
                    <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[5px] border-l-white/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Clock, text: 'Save 20+ Hrs/Mo' },
              { icon: ShieldCheck, text: 'Bank-Grade Security' },
              { icon: TrendingUp, text: 'Smart Analytics' },
              { icon: Lock, text: 'Zero Data Selling' },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium"
              >
                <Icon className="h-4 w-4" />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* What you get */}
        <div className="relative z-10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-200 mb-4">
              What&apos;s included
            </p>
            <ul className="space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-blue-50">
                  <Check className="h-4 w-4 text-blue-300 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Right Panel — Form Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50/50">
        <div className="w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
