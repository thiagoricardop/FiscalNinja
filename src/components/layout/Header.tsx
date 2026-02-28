import Link from "next/link";
import { Truck } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Truck className="h-6 w-6" />
            <span className="font-bold text-xl">FiscalNinja</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
            <Link
              href="/receipts"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Receipts
            </Link>
            <Link
              href="/reports"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Reports
            </Link>
          </nav>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <nav className="flex items-center space-x-2">
            <Link
              href="/auth"
              className="rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
