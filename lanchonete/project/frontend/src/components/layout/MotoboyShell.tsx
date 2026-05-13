"use client";

import { useEffect, useState } from "react";
import { Menu, PanelLeftClose, X } from "lucide-react";
import MotoboySidebar from "@/components/layout/MotoboySidebar";
import { cn } from "@/lib/utils";

type MotoboyShellProps = {
  children: React.ReactNode;
  mainClassName?: string;
};

export default function MotoboyShell({ children, mainClassName }: MotoboyShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const syncSidebar = () => setSidebarOpen(!media.matches);

    syncSidebar();
    media.addEventListener("change", syncSidebar);
    return () => media.removeEventListener("change", syncSidebar);
  }, []);

  return (
    <div className="relative flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed left-64 top-4 z-40 hidden h-10 w-10 items-center justify-center rounded-xl bg-surface-900 text-surface-100 shadow-lg ring-1 ring-surface-700/70 transition hover:bg-brand-500 hover:text-white md:flex"
        >
          <PanelLeftClose size={18} />
        </button>
      )}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed left-[11.75rem] top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-900 text-surface-100 shadow-lg ring-1 ring-surface-700/70 transition hover:bg-brand-500 hover:text-white md:hidden"
        >
          <X size={18} />
        </button>
      )}

      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-50 h-10 w-10 items-center justify-center rounded-xl bg-surface-950 text-white shadow-lg transition hover:bg-surface-800",
          sidebarOpen ? "hidden" : "flex"
        )}
      >
        <Menu size={20} />
      </button>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-950/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:relative md:z-auto md:shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        )}
      >
        <MotoboySidebar onNavigate={() => window.innerWidth < 768 && setSidebarOpen(false)} />
      </div>

      <main className={cn("min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0", mainClassName)}>{children}</main>
    </div>
  );
}
