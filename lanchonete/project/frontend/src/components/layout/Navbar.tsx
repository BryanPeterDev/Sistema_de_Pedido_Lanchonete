"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/cardapio" className="flex items-center gap-2">
          <span className="text-2xl">🍔</span>
          <span className="font-display text-xl text-surface-900">Lanchonete</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <Link
            href="/cardapio"
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-body font-medium transition-colors",
              pathname === "/cardapio"
                ? "bg-brand-50 text-brand-600"
                : "text-surface-800 hover:bg-surface-50"
            )}
          >
            Cardápio
          </Link>
        </nav>
      </div>
    </header>
  );
}
