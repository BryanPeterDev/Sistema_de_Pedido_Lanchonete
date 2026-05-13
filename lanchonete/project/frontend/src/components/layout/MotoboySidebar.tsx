"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, LogOut, Truck, MoreVertical } from "lucide-react";
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isMotoboy = user?.role === "motoboy";
  const isStaff = user && ["admin", "atendente", "motoboy"].includes(user.role);
  const links = isStaff ? motoboyLinks : cozinhaLinks;

  return (
    <aside className={cn(
      "min-h-screen bg-[#0A0A0B] border-r border-surface-800/30 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-50",
      isCollapsed ? "w-[76px]" : "w-60"
    )}>
      {/* Header with Logo & Toggle Button */}
      <div className="pt-8 pb-6 px-4 flex flex-col items-center">
        <div className={cn("flex flex-col items-center transition-all duration-500", isCollapsed ? "mb-6" : "mb-6")}>
          <div className="w-12 h-12 bg-gradient-to-br from-surface-800 to-surface-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl border border-surface-700/50 mb-3 group-hover:scale-110 transition-transform">
            <img src="/logo.png?v=1" alt="Logo" className="w-full h-full object-cover" />
          </div>
          {!isCollapsed && (
            <div className="animate-fade-in text-center">
              <h1 className="font-display text-white text-lg font-bold leading-tight uppercase tracking-tight">The Dog</h1>
              <p className="text-[10px] text-brand-500 font-body font-bold uppercase tracking-[0.2em] mt-0.5">
                Food Truck
              </p>
            </div>
          )}
        </div>

        {/* New Toggle Button Position - Standing out with brand colors */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex items-center justify-center transition-all duration-300 rounded-xl border border-brand-500/30 bg-brand-500/5 text-brand-500 hover:bg-brand-500 hover:text-white shadow-[0_0_15px_rgba(255,122,0,0.1)]",
            isCollapsed ? "w-10 h-10" : "w-14 h-10"
          )}
          title={isCollapsed ? "Expandir" : "Recolher"}
        >
          <MoreVertical size={20} className={cn("transition-transform duration-500", !isCollapsed && "rotate-90")} />
        </button>
      </div>

      <div className="px-4 mb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-surface-800/50 to-transparent" />
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-300 group relative",
              pathname === href
                ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20 border border-brand-400/20"
                : "text-white/70 hover:bg-brand-500/10 hover:text-white border border-transparent hover:border-brand-500/20",
              isCollapsed ? "justify-center px-0 h-12" : ""
            )}
          >
            <Icon size={20} className={cn("transition-transform duration-300 group-hover:scale-110", pathname === href ? "text-white" : "text-inherit")} />
            {!isCollapsed && <span className="truncate animate-fade-in">{label}</span>}

            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-surface-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-[60] border border-surface-700 shadow-2xl backdrop-blur-md">
                {label}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 bg-surface-900/20 mt-auto">
        <div className={cn("flex items-center gap-3 p-2 rounded-2xl bg-surface-900/40 border border-surface-800/30 mb-2", isCollapsed ? "justify-center" : "")}>
          <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold font-body text-xs shadow-lg">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-[11px] font-bold text-white font-body truncate tracking-tight">{user?.name}</p>
              <p className="text-[9px] text-surface-500 font-body uppercase tracking-tighter">{isMotoboy ? "Motoboy" : "Cozinha"}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 font-body group relative border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]",
            isCollapsed ? "justify-center px-0 h-10" : ""
          )}
        >
          <LogOut size={16} className="shrink-0 group-hover:translate-x-1.5 transition-transform duration-300" />
          {!isCollapsed && <span className="animate-fade-in">Sair</span>}

          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 bg-red-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-[60] shadow-2xl">
              Sair
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
