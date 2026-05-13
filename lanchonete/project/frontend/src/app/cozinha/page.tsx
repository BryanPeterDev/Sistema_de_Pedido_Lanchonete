"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Clock, Flame, CheckCircle2, AlertCircle, GripVertical } from "lucide-react";
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

const REORDERABLE_STATUS: OrderStatus = "preparando";

export default function CozinhaPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [orderIdsByStatus, setOrderIdsByStatus] = useState<Partial<Record<OrderStatus, number[]>>>({});
  const [draggedOrder, setDraggedOrder] = useState<{ id: number; status: OrderStatus } | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<number | null>(null);

  // Fetch all non-terminal orders
    const { data: allOrders, isLoading } = useQuery<Order[]>({
    queryKey: ["kitchen-orders"],
    queryFn: async () => {
      const [recebidos, preparando, prontos] = await Promise.all([
        api.get("/orders", { params: { order_status: "recebido", only_current_register: true } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "preparando", only_current_register: true } }).then((r) => r.data),
        api.get("/orders", { params: { order_status: "pronto", only_current_register: true } }).then((r) => r.data),
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

  useEffect(() => {
    if (!allOrders) return;

    setOrderIdsByStatus((current) => {
      const next: Partial<Record<OrderStatus, number[]>> = {};

      for (const col of COLUMNS) {
        const idsFromApi = allOrders.filter((o) => o.status === col.status).map((o) => o.id);
        const currentIds = current[col.status] ?? [];
        const keptIds = currentIds.filter((id) => idsFromApi.includes(id));
        const newIds = idsFromApi.filter((id) => !keptIds.includes(id));

        next[col.status] = [...keptIds, ...newIds];
      }

      return next;
    });
  }, [allOrders]);

  function getOrdersByStatus(status: OrderStatus): Order[] {
    const orders = allOrders?.filter((o) => o.status === status) ?? [];
    const orderIds = orderIdsByStatus[status];

    if (!orderIds?.length) return orders;

    return [...orders].sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
  }

  function reorderWithinStatus(status: OrderStatus, targetOrderId: number | null, insertAfter = false) {
    if (!draggedOrder || draggedOrder.status !== status) return;

    setOrderIdsByStatus((current) => {
      const ids = [...(current[status] ?? getOrdersByStatus(status).map((o) => o.id))];
      const fromIndex = ids.indexOf(draggedOrder.id);
      if (fromIndex === -1) return current;

      const [movedId] = ids.splice(fromIndex, 1);
      const targetIndex = targetOrderId === null ? ids.length : ids.indexOf(targetOrderId);
      const toIndex = targetOrderId === null || !insertAfter ? targetIndex : targetIndex + 1;

      if (targetIndex === -1) return current;
      ids.splice(toIndex, 0, movedId);

      return { ...current, [status]: ids };
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-surface-800/50 sm:px-6">
        <div className="flex items-center gap-3">
          <ChefHat size={28} className="text-brand-500" />
          <div>
            <h1 className="font-display text-xl text-white">Cozinha</h1>
            <p className="text-xs text-surface-200 font-body">Tempo real (WebSocket) · {user?.name}</p>
          </div>
        </div>
      </header>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="h-10 w-10 text-surface-200" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden">
          {COLUMNS.map((col) => {
            const orders = getOrdersByStatus(col.status);
            return (
              <div key={col.status} className={`flex min-h-[320px] flex-1 flex-col rounded-2xl border-2 ${col.bgColor} bg-surface-900/50 overflow-hidden md:min-h-0`}>
                {/* Column header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-800/50">
                  <span className={col.color}>{col.icon}</span>
                  <span className="font-body font-semibold text-white text-sm">{col.label}</span>
                  <span className="ml-auto bg-surface-800 text-surface-200 text-xs font-body font-bold px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                </div>

                {/* Cards */}
                <div
                  className="flex-1 overflow-auto p-3 space-y-3"
                  onDragOver={(e) => {
                    if (col.status === REORDERABLE_STATUS) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (col.status === REORDERABLE_STATUS) reorderWithinStatus(col.status, null);
                  }}
                >
                  {orders.length === 0 ? (
                    <div className="text-center py-8 text-surface-200/50 font-body text-sm">
                      Nenhum pedido
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        draggable={order.status === REORDERABLE_STATUS && user?.role !== "motoboy"}
                        onDragStart={() => {
                          if (order.status === REORDERABLE_STATUS && user?.role !== "motoboy") {
                            setDraggedOrder({ id: order.id, status: order.status });
                          }
                        }}
                        onDragEnter={() => {
                          if (order.status === REORDERABLE_STATUS && draggedOrder?.status === order.status) {
                            setDragOverOrderId(order.id);
                          }
                        }}
                        onDragOver={(e) => {
                          if (order.status === REORDERABLE_STATUS) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          if (order.status !== REORDERABLE_STATUS) return;
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const insertAfter = e.clientY > rect.top + rect.height / 2;
                          reorderWithinStatus(order.status, order.id, insertAfter);
                        }}
                        onDragEnd={() => {
                          setDraggedOrder(null);
                          setDragOverOrderId(null);
                        }}
                        className={cn(
                          "bg-surface-800/80 backdrop-blur rounded-xl p-4 space-y-3 animate-fade-up transition-colors border",
                          order.status === REORDERABLE_STATUS && "cursor-grab active:cursor-grabbing",
                          order.is_edited ? "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]" : "border-surface-700/50 hover:border-surface-600",
                          draggedOrder?.id === order.id && "opacity-50",
                          dragOverOrderId === order.id && draggedOrder?.status === order.status && "ring-2 ring-brand-400"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {order.status === REORDERABLE_STATUS && <GripVertical size={16} className="text-surface-400" />}
                            <span className="font-body font-bold text-white text-lg">#{order.id}</span>
                          </div>
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

                        {NEXT_STATUS[order.status] && user?.role !== "motoboy" && (
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
