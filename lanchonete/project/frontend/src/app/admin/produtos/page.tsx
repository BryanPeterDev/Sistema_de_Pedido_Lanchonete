"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle, Copy, Eye, EyeOff } from "lucide-react";
import { useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useProducts";
import { formatCurrency, cn, getImageUrl } from "@/lib/utils";
import { Spinner, Modal, Button, Input, EmptyState, ConfirmModal } from "@/components/ui";
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
    image_path: initial?.image_path ?? "",
    category_id: initial?.category?.id ?? categories[0]?.id ?? 0,
    is_available: initial?.is_available ?? true,
    is_visible: initial?.is_visible ?? true,
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

                    <button type="button" onClick={() => removeOption(gIdx, oIdx)} className="text-red-400 p-1 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>

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

      <Input label="Nome do arquivo da imagem (colocar na pasta ImagensProdutos)" placeholder="ex: x-tudo.jpg" value={form.image_path} onChange={set("image_path")} />
      <Button type="submit" loading={loading} className="w-full">
        {initial ? "Salvar alterações" : "Criar produto"}
      </Button>
    </form>
  );
}

export default function AdminProdutosPage() {
  const { data: products, isLoading } = useProducts(undefined, false, false);
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [duplicating, setDuplicating] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<{ id: number; name: string } | null>(null);

  const filteredProducts = products ?? [];

  async function handleCreate(data: any) {
    const payload = {
      ...data,
      price: Number(data.price),
      category_id: Number(data.category_id),
      image_url: data.image_url || null,
      image_path: data.image_path || null,
      description: data.description || null,
      option_groups: data.option_groups,
    };
    try {
      await createProduct.mutateAsync(payload);
      toast.success("Produto criado!");
      setShowCreate(false);
      setDuplicating(null);
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
      image_url: data.image_url || null,
      image_path: data.image_path || null,
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

  async function handleToggleAvailability(product: Product) {
    try {
      await updateProduct.mutateAsync({ 
        id: product.id, 
        data: { is_available: !product.is_available } 
      });
      toast.success(product.is_available ? "Ocultado do Painel de Pedidos" : "Visível no Painel de Pedidos");
    } catch {
      toast.error("Erro ao alterar status");
    }
  }

  async function handleToggleVisibility(product: Product) {
    try {
      await updateProduct.mutateAsync({ 
        id: product.id, 
        data: { is_visible: !product.is_visible } 
      });
      toast.success(product.is_visible ? "Ocultado do Cardápio" : "Visível no Cardápio");
    } catch {
      toast.error("Erro ao alterar visibilidade");
    }
  }

  async function handleDelete() {
    console.log("handleDelete called", deletingId);
    if (!deletingId) return;
    try {
      await deleteProduct.mutateAsync(deletingId.id);
      toast.success("Produto removido com sucesso!");
      setDeletingId(null);
    } catch (err: any) {
      toast.error("Este produto não pode ser apagado pois tem pedidos vinculados. Ele foi desativado em vez disso.");
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Gestão de Produtos</h1>
          <p className="text-sm text-surface-400 font-body mt-1">Organize seu cardápio e controle a visibilidade dos itens.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreate(true)} className="rounded-2xl shadow-brand-500/20">
            <Plus size={18} /> Novo Produto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState 
          icon="📦" 
          title="Nenhum produto cadastrado" 
          description="Adicione seu primeiro item ao sistema."
          action={<Button onClick={() => setShowCreate(true)}>Criar Produto</Button>}
        />
      ) : (
        <div className="space-y-12">
          {categories.map((category) => {
            const categoryProducts = filteredProducts.filter(p => p.category?.id === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-5">
                <div className="flex items-center gap-4 px-2">
                  <h2 className="font-display text-2xl text-surface-900">{category.name}</h2>
                  <div className="h-px flex-1 bg-surface-100" />
                  <span className="bg-surface-50 text-surface-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {categoryProducts.length} itens
                  </span>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {categoryProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className={cn(
                        "group bg-white rounded-3xl border border-surface-100 p-4 transition-all hover:shadow-xl hover:shadow-surface-900/5 hover:-translate-y-0.5",
                        (!product.is_visible && !product.is_available) && "opacity-60 grayscale-[0.5] border-dashed"
                      )}
                    >
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-surface-50 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0 border border-surface-100">
                          {(product.image_path || product.image_url) ? (
                            <img src={getImageUrl(product.image_path || product.image_url) || ""} alt="" className="w-full h-full object-cover" />
                          ) : (
                            "🍔"
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-display text-lg text-surface-900 truncate">{product.name}</h3>
                              <p className="text-xl font-display text-brand-600 mt-0.5">{formatCurrency(product.price)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditing(product)} className="p-2 rounded-xl hover:bg-surface-50 text-surface-400 hover:text-surface-900 transition-colors">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => setDuplicating(product)} className="p-2 rounded-xl hover:bg-surface-50 text-surface-400 hover:text-brand-500 transition-colors">
                                <Copy size={18} />
                              </button>
                              <button onClick={() => setDeletingId({ id: product.id, name: product.name })} className="p-2 rounded-xl hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {/* Toggle Cardápio */}
                            <button
                              onClick={() => handleToggleVisibility(product)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                product.is_visible 
                                  ? "bg-brand-50 text-brand-700 border-brand-100" 
                                  : "bg-surface-50 text-surface-400 border-surface-100"
                              )}
                            >
                              {product.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                              Cardápio: {product.is_visible ? "Visível" : "Oculto"}
                            </button>
                            
                            {/* Toggle Pedidos (Atendente) */}
                            <button
                              onClick={() => handleToggleAvailability(product)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                                product.is_available 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                  : "bg-surface-50 text-surface-400 border-surface-100"
                              )}
                            >
                              <div className={cn("w-2 h-2 rounded-full", product.is_available ? "bg-emerald-500" : "bg-surface-300")} />
                              Pedidos: {product.is_available ? "Ativo" : "Oculto"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Produtos órfãos */}
          {(() => {
            const categoryIds = categories.map(c => c.id);
            const orphanProducts = filteredProducts.filter(p => !p.category || !categoryIds.includes(p.category.id));
            if (orphanProducts.length === 0) return null;

            return (
              <div className="space-y-5 pt-4">
                <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle size={24} />
                    <h2 className="font-display text-2xl font-semibold">Itens sem Categoria</h2>
                  </div>
                  <div className="h-px flex-1 bg-amber-100" />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {orphanProducts.map((product) => (
                    <div key={product.id} className="bg-amber-50/20 rounded-3xl border border-amber-200 p-4 backdrop-blur-sm">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-amber-100 flex items-center justify-center text-xl shadow-sm">🍔</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-lg text-surface-900">{product.name}</h3>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditing(product)} className="p-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => setDeletingId({ id: product.id, name: product.name })} className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-colors">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-amber-600 font-bold mt-1 uppercase tracking-tight">⚠️ Necessário vincular a uma categoria</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Modal open={showCreate || !!duplicating} onClose={() => { setShowCreate(false); setDuplicating(null); }} title={duplicating ? `Duplicar: ${duplicating.name}` : "Novo produto"}>
        <ProductForm
          initial={duplicating ? { ...duplicating, name: `${duplicating.name} (Cópia)` } : undefined}
          categories={categories}
          onSubmit={handleCreate}
          loading={createProduct.isPending}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar produto">
        {editing && <ProductForm initial={editing} categories={categories} onSubmit={handleUpdate} loading={updateProduct.isPending} />}
      </Modal>

      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Excluir Produto"
        message={`Tem certeza que deseja remover "${deletingId?.name}"? Se houver pedidos antigos vinculados, o item será apenas arquivado (inativo).`}
        confirmLabel="Remover Item"
        loading={deleteProduct.isPending}
      />
    </div>
  );
}
