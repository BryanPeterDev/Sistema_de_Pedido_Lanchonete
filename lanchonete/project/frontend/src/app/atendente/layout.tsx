import AtendenteSidebar from "@/components/layout/AtendenteSidebar";

export default function AtendenteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AtendenteSidebar />
      <main className="flex-1 bg-surface-50 overflow-y-auto">{children}</main>
    </div>
  );
}
