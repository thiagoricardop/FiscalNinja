# FiscalNinja

[![CI](https://github.com/thiagoricardop/FiscalNinja/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagoricardop/FiscalNinja/actions/workflows/ci.yml)

**Smart Receipt Management for Trucking Companies**

FiscalNinja is a SaaS platform built for owner-operators and fleet managers who need to track fuel receipts, tolls, maintenance costs, and other on-the-road expenses without the shoebox-of-receipts chaos. Snap a photo of any receipt, and the AI-powered OCR extracts vendor, amount, date, and category in seconds — turning hours of manual data entry into a one-tap workflow.

## Why FiscalNinja?

- **AI-Powered OCR** — Receipts are processed by Google Gemini to extract structured data automatically.
- **Fleet-Ready** — Role-based access (Owner → Manager → Driver) lets you scale from a single truck to 100+.
- **Export Anything** — Generate Excel, CSV, or PDF reports filtered by date, truck, driver, or category.
- **Subscription Plans** — Solo, Fleet, and Enterprise tiers with 14-day free trials via Stripe.
- **Secure by Default** — Row-level security, CSRF protection, rate limiting, and encrypted storage.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email + magic link) |
| OCR | Google Gemini AI |
| Payments | Stripe (Checkout, Billing Portal, Webhooks) |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide React |
| PDF Export | @react-pdf/renderer |

## Project Structure

```
src/
├── app/               # Next.js App Router
│   ├── api/           # API routes (Stripe, webhooks, account, uploads)
│   ├── auth/          # Login, signup, callback, verify-email
│   ├── dashboard/     # Dashboard pages (upload, receipts, reports, settings)
│   └── onboarding/    # Guided onboarding flow
├── components/
│   ├── ui/            # shadcn/ui primitives
│   ├── auth/          # Auth-related components
│   ├── brand/         # Logo, branding
│   ├── dashboard/     # PaywallGuard, dashboard widgets
│   ├── export/        # PDF/Excel export components
│   └── receipts/      # Receipt cards, filters, review UI
├── hooks/             # useUser, useSubscription, usePermissions, useStore
├── lib/
│   ├── auth/          # RBAC, permissions, validation
│   ├── payments/      # Stripe singleton, price maps, customer helpers
│   ├── supabase/      # Server + client + admin clients
│   ├── ocr/           # Gemini OCR integration
│   ├── export/        # Excel/CSV/PDF generators
│   ├── security/      # CSRF, rate limiting
│   └── storage/       # Supabase storage helpers
└── types/             # TypeScript interfaces
```

## License

Proprietary — All rights reserved.
