"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { Input, Button } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Bem-vindo, ${u.name.split(" ")[0]}!`);
      switch (u.role) {
        case "admin":      router.push("/admin/pedidos"); break;
        case "atendente":  router.push("/atendente");     break;
        case "cozinha":    router.push("/cozinha");        break;
        case "motoboy":    router.push("/motoboy");        break;
        default:           router.push("/");               break;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl shadow-surface-800/5 p-8 border border-surface-100">
        <div className="mb-8 text-center">
          <span className="text-4xl">🍔</span>
          <h1 className="font-display text-2xl text-surface-900 mt-3">Acesso ao Sistema</h1>
          <p className="text-sm text-surface-200 font-body mt-1">Entre com suas credenciais</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="E-mail" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Senha" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
