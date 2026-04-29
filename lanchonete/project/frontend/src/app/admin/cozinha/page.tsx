"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Flame, CheckCircle2, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { Spinner } from "@/components/ui";
import { formatDate, ORDER_TYPE_LABEL, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Order, OrderStatus } from "@/types";

const COLUMNS: { status: OrderStatus; label: string; icon: React.ReactNode; borderColor: string }[] = [
  { status: "recebido",   label: "Recebidos",  icon: <Clock size={18} />,        borderColor: "border-t-blue-500" },
  { status: "preparando", label: "Em Preparo",  icon: <Flame size={18} />,        borderColor: "border-t-amber-500" },
  { status: "pronto",     label: "Prontos",     icon: <CheckCircle2 size={18} />, borderColor: "border-t-emerald-500" },
];

export default function AdminCozinhaPage() {
  const qc = useQueryClient();

  const { data: allOrders, isLoading } = useQuery<Order[]>({
    queryKey: ["admin-kitchen"],
    queryFn: async () => {
      const [r, p, pr] = await Promise.all([
        api.get("/orders", { params: { order_status: "recebido" } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "preparando" } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "pronto" } }).then((r) => r.data),
      ]);
      return [...r, ...p, ...pr];
    },
  });

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-kitchen"] }); toast.success("Status atualizado!"); },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
  });

  const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
    recebido: { status: "preparando", label: "Iniciar preparo" },
    preparando: { status: "pronto", label: "Marcar pronto" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-surface-900">Visão da Cozinha</h1>
        <p className="text-sm text-surface-200 font-body mt-1">Tempo real (WebSocket)</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-4" style={{ minHeight: "60vh" }}>
          {COLUMNS.map((col) => {
            const orders = allOrders?.filter((o) => o.status === col.status) ?? [];
            return (
              <div key={col.status} className={`bg-white rounded-2xl border border-surface-100 ${col.borderColor} border-t-4 overflow-hidden flex flex-col`}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 bg-surface-50/50">
                  {col.icon}
                  <span className="font-body font-semibold text-surface-900 text-sm">{col.label}</span>
                  <span className="ml-auto bg-surface-100 text-surface-800 text-xs font-body font-bold px-2 py-0.5 rounded-full">{orders.length}</span>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-surface-200 font-body text-sm">Nenhum pedido</div>
                  ) : orders.map((order) => (
                    <div 
                      key={order.id} 
                      className={cn(
                        "border rounded-xl p-3 space-y-2 transition-shadow",
                        order.is_edited ? "border-amber-400 bg-amber-50/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]" : "border-surface-100 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-body font-bold text-surface-900">#{order.id}</span>
                        <span className="text-xs text-surface-200 font-body">{formatDate(order.created_at)}</span>
                      </div>
                      <div className="text-xs font-body text-surface-800">
                        {order.customer_name} · {ORDER_TYPE_LABEL[order.order_type]}
                      </div>
                      
                      {order.is_edited && (
                        <div className="bg-amber-100 text-amber-900 text-xs p-2 rounded-lg font-body font-bold border border-amber-200">
                          <div className="flex items-center gap-1 uppercase tracking-wide text-[10px] mb-0.5 text-amber-700">
                            <AlertCircle size={12} /> Pedido Alterado
                          </div>
                          {order.edit_note}
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-1 bg-surface-50 p-2 rounded-lg">
                        {order.items?.map((item) => (
                          <div key={item.id} className="text-[11px] font-body">
                            <div className="flex justify-between text-surface-900 font-semibold">
                              <span>{item.quantity}x {item.product.name}</span>
                            </div>
                            {item.notes && (
                              <div className="text-[10px] text-amber-600 italic">
                                Obs: {item.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <div className="text-xs text-amber-600 font-body bg-amber-50 rounded-lg p-2 flex items-start gap-1">
                          <AlertCircle size={10} className="mt-0.5 flex-shrink-0" /> {order.notes}
                        </div>
                      )}
                      {NEXT[order.status] && (
                        <button
                          onClick={() => advanceMut.mutate({ id: order.id, status: NEXT[order.status]!.status })}
                          disabled={advanceMut.isPending}
                          className={cn(
                            "w-full py-2 rounded-lg text-xs font-body font-semibold transition-all disabled:opacity-50",
                            col.status === "recebido"
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          )}
                        >
                          {NEXT[order.status]!.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
