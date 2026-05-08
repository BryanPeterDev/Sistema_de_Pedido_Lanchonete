"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { Spinner, Badge, Modal, Button, Input, ConfirmModal } from "@/components/ui";
import toast from "react-hot-toast";
import type { User, UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  atendente: "Atendente",
  cozinha: "Cozinha",
  motoboy: "Motoboy",
};
const ROLE_COLORS: Record<UserRole, "default" | "success" | "warning" | "info"> = {
  admin: "info",
  atendente: "success",
  cozinha: "warning",
  motoboy: "default",
};
const ALL_ROLES: UserRole[] = ["admin", "atendente", "cozinha", "motoboy"];

export default function AdminUsuariosPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", phone: "", role: "atendente" as UserRole });
  const [creating, setCreating] = useState(false);
  const [togglingUser, setTogglingUser] = useState<{ id: number; name: string; is_active: boolean } | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/toggle-active`).then((r) => r.data),
    onSuccess: (u: User) => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success(u.is_active ? "Usuário ativado" : "Usuário excluído"); setTogglingUser(null); },
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: UserRole }) => api.patch(`/users/${id}/role`, { role }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("Role atualizado!"); },
  });

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/auth/register", newUser);
      toast.success("Usuário criado!");
      setShowCreate(false);
      setNewUser({ name: "", email: "", password: "", phone: "", role: "atendente" });
      qc.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao criar usuário");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Usuários</h1>
          <p className="text-sm text-surface-200 font-body mt-1">{users?.length ?? 0} funcionários</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus size={18} /> Novo Funcionário
        </Button>
      </div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-50 border-b border-surface-100">
              <tr>
                {["Funcionário", "E-mail", "Telefone", "Role", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-surface-200 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">{user.name[0].toUpperCase()}</div>
                      <span className="font-semibold text-surface-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-surface-200">{user.email}</td>
                  <td className="px-5 py-4 text-surface-200">{user.phone ?? "—"}</td>
                  <td className="px-5 py-4">
                    <select value={user.role} onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value as UserRole })} className="text-xs font-semibold border border-surface-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400">
                      {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={user.is_active ? "success" : "default"}>{user.is_active ? "Ativo" : "Inativo"}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setTogglingUser({ id: user.id, name: user.name, is_active: user.is_active })} className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-body border transition-colors ${user.is_active ? "border-red-200 text-red-500 hover:bg-red-50" : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>
                      {user.is_active ? "Excluir" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create user modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo Funcionário">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Nome" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
          <Input label="E-mail" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
          <Input label="Senha" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required />
          <Input label="Telefone" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
          <div>
            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Função</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <Button type="submit" loading={creating} className="w-full">Criar funcionário</Button>
        </form>
      </Modal>

      <ConfirmModal 
        open={!!togglingUser} 
        onClose={() => setTogglingUser(null)} 
        onConfirm={() => togglingUser && toggleActive.mutate(togglingUser.id)}
        title={togglingUser?.is_active ? "Excluir Funcionário" : "Ativar Funcionário"}
        message={togglingUser?.is_active 
          ? `Tem certeza que deseja excluir o funcionário "${togglingUser?.name}"? Ele não conseguirá mais acessar o sistema.` 
          : `Deseja ativar o acesso do funcionário "${togglingUser?.name}" ao sistema?`
        }
        variant={togglingUser?.is_active ? "danger" : "info"}
        confirmLabel={togglingUser?.is_active ? "Excluir" : "Ativar"}
        loading={toggleActive.isPending}
      />
    </div>
  );
}
