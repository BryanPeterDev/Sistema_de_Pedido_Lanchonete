"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, LogOut, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const motoboyLinks = [
  { href: "/motoboy", label: "Entregas", icon: Truck },
  { href: "/cozinha", label: "Cozinha", icon: ChefHat },
];

const cozinhaLinks = [
  { href: "/cozinha", label: "Cozinha", icon: ChefHat },
];

type MotoboySidebarProps = {
  onNavigate?: () => void;
};

export default function MotoboySidebar({ onNavigate }: MotoboySidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isMotoboy = user?.role === "motoboy";
  const links = isMotoboy ? motoboyLinks : cozinhaLinks;

  return (
    <aside className="flex h-screen w-60 flex-col bg-gradient-to-b from-surface-950 to-surface-900">
      <div className="p-6 border-b border-surface-800/50">
        <span className="text-2xl">LB</span>
        <p className="font-display text-white mt-1 text-lg">Lanchonete</p>
        <p className="text-xs text-brand-400 font-body font-semibold mt-0.5">
          {isMotoboy ? "Painel do Motoboy" : "Painel da Cozinha"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all",
              pathname === href
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                : "text-surface-200 hover:bg-surface-800 hover:text-white"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-surface-800/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold font-body text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white font-body truncate">{user?.name}</p>
            <p className="text-xs text-surface-200 font-body">{isMotoboy ? "Motoboy" : "Cozinha"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-surface-200 hover:bg-surface-800 hover:text-white transition-colors font-body"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
