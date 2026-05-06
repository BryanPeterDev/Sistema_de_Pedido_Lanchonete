"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Zap } from "lucide-react";
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { formatCurrency, cn } from "@/lib/utils";
import { Spinner, Modal, Button, Input, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { Product } from "@/types";

const DAYS = [
  { label: "Seg", value: "0" },
  { label: "Ter", value: "1" },
  { label: "Qua", value: "2" },
  { label: "Qui", value: "3" },
  { label: "Sex", value: "4" },
  { label: "Sab", value: "5" },
  { label: "Dom", value: "6" },
];

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
    promotion_active_days: initial?.promotion_active_days ?? "0,1,2,3,4,5,6",
    option_groups: initial?.option_groups ?? [],
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const addGroup = () => {
    setForm(f => ({
      ...f, 
      option_groups: [...f.option_groups, { id: Date.now(), name: "", option_type: "single", is_required: false, min_selections: 1, max_selections: 1, options: [] }]
    }));
  };

  const updateGroup = (index: number, updates: any) => {
    setForm(f => {
      const newGroups = [...f.option_groups];
      newGroups[index] = { ...newGroups[index], ...updates };
      return { ...f, option_groups: newGroups };
    });
  };

  const removeGroup = (index: number) => {
    setForm(f => ({ ...f, option_groups: f.option_groups.filter((_, i) => i !== index) }));
  };

  const addOption = (groupIndex: number) => {
    setForm(f => {
      const newGroups = [...f.option_groups];
      newGroups[groupIndex].options = [...newGroups[groupIndex].options, { id: Date.now(), name: "", price_adjustment: 0 }];
      return { ...f, option_groups: newGroups };
    });
  };

  const updateOption = (groupIndex: number, optIndex: number, updates: any) => {
    setForm(f => {
      const newGroups = [...f.option_groups];
      const newOptions = [...newGroups[groupIndex].options];
      newOptions[optIndex] = { ...newOptions[optIndex], ...updates };
      newGroups[groupIndex].options = newOptions;
      return { ...f, option_groups: newGroups };
    });
  };

  const removeOption = (groupIndex: number, optIndex: number) => {
    setForm(f => {
      const newGroups = [...f.option_groups];
      newGroups[groupIndex].options = newGroups[groupIndex].options.filter((_, i) => i !== optIndex);
      return { ...f, option_groups: newGroups };
    });
  };

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
        <Input label="Preço (R$)" type="number" step="0.01" min="0" value={form.price} onChange={set("price")} />
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
          <div className="animate-fade-up space-y-3">
            <Input 
              label="Preço Promocional (R$)" 
              type="number" 
              step="0.01" 
              min="0" 
              value={form.promotional_price} 
              onChange={set("promotional_price")} 
            />
            
            <div>
              <label className="text-[11px] font-bold text-surface-400 uppercase tracking-wider block mb-2">Dias da semana ativos</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => {
                  const activeDays = form.promotion_active_days?.split(",") || [];
                  const isActive = activeDays.includes(day.value);
                  
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        let newDays;
                        if (isActive) {
                          newDays = activeDays.filter((d: string) => d !== day.value);
                        } else {
                          newDays = [...activeDays, day.value];
                        }
                        setForm(f => ({ ...f, promotion_active_days: newDays.sort().join(",") }));
                      }}
                      className={cn(
                        "w-9 h-9 rounded-xl text-xs font-bold transition-all border",
                        isActive 
                          ? "bg-brand-500 border-brand-500 text-white shadow-sm shadow-brand-200" 
                          : "bg-white border-surface-200 text-surface-500 hover:border-brand-300"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-surface-400 mt-2 italic">A promoção só será aplicada automaticamente nestes dias.</p>
            </div>
          </div>
        )}
      </div>

      {/* Product Options */}
      <div className="p-4 rounded-2xl border border-surface-100 bg-surface-50/50 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-surface-900 font-body">Grupos de Opções (Adicionais, Variações)</h3>
          <Button type="button" variant="secondary" size="sm" onClick={addGroup}><Plus size={14} className="mr-1" /> Grupo</Button>
        </div>
        
        {form.option_groups.map((group, gIdx) => (
          <div key={gIdx} className="p-3 bg-white border border-surface-200 rounded-xl space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input placeholder="Nome do grupo (ex: Tamanho)" value={group.name} onChange={e => updateGroup(gIdx, { name: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border text-sm" required />
                <select value={group.option_type} onChange={e => updateGroup(gIdx, { option_type: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border text-sm">
                  <option value="single">Escolha Única</option>
                  <option value="multiple">Múltipla Escolha</option>
                </select>
              </div>
              <button type="button" onClick={() => removeGroup(gIdx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"><Trash2 size={16} /></button>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-body">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={group.is_required} onChange={e => updateGroup(gIdx, { is_required: e.target.checked })} /> Obrigatório</label>
              {group.option_type === "multiple" && (
                <>
                  <label className="flex items-center gap-1.5">Mín: <input type="number" min="0" value={group.min_selections} onChange={e => updateGroup(gIdx, { min_selections: Number(e.target.value) })} className="w-12 px-1 py-0.5 border rounded" /></label>
                  <label className="flex items-center gap-1.5">Máx: <input type="number" min="1" value={group.max_selections} onChange={e => updateGroup(gIdx, { max_selections: Number(e.target.value) })} className="w-12 px-1 py-0.5 border rounded" /></label>
                </>
              )}
            </div>

            <div className="pl-4 border-l-2 border-brand-100 space-y-2 mt-2">
              {group.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex-1 space-y-2 p-2 bg-surface-50/50 rounded-xl border border-surface-100">
                    <div className="flex items-center gap-2">
                      <input placeholder="Opção (ex: Médio)" value={opt.name} onChange={e => updateOption(gIdx, oIdx, { name: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm bg-white" required />
                      <input type="number" step="0.01" placeholder="R$" value={opt.price_adjustment} onChange={e => updateOption(gIdx, oIdx, { price_adjustment: Number(e.target.value) })} className="w-16 px-2 py-1 border rounded text-sm bg-white" />
                      
                      <button 
                        type="button" 
                        onClick={() => updateOption(gIdx, oIdx, { is_promotional: !opt.is_promotional })}
                        className={cn(
                          "w-8 h-8 flex items-center justify-center rounded-lg transition-all border",
                          opt.is_promotional 
                            ? "bg-amber-100 border-amber-200 text-amber-600 shadow-sm" 
                            : "bg-white border-surface-200 text-surface-400 hover:border-brand-300"
                        )}
                        title="Ativar promoção para esta opção"
                      >
                        <Zap size={14} className={opt.is_promotional ? "fill-current" : ""} />
                      </button>

                      <button type="button" onClick={() => removeOption(gIdx, oIdx)} className="text-red-400 p-1 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                    </div>

                    {opt.is_promotional && (
                      <div className="flex items-center gap-2 pl-2 animate-fade-up">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Promo R$:</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          value={opt.promotional_price || ""} 
                          onChange={e => updateOption(gIdx, oIdx, { promotional_price: Number(e.target.value) })}
                          className="w-16 px-2 py-1 border border-amber-200 rounded text-xs bg-white"
                        />
                        <span className="text-[10px] text-surface-400 italic">Mesmos dias do produto</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pl-2">
                      <span className="text-[10px] font-bold text-surface-300 uppercase tracking-tight">Limita:</span>
                      <select 
                        value={opt.target_group_id || ""} 
                        onChange={e => updateOption(gIdx, oIdx, { target_group_id: e.target.value ? Number(e.target.value) : null })}
                        className="text-[10px] px-2 py-1 border rounded bg-white flex-1"
                      >
                        <option value="">Nenhum grupo</option>
                        {form.option_groups.filter((_, i) => i !== gIdx).map(otherG => (
                          <option key={otherG.id} value={otherG.id}>{otherG.name || `Grupo s/ nome (${otherG.id})`}</option>
                        ))}
                      </select>
                      {opt.target_group_id && (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-surface-400">Máx:</span>
                          <input 
                            type="number" 
                            min="1" 
                            placeholder="Qtd" 
                            value={opt.target_max_value || ""} 
                            onChange={e => updateOption(gIdx, oIdx, { target_max_value: Number(e.target.value) })}
                            className="w-10 text-[10px] px-1 py-1 border rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => addOption(gIdx)} className="h-7 text-xs mt-1">
                + Opção
              </Button>
            </div>
          </div>
        ))}
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
      promotion_active_days: data.promotion_active_days,
      image_url: data.image_url || null,
      description: data.description || null,
      option_groups: data.option_groups,
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
      promotion_active_days: data.promotion_active_days,
      image_url: data.image_url || null,
      description: data.description || null,
      option_groups: data.option_groups,
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
