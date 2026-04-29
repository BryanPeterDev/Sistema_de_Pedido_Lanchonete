"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusCircle, ClipboardList, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/atendente",         label: "Novo Pedido",  icon: PlusCircle },
  { href: "/atendente/pedidos", label: "Pedidos",      icon: ClipboardList },
];

export default function AtendenteSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-surface-800/50">
        <span className="text-2xl">🍔</span>
        <p className="font-display text-white mt-1 text-lg">Lanchonete</p>
        <p className="text-xs text-brand-400 font-body font-semibold mt-0.5">Painel do Atendente</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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

      {/* User */}
      <div className="p-4 border-t border-surface-800/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold font-body text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white font-body truncate">{user?.name}</p>
            <p className="text-xs text-surface-200 font-body">Atendente</p>
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
