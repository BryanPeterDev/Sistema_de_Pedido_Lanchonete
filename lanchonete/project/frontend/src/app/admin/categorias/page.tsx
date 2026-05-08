"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button, Input, Modal, Spinner, EmptyState, ConfirmModal } from "@/components/ui";
import toast from "react-hot-toast";
import type { Category } from "@/types";

function useAdminCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories", "all"],
    queryFn: () => api.get("/categories?only_active=false").then((r) => r.data),
  });
}

export default function AdminCategoriasPage() {
  const qc = useQueryClient();
  const { data: categories, isLoading } = useAdminCategories();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const createMut = useMutation({
    mutationFn: (data: object) => api.post("/categories", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria criada!"); setShowCreate(false); setForm({ name: "", description: "" }); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => api.patch(`/categories/${id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Atualizado!"); setEditing(null); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Removido!"); setDeletingCat(null); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-surface-900">Categorias</h1>
        <Button onClick={() => { setForm({ name: "", description: "" }); setShowCreate(true); }}>
          <Plus size={18} /> Nova categoria
        </Button>
      </div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : !categories?.length ? (
        <EmptyState icon="🏷️" title="Nenhuma categoria" action={<Button onClick={() => setShowCreate(true)}>Criar categoria</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl border border-surface-100 p-5 flex items-center justify-between gap-3">
              <div>
                <p className="font-body font-semibold text-surface-900">{cat.name}</p>
                {cat.description && <p className="text-xs text-surface-200 mt-0.5 font-body">{cat.description}</p>}
                <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-semibold font-body ${cat.is_active ? "bg-emerald-100 text-emerald-800" : "bg-surface-100 text-surface-200"}`}>
                  {cat.is_active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditing(cat); setForm({ name: cat.name, description: cat.description ?? "" }); }} className="p-2 rounded-xl hover:bg-surface-100 text-surface-800 transition-colors"><Pencil size={15} /></button>
                <button onClick={() => setDeletingCat({ id: cat.id, name: cat.name })} className="p-2 rounded-xl hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova categoria">
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Descrição" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" loading={createMut.isPending} className="w-full">Criar</Button>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar categoria">
        <form onSubmit={(e) => { e.preventDefault(); editing && updateMut.mutate({ id: editing.id, data: form }); }} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Input label="Descrição" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Button type="submit" loading={updateMut.isPending} className="w-full">Salvar</Button>
        </form>
      </Modal>

      <ConfirmModal 
        open={!!deletingCat} 
        onClose={() => setDeletingCat(null)} 
        onConfirm={() => deletingCat && deleteMut.mutate(deletingCat.id)}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${deletingCat?.name}"? Esta ação não poderá ser desfeita e só funcionará se não houver produtos vinculados.`}
        confirmLabel="Excluir"
        loading={deleteMut.isPending}
      />
    </div>
  );
}
