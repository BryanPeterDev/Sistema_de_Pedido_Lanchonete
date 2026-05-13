"use client";
import { useState } from "react";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { formatCurrency, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ORDER_TYPE_LABEL, ORDER_TYPE_COLOR, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui";
import { Pencil, AlertTriangle, Calendar, ChevronDown } from "lucide-react";
import { useCashRegisterHistory, useCashRegisterCurrent } from "@/hooks/useCashRegister";
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

export default function AtendentePedidosPage() {
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>("current");

  const { data: currentRegister } = useCashRegisterCurrent();
  const { data: history } = useCashRegisterHistory(20);
  
  const apiFilter = activeTab === "todos" ? undefined : 
                    (activeTab === "finalizado" || activeTab === "entregue") ? "entregue" : 
                    activeTab as OrderStatus;

  const regId = selectedRegisterId === "current" ? undefined : Number(selectedRegisterId);
  const isOnlyCurrent = selectedRegisterId === "current";

  const { data: fetchedOrders, isLoading } = useOrders(apiFilter, isOnlyCurrent, regId);
  const updateStatus = useUpdateOrderStatus();

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
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;
    try {
      await updateStatus.mutateAsync({ id, status: "cancelado" });
      toast.success(`Pedido #${id} cancelado`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? "Erro ao cancelar");
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl text-surface-900">Pedidos do Dia</h1>
        <p className="text-sm text-surface-200 font-body mt-1">Tempo real (WebSocket)</p>
      </div>

      {/* Filters & Register Select */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-surface-200 shadow-sm min-w-[240px]">
          <Calendar size={18} className="text-surface-400" />
          <div className="flex-1 relative">
            <select
              value={selectedRegisterId}
              onChange={(e) => setSelectedRegisterId(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-surface-800 font-body appearance-none pr-8"
            >
              <option value="current">
                {currentRegister ? "Caixa Atual (Aberto)" : "Histórico Geral"}
              </option>
              {history?.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  Caixa #{reg.id} - {formatDate(reg.opened_at)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="grid gap-3">
          {orders?.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-surface-100 p-5 flex flex-col gap-4 animate-fade-up">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-body font-semibold text-surface-900">Pedido #{order.id}</span>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-body", ORDER_STATUS_COLOR[order.status])}>
                    {order.status === "entregue" && order.order_type !== "delivery" ? "Finalizado" : ORDER_STATUS_LABEL[order.status]}
                  </span>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-body", ORDER_TYPE_COLOR[order.order_type])}>
                    {ORDER_TYPE_LABEL[order.order_type]}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-sm font-body">
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
                {(order.status === "recebido" || order.status === "preparando" || order.status === "pronto") && (
                  <Link
                    href={`/atendente?edit=${order.id}`}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-100 text-surface-600 hover:bg-brand-100 hover:text-brand-600 transition-colors"
                    title="Editar Pedido"
                  >
                    <Pencil size={16} />
                  </Link>
                )}
                {order.status === "recebido" && (
                  <button
                    onClick={() => handleCancel(order.id)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-semibold font-body hover:bg-red-100 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {order.status === "entregue" && (
                  <button
                    onClick={() => {
                      if(confirm("Estornar este pedido? Ele sera movido para Cancelados.")) {
                        handleCancel(order.id);
                      }
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-semibold font-body hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    Estornar
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
              <div className="pt-4 border-t border-surface-100/50">
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
