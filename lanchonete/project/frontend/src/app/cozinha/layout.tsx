import MotoboyShell from "@/components/layout/MotoboyShell";

export default function CozinhaLayout({ children }: { children: React.ReactNode }) {
  return <MotoboyShell mainClassName="bg-surface-950">{children}</MotoboyShell>;
}
