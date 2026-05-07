"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock, Flame, CheckCircle2, LogOut, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { Spinner } from "@/components/ui";
import { formatDate, ORDER_TYPE_LABEL, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { Order, OrderStatus } from "@/types";

const COLUMNS: { status: OrderStatus; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  {
    status: "recebido",
    label: "Recebidos",
    icon: <Clock size={20} />,
    color: "text-blue-400",
    bgColor: "border-blue-500/30",
  },
  {
    status: "preparando",
    label: "Em Preparo",
    icon: <Flame size={20} />,
    color: "text-amber-400",
    bgColor: "border-amber-500/30",
  },
  {
    status: "pronto",
    label: "Prontos",
    icon: <CheckCircle2 size={20} />,
    color: "text-emerald-400",
    bgColor: "border-emerald-500/30",
  },
];

export default function CozinhaPage() {
  const qc = useQueryClient();
  const { user, logout } = useAuth();

  // Fetch all non-terminal orders
  const { data: allOrders, isLoading } = useQuery<Order[]>({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const [recebidos, preparando, prontos] = await Promise.all([
        api.get("/orders", { params: { order_status: "recebido" } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "preparando" } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "pronto" } }).then((r) => r.data),
      ]);
      return [...recebidos, ...preparando, ...prontos];
    },
  });

  const advanceMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
      toast.success("Status atualizado!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
  });

  const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    recebido: "preparando",
    preparando: "pronto",
  };

  const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
    recebido: "Iniciar preparo",
    preparando: "Marcar como pronto",
  };

  function getOrdersByStatus(status: OrderStatus): Order[] {
    return allOrders?.filter((o) => o.status === status) ?? [];
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-800/50">
        <div className="flex items-center gap-3">
          <ChefHat size={28} className="text-brand-500" />
          <div>
            <h1 className="font-display text-xl text-white">Cozinha</h1>
            <p className="text-xs text-surface-200 font-body">Tempo real (WebSocket) · {user?.name}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-surface-200 hover:bg-surface-800 hover:text-white transition-colors font-body"
        >
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="h-10 w-10 text-surface-200" />
        </div>
      ) : (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {COLUMNS.map((col) => {
            const orders = getOrdersByStatus(col.status);
            return (
              <div key={col.status} className={`flex-1 flex flex-col rounded-2xl border-2 ${col.bgColor} bg-surface-900/50 overflow-hidden`}>
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800/50">
                  <span className={col.color}>{col.icon}</span>
                  <span className="font-body font-semibold text-white text-sm">{col.label}</span>
                  <span className="ml-auto bg-surface-800 text-surface-200 text-xs font-body font-bold px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-auto p-3 space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-surface-200/50 font-body text-sm">
                      Nenhum pedido
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className={cn(
                          "bg-surface-800/80 backdrop-blur rounded-xl p-4 space-y-3 animate-fade-up transition-colors border",
                          order.is_edited ? "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]" : "border-surface-700/50 hover:border-surface-600"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-body font-bold text-white text-lg">#{order.id}</span>
                          <span className="text-xs font-body text-surface-200">{formatDate(order.created_at)}</span>
                        </div>

                        <div className="text-xs font-body text-surface-200">
                          <span className="text-brand-400 font-semibold">{order.customer_name}</span>
                          <span className="mx-1.5">·</span>
                          <span>{ORDER_TYPE_LABEL[order.order_type]}</span>
                        </div>

                        {order.is_edited && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs p-2.5 rounded-lg font-body font-bold">
                            <div className="flex items-center gap-1.5 uppercase tracking-wide text-[10px] mb-1 text-amber-400">
                              <AlertCircle size={12} /> Pedido Alterado
                            </div>
                            {order.edit_note}
                          </div>
                        )}

                        {/* Items */}
                        <div className="space-y-1">
                          {order.items?.map((item) => (
                            <div key={item.id} className="space-y-0.5">
                              <div className="flex items-center gap-2 text-sm font-body text-white">
                                <span className="bg-brand-500/20 text-brand-400 font-bold text-xs px-1.5 py-0.5 rounded">
                                  {item.quantity}x
                                </span>
                                <span className="truncate">{item.product.name}</span>
                              </div>
                              {item.selected_options && item.selected_options.length > 0 && (
                                <div className="text-[11px] font-body text-surface-400 ml-9 leading-tight">
                                  {item.selected_options.map((opt) => (
                                    <div key={opt.option_item_id}>+ {opt.name}</div>
                                  ))}
                                </div>
                              )}
                              {item.notes && (
                                <p className="text-[10px] font-body text-amber-300 ml-9 italic leading-tight">
                                  Obs: {item.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="flex items-start gap-1.5 text-xs text-amber-400 font-body bg-amber-500/10 rounded-lg p-2">
                            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                            {order.notes}
                          </div>
                        )}

                        {NEXT_STATUS[order.status] && (
                          <button
                            onClick={() => advanceMut.mutate({ id: order.id, status: NEXT_STATUS[order.status]! })}
                            disabled={advanceMut.isPending}
                            className={`w-full py-2.5 rounded-xl text-sm font-body font-semibold transition-all disabled:opacity-50 ${
                              col.status === "recebido"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white"
                            }`}
                          >
                            {NEXT_LABEL[order.status]}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
