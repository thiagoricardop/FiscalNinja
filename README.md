# FiscalNinja

Smart Receipt Management for Trucking Companies - OCR-powered receipt scanning and expense tracking.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Install shadcn/ui Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Project Structure

```
/src
  /app                 # Next.js 14 App Router
    /api              # API routes
    /dashboard        # Dashboard pages
    /auth             # Authentication pages
    layout.tsx        # Root layout
    page.tsx          # Home page
  /components
    /ui               # shadcn/ui components
    /receipts         # Receipt-specific components
    /layout           # Layout components (Header, Footer)
  /lib
    /utils            # Utility functions
    /db               # Database clients (Supabase)
    /ocr              # OCR integration (Google Vision)
  /types              # TypeScript type definitions
  /hooks              # Custom React hooks (Zustand store)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **OCR:** Google Cloud Vision API
- **File Upload:** react-dropzone
- **State Management:** Zustand
- **Date Handling:** date-fns
- **Icons:** lucide-react

## Next Steps

1. Set up Supabase database (see implementation guide)
2. Configure Google Cloud Vision API
3. Implement file upload functionality
4. Build OCR processing pipeline
5. Create receipt review interface

See `implementation-guide.ipynb` for detailed step-by-step instructions.
