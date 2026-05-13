"use client";
import { Truck, CheckCircle2, MapPin, Phone, User, Package } from "lucide-react";
import { useDeliveries, useClaimDelivery, useUpdateDeliveryStatus } from "@/hooks/useDeliveries";
import { Spinner, Button } from "@/components/ui";
import { formatDate, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_COLOR: Record<string, string> = {
  pendente:          "bg-amber-100 text-amber-800",
  saiu_para_entrega: "bg-purple-100 text-purple-800",
  entregue:          "bg-emerald-100 text-emerald-800",
};
const STATUS_LABEL: Record<string, string> = {
  pendente:          "Aguardando motoboy",
  saiu_para_entrega: "A caminho",
  entregue:          "Entregue",
};

export default function AdminEntregasPage() {
  const { data: deliveries, isLoading } = useDeliveries({ only_current_register: true });
  const claimMut = useClaimDelivery();
  const updateMut = useUpdateDeliveryStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-surface-900">Entregas</h1>
        <p className="text-sm text-surface-200 font-body mt-1">Visão de todas as entregas · Atualiza a cada 10s</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : !deliveries?.length ? (
        <div className="text-center py-16 space-y-3">
          <Truck size={48} className="mx-auto text-surface-200" />
          <p className="font-display text-xl text-surface-800">Nenhuma entrega</p>
          <p className="text-sm text-surface-200 font-body">Entregas aparecem quando pedidos delivery ficam prontos</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {deliveries.map((delivery) => (
            <div key={delivery.id} className="bg-white rounded-2xl border border-surface-100 p-5 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-brand-500" />
                  <span className="font-body font-semibold text-surface-900">Pedido #{delivery.order_id}</span>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-body ${STATUS_COLOR[delivery.status]}`}>
                  {STATUS_LABEL[delivery.status]}
                </span>
              </div>

              {delivery.order && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-4 text-sm font-body">
                    <span className="flex items-center gap-1.5"><User size={14} className="text-surface-200" /> {delivery.order.customer_name}</span>
                    {delivery.order.customer_phone && <span className="flex items-center gap-1.5"><Phone size={14} className="text-surface-200" /> {delivery.order.customer_phone}</span>}
                    <span className="ml-auto font-semibold text-brand-600">{formatCurrency(delivery.order.total)}</span>
                  </div>
                  {delivery.order.customer_address && (
                    <div className="flex items-start gap-2 text-sm text-surface-800 font-body bg-surface-50 rounded-xl p-3">
                      <MapPin size={14} className="flex-shrink-0 mt-0.5 text-brand-500" />
                      {delivery.order.customer_address}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-200 font-body">{formatDate(delivery.created_at)}</span>
                {delivery.status === "entregue" && (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-body font-semibold">
                    <CheckCircle2 size={14} /> Entregue
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
