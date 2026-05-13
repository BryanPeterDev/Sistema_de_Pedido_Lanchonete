import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { OrderStatus, OrderType, Promotion } from "@/types";

export function getActivePrice(id: number, basePrice: string | number, activePromotions: Promotion[], type: "product" | "option"): number {
  const promo = activePromotions.find(p => type === "product" ? (p.product_id === id && !p.option_item_id) : (p.option_item_id === id));
  if (promo) return Number(promo.discount_value);
  return Number(basePrice);
}

export function getPromotion(id: number, activePromotions: Promotion[], type: "product" | "option"): Promotion | undefined {
  return activePromotions.find(p => type === "product" ? (p.product_id === id && !p.option_item_id) : (p.option_item_id === id));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export function formatDate(date: string): string {
  return format(new Date(date), "dd 'de' MMM, HH:mm", { locale: ptBR });
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  pronto: "Pronto",
  a_caminho: "A caminho",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  recebido: "bg-blue-100 text-blue-800",
  preparando: "bg-amber-100 text-amber-800",
  pronto: "bg-emerald-100 text-emerald-800",
  a_caminho: "bg-purple-100 text-purple-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  delivery: "🛵 Delivery",
  retirada: "🏪 Retirada",
  local: "🍽️ No local",
};

export const ORDER_TYPE_COLOR: Record<OrderType, string> = {
  delivery: "bg-violet-100 text-violet-800",
  retirada: "bg-cyan-100 text-cyan-800",
  local: "bg-orange-100 text-orange-800",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "📱 Pix",
  cartao: "💳 Cartão",
  dinheiro: "💵 Dinheiro",
  nao_pago: "❌ Não Pago",
};


export function getImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const baseUrl = apiUrl.replace("/api/v1", "");
  return `${baseUrl}/ImagensProdutos/${imagePath}`;
}
