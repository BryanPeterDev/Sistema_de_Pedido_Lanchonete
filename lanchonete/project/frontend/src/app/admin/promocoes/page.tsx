"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Tag, Clock, CalendarDays, PercentCircle } from "lucide-react";
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion } from "@/hooks/usePromotions";
import { useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";
import { Spinner, Modal, Button, Input, EmptyState, ConfirmModal } from "@/components/ui";
import toast from "react-hot-toast";
import type { Promotion, Product } from "@/types";

const DAYS = [
  { label: "Dom", value: "6" },
  { label: "Seg", value: "0" },
  { label: "Ter", value: "1" },
  { label: "Qua", value: "2" },
  { label: "Qui", value: "3" },
  { label: "Sex", value: "4" },
  { label: "Sab", value: "5" },
];

function PromotionForm({ initial, products, onSubmit, loading }: any) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    product_id: initial?.product_id ?? "",
    option_item_id: initial?.option_item_id ?? "",
    discount_value: initial?.discount_value ?? "",
    active_days: initial?.active_days ? initial.active_days.split(",") : [],
    start_time: initial?.start_time ?? "",
    end_time: initial?.end_time ?? "",
    is_active: initial?.is_active ?? true,
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  // Find selected product to show its options
  const selectedProduct = products.find((p: Product) => p.id === Number(form.product_id));

  return (
    <form onSubmit={(e) => { 
      e.preventDefault(); 
      if (!form.product_id && !form.option_item_id) {
        toast.error("Selecione pelo menos um produto ou variação");
        return;
      }
      const payload = {
        ...form,
        product_id: form.product_id ? Number(form.product_id) : null,
        option_item_id: form.option_item_id ? Number(form.option_item_id) : null,
        discount_value: Number(form.discount_value),
        active_days: form.active_days.length > 0 ? form.active_days.join(",") : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      };
      if (payload.option_item_id) {
        payload.product_id = null; // Backend valida isso
      }
      onSubmit(payload); 
    }} className="space-y-4">
      <Input label="Nome da Promoção" value={form.name} onChange={set("name")} required />
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Produto Alvo</label>
          <select 
            value={form.product_id || ""} 
            onChange={(e) => { setForm(f => ({...f, product_id: e.target.value, option_item_id: ""})); }}
            className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            required={!form.option_item_id}
          >
            <option value="">Selecione um produto</option>
            {products.map((p: Product) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        
        {selectedProduct && selectedProduct.option_groups.length > 0 && (
          <div>
            <label className="text-sm font-semibold text-surface-800 font-body block mb-1.5">Variação Específica (Opcional)</label>
            <select 
              value={form.option_item_id || ""} 
              onChange={set("option_item_id")}
              className="w-full px-4 py-2.5 rounded-2xl border border-surface-200 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">Aplicar ao produto inteiro</option>
              {selectedProduct.option_groups.map(g => (
                <optgroup key={g.id} label={g.name}>
                  {g.options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Novo Preço Fixo (R$)" type="number" step="0.01" min="0" value={form.discount_value} onChange={set("discount_value")} required />
        <div className="flex items-center mt-6">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(f => ({...f, is_active: e.target.checked}))} />
            Promoção Ativa
          </label>
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-surface-800 font-body block mb-2">Dias da semana ativos (Vazio = Todos)</label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map(day => {
            const isSelected = form.active_days.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => {
                  setForm(f => ({
                    ...f,
                    active_days: isSelected ? f.active_days.filter(d => d !== day.value) : [...f.active_days, day.value]
                  }))
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold font-body transition-colors ${
                  isSelected ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-400 hover:bg-surface-200'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Hora Início (Opcional)" type="time" value={form.start_time} onChange={set("start_time")} />
        <Input label="Hora Fim (Opcional)" type="time" value={form.end_time} onChange={set("end_time")} />
      </div>

      <Button type="submit" loading={loading} className="w-full">
        {initial ? "Salvar alterações" : "Criar promoção"}
      </Button>
    </form>
  )
}

export default function AdminPromocoesPage() {
  const { data: promotions, isLoading } = usePromotions();
  const { data: products = [] } = useProducts();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [deletingId, setDeletingId] = useState<{ id: number; name: string } | null>(null);

  async function handleCreate(payload: any) {
    try {
      await createPromotion.mutateAsync(payload);
      toast.success("Promoção criada!");
      setShowCreate(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao criar");
    }
  }

  async function handleUpdate(payload: any) {
    if (!editing) return;
    try {
      await updatePromotion.mutateAsync({ id: editing.id, payload });
      toast.success("Promoção atualizada!");
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao atualizar");
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deletePromotion.mutateAsync(deletingId.id);
      toast.success("Promoção excluída");
      setDeletingId(null);
    } catch {
      toast.error("Erro ao excluir");
    }
  }

  const getTargetName = (promo: Promotion) => {
    if (promo.option_item_id) {
      // Find the option name in products
      for (const p of products) {
        for (const g of p.option_groups) {
          const opt = g.options.find(o => o.id === promo.option_item_id);
          if (opt) return `${p.name} - ${opt.name}`;
        }
      }
      return "Variação desconhecida";
    }
    if (promo.product_id) {
      const p = products.find(p => p.id === promo.product_id);
      return p ? p.name : "Produto desconhecido";
    }
    return "Nenhum alvo";
  }

  const formatDays = (daysStr: string | null) => {
    if (!daysStr) return "Todos os dias";
    return daysStr.split(",").map(d => DAYS.find(x => x.value === d)?.label).filter(Boolean).join(", ");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-surface-900">Promoções</h1>
          <p className="text-sm text-surface-200 font-body mt-1">{promotions?.length ?? 0} promoções cadastradas</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Nova Promoção
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : !promotions?.length ? (
        <EmptyState 
          icon="🏷️" 
          title="Nenhuma promoção" 
          description="Crie descontos por horário, dia ou produto." 
          action={<Button onClick={() => setShowCreate(true)}>Criar Promoção</Button>} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <div key={promo.id} className="bg-white rounded-2xl border border-surface-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="font-semibold text-surface-900 font-display truncate" title={promo.name}>{promo.name}</h3>
                  <p className="text-xs text-surface-300 font-body flex items-center gap-1 mt-0.5">
                    <Tag size={12} /> {getTargetName(promo)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(promo)} className="p-1.5 rounded-lg hover:bg-surface-50 text-surface-400 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => setDeletingId({ id: promo.id, name: promo.name })} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-end justify-between mt-4">
                <div>
                  <div className="text-[10px] text-surface-300 uppercase tracking-wide font-bold mb-0.5">Preço Fixo</div>
                  <div className="font-display text-xl text-brand-600">{formatCurrency(promo.discount_value)}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 text-xs text-surface-400">
                  {promo.active_days && (
                    <div className="flex items-center gap-1" title="Dias ativos">
                      <CalendarDays size={12} /> <span className="truncate max-w-[120px]">{formatDays(promo.active_days)}</span>
                    </div>
                  )}
                  {(promo.start_time || promo.end_time) && (
                    <div className="flex items-center gap-1" title="Horário">
                      <Clock size={12} /> {promo.start_time?.slice(0,5) || "00:00"} às {promo.end_time?.slice(0,5) || "23:59"}
                    </div>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${promo.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-400'}`}>
                    {promo.is_active ? "Ativa" : "Pausada"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nova Promoção">
        <PromotionForm products={products} onSubmit={handleCreate} loading={createPromotion.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Promoção">
        {editing && <PromotionForm initial={editing} products={products} onSubmit={handleUpdate} loading={updatePromotion.isPending} />}
      </Modal>
      <ConfirmModal 
        open={!!deletingId} 
        onClose={() => setDeletingId(null)} 
        onConfirm={handleDelete}
        title="Excluir Promoção"
        message={`Deseja realmente excluir a promoção "${deletingId?.name}"?`}
        confirmLabel="Excluir"
        loading={deletePromotion.isPending}
      />
    </div>
  );
}
