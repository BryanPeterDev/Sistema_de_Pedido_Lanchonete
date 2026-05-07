"use client";
import { useState } from "react";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { formatCurrency, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ORDER_TYPE_LABEL, ORDER_TYPE_COLOR, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { Pencil, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { OrderStatus } from "@/types";

const FILTERS: { label: string; value: string }[] = [
  { label: "Todos",      value: "todos" },
  { label: "Recebidos",  value: "recebido" },
  { label: "Preparando", value: "preparando" },
  { label: "Prontos",    value: "pronto" },
  { label: "A caminho",  value: "a_caminho" },
  { label: "Entregues (Delivery)", value: "entregue" },
  { label: "Finalizados (Local)",  value: "finalizado" },
  { label: "Cancelados", value: "cancelado" },
];

function getNextStatus(status: OrderStatus, orderType: string): OrderStatus | null {
  if (status === "recebido") return "preparando";
  if (status === "preparando") return "pronto";
  if (status === "pronto") {
    if (orderType === "delivery") return "a_caminho";
    return "entregue";
  }
  if (status === "a_caminho") return "entregue";
  return null;
}

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  recebido: "Preparando",
  preparando: "Pronto",
  pronto: "A Caminho",
  a_caminho: "Entregue",
  entregue: "Finalizado",
};

export default function AdminPedidosPage() {
  const [activeTab, setActiveTab] = useState<string>("todos");
  
  // O backend não entende "finalizado", então mapeamos para "entregue" na hora de buscar
  const apiFilter = activeTab === "todos" ? undefined : 
                    (activeTab === "finalizado" || activeTab === "entregue") ? "entregue" : 
                    activeTab as OrderStatus;

  const { data: fetchedOrders, isLoading } = useOrders(apiFilter);
  const updateStatus = useUpdateOrderStatus();

  // Filtragem no frontend para separar o que é delivery entregue do que é local finalizado
  const orders = fetchedOrders?.filter(o => {
    if (activeTab === "entregue") return o.order_type === "delivery";
    if (activeTab === "finalizado") return o.order_type !== "delivery";
    return true;
  });

  async function advance(id: number, status: OrderStatus, orderType: string) {
    const next = getNextStatus(status, orderType);
    if (!next) return;
    try {
      await updateStatus.mutateAsync({ id, status: next });
      toast.success(`Pedido #${id} → ${ORDER_STATUS_LABEL[next]}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao atualizar");
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("Cancelar este pedido?")) return;
    try {
      await updateStatus.mutateAsync({ id, status: "cancelado" });
      toast.success(`Pedido #${id} cancelado`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-surface-900">Pedidos</h1>
        <p className="text-sm text-surface-200 font-body mt-1">Todos os pedidos · Tempo real (WebSocket)</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setActiveTab(f.value)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold font-body transition-all border",
              activeTab === f.value ? "bg-surface-950 text-white border-surface-950" : "bg-white text-surface-800 border-surface-200 hover:border-surface-800"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid gap-3">
          {orders?.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-surface-100 p-5 animate-fade-up">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body font-bold text-surface-900 text-lg">#{order.id}</span>
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-body", ORDER_STATUS_COLOR[order.status])}>
                      {order.status === "entregue" && order.order_type !== "delivery" ? "Finalizado" : ORDER_STATUS_LABEL[order.status]}
                    </span>
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-body", ORDER_TYPE_COLOR[order.order_type])}>
                      {ORDER_TYPE_LABEL[order.order_type]}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1.5 text-sm font-body flex-wrap">
                    <span className="text-surface-200">{formatDate(order.created_at)}</span>
                    <span className="text-surface-800 font-semibold">{order.customer_name}</span>
                    <span className="font-semibold text-brand-600">{formatCurrency(order.total)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getNextStatus(order.status, order.order_type) && (
                    <button
                      onClick={() => advance(order.id, order.status, order.order_type)}
                      disabled={updateStatus.isPending}
                      className="px-4 py-2 rounded-xl bg-surface-950 text-white text-sm font-semibold font-body hover:bg-surface-800 transition-colors disabled:opacity-50"
                    >
                      → {getNextStatus(order.status, order.order_type) === "entregue" ? "Finalizado" : NEXT_STATUS_LABEL[order.status]}
                    </button>
                  )}
                  {/* EDIT BUTTON */}
                  {(order.status === "recebido" || order.status === "preparando" || order.status === "pronto") && (
                    <Link
                      href={`/admin/novo-pedido?edit=${order.id}`}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 text-surface-600 hover:bg-brand-100 hover:text-brand-600 transition-colors"
                      title="Editar Pedido"
                    >
                      <Pencil size={16} />
                    </Link>
                  )}
                  {(order.status === "recebido" || order.status === "preparando") && (
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="px-3 py-2 rounded-xl text-red-500 text-sm font-semibold font-body hover:bg-red-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
              
              {order.is_edited && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Pedido Editado</p>
                    <p className="text-sm font-body text-amber-900 mt-0.5">{order.edit_note}</p>
                  </div>
                </div>
              )}

              {/* Order Items & Notes */}
              <div className="mt-4 pt-4 border-t border-surface-100/50">
                <div className="flex flex-col gap-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="text-sm font-body">
                      <div className="flex items-center gap-2 text-surface-900">
                        <span className="font-semibold">{item.quantity}x</span>
                        <span>{item.product.name}</span>
                      </div>
                      {item.selected_options && item.selected_options.length > 0 && (
                        <div className="text-[11px] text-surface-500 ml-6 leading-tight">
                          {item.selected_options.map((opt) => (
                            <div key={opt.option_item_id}>+ {opt.name}</div>
                          ))}
                        </div>
                      )}
                      {item.notes && (
                        <span className="text-[11px] text-amber-600 italic ml-6 block mt-0.5">
                          Obs: {item.notes}
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {order.notes && (
                    <div className="mt-2 text-xs text-surface-800 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <span className="font-semibold mr-1">Observação Geral:</span>
                      {order.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!orders?.length && (
            <div className="text-center py-12 text-surface-200 font-body">Nenhum pedido encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}
