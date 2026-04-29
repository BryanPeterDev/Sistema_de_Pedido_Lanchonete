"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useProducts, useLowStock, useAdjustStock } from "@/hooks/useProducts";
import { Modal, Button, Input, Spinner } from "@/components/ui";
import toast from "react-hot-toast";
import type { Product } from "@/types";

export default function AdminEstoquePage() {
  const { data: products, isLoading } = useProducts();
  const { data: lowStock } = useLowStock();
  const adjustStock = useAdjustStock();
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  async function handleAdjust() {
    if (!adjusting || !delta) return;
    try {
      await adjustStock.mutateAsync({ id: adjusting.id, delta: Number(delta), reason });
      toast.success("Estoque ajustado!");
      setAdjusting(null);
      setDelta("");
      setReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao ajustar");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-surface-900">Estoque</h1>
        {lowStock && lowStock.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-body font-medium">
            <AlertTriangle size={16} />
            {lowStock.length} produto(s) com estoque baixo
          </div>
        )}
      </div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface-50 border-b border-surface-100">
              <tr>
                {["Produto", "Categoria", "Estoque atual", "Alerta em", ""].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-surface-200 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {products?.map((p) => (
                <tr key={p.id} className={`hover:bg-surface-50 transition-colors ${p.is_low_stock ? "bg-amber-50/50" : ""}`}>
                  <td className="px-5 py-4 font-semibold text-surface-900">{p.name}</td>
                  <td className="px-5 py-4 text-surface-200">{p.category.name}</td>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-1.5 font-semibold ${p.is_low_stock ? "text-amber-700" : "text-surface-900"}`}>
                      {p.is_low_stock && <AlertTriangle size={14} />}
                      {p.stock_quantity} un.
                    </span>
                  </td>
                  <td className="px-5 py-4 text-surface-200">{p.stock_alert_threshold} un.</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setAdjusting(p); setDelta(""); setReason(""); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 text-xs font-semibold font-body hover:bg-surface-100 transition-colors text-surface-800">
                        Ajustar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!adjusting} onClose={() => setAdjusting(null)} title={`Ajustar estoque — ${adjusting?.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-surface-200 font-body">Estoque atual: <strong className="text-surface-900">{adjusting?.stock_quantity} un.</strong></p>
          <div className="flex gap-2">
            <button onClick={() => setDelta("-1")} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-surface-200 text-sm font-body font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <TrendingDown size={16} /> Saída
            </button>
            <button onClick={() => setDelta("1")} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-surface-200 text-sm font-body font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors">
              <TrendingUp size={16} /> Entrada
            </button>
          </div>
          <Input label="Quantidade (negativo = saída)" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="ex: 10 ou -5" />
          <Input label="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reposição, quebra..." />
          <Button onClick={handleAdjust} loading={adjustStock.isPending} className="w-full">Confirmar ajuste</Button>
        </div>
      </Modal>
    </div>
  );
}
