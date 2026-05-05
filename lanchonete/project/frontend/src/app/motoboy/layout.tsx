import MotoboyShell from "@/components/layout/MotoboyShell";

export default function MotoboyLayout({ children }: { children: React.ReactNode }) {
  return <MotoboyShell mainClassName="bg-surface-50">{children}</MotoboyShell>;
}
