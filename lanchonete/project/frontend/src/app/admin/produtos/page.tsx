"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";
import { Spinner, Modal, Button, Input, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { Product } from "@/types";

function ProductForm({
  initial,
  categories,
  onSubmit,
  loading,
}: {
  initial?: Partial<Product>;
  categories: { id: number; name: string }[];
  onSubmit: (data: object) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    image_url: initial?.image_url ?? "",
    category_id: initial?.category?.id ?? categories[0]?.id ?? 0,
    is_available: initial?.is_available ?? true,
    is_promotional: initial?.is_promotional ?? false,
    promotional_price: initial?.promotional_price ?? "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); await onSubmit(form); }}
      className="space-y-4"
    >
      <Input label="Nome" value={form.name} onChange={set("name")} required />
      <div>
        <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Descrição</label>
        <textarea value={form.description} onChange={set("description") as any} rows={2} className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Preço (R$)" type="number" step="0.01" min="0" value={form.price} onChange={set("price")} required />
        <div>
          <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Categoria</label>
          <select value={form.category_id} onChange={set("category_id") as any} className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      
      {/* Promotional Pricing */}
      <div className="p-4 rounded-2xl border border-surface-100 bg-surface-50/50 space-y-3">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-sm font-semibold text-surface-800 font-body">Ativar Promoção para este produto</span>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.is_promotional}
              onChange={(e) => setForm((f) => ({ ...f, is_promotional: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
          </div>
        </label>
        
        {form.is_promotional && (
          <div className="animate-fade-up">
            <Input 
              label="Preço Promocional (R$)" 
              type="number" 
              step="0.01" 
              min="0" 
              value={form.promotional_price} 
              onChange={set("promotional_price")} 
              required={form.is_promotional}
            />
          </div>
        )}
      </div>
      <Input label="URL da imagem" type="url" placeholder="https://..." value={form.image_url} onChange={set("image_url")} />
      <Button type="submit" loading={loading} className="w-full">
        {initial ? "Salvar alterações" : "Criar produto"}
      </Button>
    </form>
  );
}

export default function AdminProdutosPage() {
  const { data: products, isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  async function handleCreate(data: any) {
    const payload = {
      ...data,
      price: Number(data.price),
      category_id: Number(data.category_id),
      promotional_price: data.is_promotional && data.promotional_price ? Number(data.promotional_price) : null,
      image_url: data.image_url || null,
      description: data.description || null,
    };
    try {
      await createProduct.mutateAsync(payload);
      toast.success("Produto criado!");
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao criar");
    }
  }

  async function handleUpdate(data: any) {
    if (!editing) return;
    const payload = {
      ...data,
      price: Number(data.price),
      category_id: Number(data.category_id),
      promotional_price: data.is_promotional && data.promotional_price ? Number(data.promotional_price) : null,
      image_url: data.image_url || null,
      description: data.description || null,
    };
    try {
      await updateProduct.mutateAsync({ id: editing.id, data: payload });
      toast.success("Produto atualizado!");
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao atualizar");
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Desativar "${name}"?`)) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Produto desativado");
    } catch {
      toast.error("Erro ao desativar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Produtos</h1>
          <p className="text-sm text-surface-200 font-body mt-1">{products?.length ?? 0} produtos cadastrados</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : !products?.length ? (
        <EmptyState icon="📦" title="Nenhum produto" description="Adicione o primeiro produto ao cardápio" action={<Button onClick={() => setShowCreate(true)}>Criar produto</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-50 border-b border-surface-100">
              <tr>
                {["Produto", "Categoria", "Preço", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-surface-200 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-surface-900">{product.name}</p>
                      {product.is_promotional && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">
                          Promoção
                        </span>
                      )}
                    </div>
                    {product.description && <p className="text-xs text-surface-200 mt-0.5 line-clamp-1">{product.description}</p>}
                  </td>
                  <td className="px-5 py-4 text-surface-800">{product.category.name}</td>
                  <td className="px-5 py-4 font-semibold text-surface-900">
                    {product.is_promotional && product.promotional_price ? (
                      <div className="flex flex-col">
                        <span className="text-brand-600">{formatCurrency(product.promotional_price)}</span>
                        <span className="text-[10px] text-surface-300 line-through -mt-0.5">{formatCurrency(product.price)}</span>
                      </div>
                    ) : (
                      formatCurrency(product.price)
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${product.is_available ? "bg-emerald-100 text-emerald-800" : "bg-surface-100 text-surface-200"}`}>
                      {product.is_available ? "Disponível" : "Indisponível"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditing(product)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-800 transition-colors"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(product.id, product.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Novo produto">
        <ProductForm categories={categories} onSubmit={handleCreate} loading={createProduct.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar produto">
        {editing && <ProductForm initial={editing} categories={categories} onSubmit={handleUpdate} loading={updateProduct.isPending} />}
      </Modal>
    </div>
  );
}
