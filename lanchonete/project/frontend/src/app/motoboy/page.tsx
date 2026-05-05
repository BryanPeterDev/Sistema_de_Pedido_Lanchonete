"use client";
import { useState } from "react";
import { Truck, CheckCircle2, MapPin, Phone, User, Package, Wallet, Clock, CheckCircle } from "lucide-react";
import { useDeliveries, useClaimDelivery, useUpdateDeliveryStatus } from "@/hooks/useDeliveries";
import { Spinner, Button } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import type { Delivery } from "@/types";

const ORDER_STATUS_COLOR: Record<string, string> = {
  recebido: "bg-surface-100 text-surface-800",
  preparando: "bg-amber-100 text-amber-800",
  pronto: "bg-emerald-100 text-emerald-800",
};
const ORDER_STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  preparando: "Na Cozinha",
  pronto: "Pronto para Retirar",
};

export default function MotoboyPage() {
  const { user } = useAuth();
  const { data: deliveries = [], isLoading } = useDeliveries();
  const claimMut = useClaimDelivery();
  const updateMut = useUpdateDeliveryStatus();

  const [activeTab, setActiveTab] = useState<"andamento" | "entregues">("andamento");

  function handleClaim(id: number) {
    claimMut.mutate(id, {
      onSuccess: () => toast.success("Entrega aceita! 🛵"),
      onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
    });
  }

  function handleDeliver(id: number) {
    updateMut.mutate(
      { id, status: "entregue" },
      {
        onSuccess: () => toast.success("Entrega confirmada! ✅"),
        onError: (err: any) => toast.error(err?.response?.data?.detail ?? "Erro"),
      }
    );
  }

  // Filtragem e Lógica de Ganhos
  const myDeliveries = deliveries.filter(
    (d) => (d.motoboy_id === user?.id || !d.motoboy_id) && d.order?.status !== "cancelado"
  );
  
  const andamento = myDeliveries.filter(d => d.status !== "entregue");
  const entregues = myDeliveries.filter(d => d.status === "entregue" && d.motoboy_id === user?.id);

  // Calcula ganhos apenas das corridas ENTREGUES hoje
  const earnings = entregues.reduce((total, d) => {
    let fee = 0;
    if (d.order?.items) {
      d.order.items.forEach(item => {
        if (item.product.name.toLowerCase().includes("taxa")) {
          fee += Number(item.subtotal);
        }
      });
    }
    return total + fee;
  }, 0);

  return (
    <div className="min-h-full bg-surface-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        
        {/* Earnings Card */}
        <div className="bg-white rounded-3xl p-5 border border-surface-100 shadow-sm flex items-center gap-4 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-400 font-body uppercase tracking-wider mb-0.5">Ganhos do Dia</p>
            <p className="font-display text-2xl text-surface-900">{formatCurrency(earnings)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-surface-200/50 p-1 rounded-2xl animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <button
            onClick={() => setActiveTab("andamento")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold font-body transition-all flex items-center justify-center gap-2",
              activeTab === "andamento" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            )}
          >
            <Clock size={16} /> Em Andamento
            <span className="bg-brand-100 text-brand-700 text-xs px-2 py-0.5 rounded-full">{andamento.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("entregues")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold font-body transition-all flex items-center justify-center gap-2",
              activeTab === "entregues" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"
            )}
          >
            <CheckCircle size={16} /> Entregues
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full">{entregues.length}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="space-y-4">
            {(activeTab === "andamento" ? andamento : entregues).length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Truck size={48} className="mx-auto text-surface-200" />
                <p className="font-display text-xl text-surface-800">Nenhuma entrega por aqui</p>
              </div>
            ) : (
              (activeTab === "andamento" ? andamento : entregues).map((delivery, i) => (
                <div key={delivery.id} className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-sm animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-surface-50 bg-surface-50/30">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-surface-400" />
                      <span className="font-body font-bold text-surface-900">Pedido #{delivery.order_id}</span>
                    </div>
                    {delivery.order && (
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold font-body uppercase tracking-wider ${ORDER_STATUS_COLOR[delivery.order.status] || "bg-surface-100 text-surface-600"}`}>
                        {ORDER_STATUS_LABEL[delivery.order.status] || delivery.order.status}
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {delivery.order && (
                      <>
                        <div className="flex items-start gap-2 text-sm font-body text-surface-900">
                          <User size={16} className="text-surface-300 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-bold block">{delivery.order.customer_name}</span>
                            {delivery.order.customer_phone && (
                              <a href={`tel:${delivery.order.customer_phone}`} className="text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                                <Phone size={12} /> {delivery.order.customer_phone}
                              </a>
                            )}
                          </div>
                        </div>

                        {delivery.order.customer_address && (
                          <div className="flex items-start gap-2 text-xs text-surface-800 font-body bg-surface-50 rounded-xl p-3 border border-surface-100">
                            <MapPin size={14} className="flex-shrink-0 text-brand-500 mt-0.5" />
                            <span className="leading-relaxed">{delivery.order.customer_address}</span>
                          </div>
                        )}
                        
                        {/* Order Items Summary */}
                        {delivery.order.items && delivery.order.items.length > 0 && (
                          <div className="pt-2 border-t border-surface-50">
                            <p className="text-[10px] font-bold text-surface-300 uppercase tracking-wider mb-2">Itens do Pedido</p>
                            <div className="flex flex-wrap gap-1.5">
                              {delivery.order.items.map(item => (
                                <span key={item.id} className="inline-flex bg-surface-100 text-surface-700 text-xs px-2 py-1 rounded-md font-body font-medium">
                                  {item.quantity}x {item.product.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Actions */}
                    {activeTab === "andamento" && (
                      <div className="pt-2">
                        {delivery.status === "pendente" && !delivery.motoboy_id && (
                          <Button
                            onClick={() => handleClaim(delivery.id)}
                            loading={claimMut.isPending}
                            disabled={delivery.order?.status !== "pronto"}
                            className="w-full"
                          >
                            <Truck size={16} /> Aceitar Entrega
                          </Button>
                        )}
                        {delivery.status === "saiu_para_entrega" && delivery.motoboy_id === user?.id && (
                          <Button
                            onClick={() => handleDeliver(delivery.id)}
                            loading={updateMut.isPending}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle2 size={16} /> Confirmar Entrega
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
