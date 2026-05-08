"use client";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface DashboardSummary {
  register_id: number;
  opened_at: string;
  closed_at: string | null;
  total_revenue: number;
  total_delivery_fees: number;
  total_products: number;
  avg_ticket: number;
  total_orders: number;
  total_cancelled: number;
  total_delivery: number;
  total_local: number;
  total_retirada: number;
  total_dinheiro: number;
  total_pix: number;
  total_cartao: number;
}

export interface SalesByHourItem {
  hour: number;
  total_orders: number;
  total_revenue: number;
}

export interface TopProductItem {
  product_id: number;
  product_name: string;
  category_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface PaymentBreakdownItem {
  payment_method: string;
  total: number;
  count: number;
}

export interface DeliveryStats {
  total_deliveries: number;
  total_delivery_fees: number;
  avg_delivery_time_minutes: number | null;
}

function withRegister(registerId?: number) {
  return registerId ? { register_id: registerId } : {};
}

export function useDashboardSummary(registerId?: number) {
  return useQuery<DashboardSummary>({
    queryKey: ["analytics", "summary", registerId],
    queryFn: () =>
      api
        .get("/analytics/dashboard/summary", { params: withRegister(registerId) })
        .then((r) => r.data),
    retry: false,
  });
}

export function useSalesByHour(registerId?: number) {
  return useQuery<SalesByHourItem[]>({
    queryKey: ["analytics", "sales-by-hour", registerId],
    queryFn: () =>
      api
        .get("/analytics/dashboard/sales-by-hour", { params: withRegister(registerId) })
        .then((r) => r.data),
    retry: false,
  });
}

export function useTopProducts(registerId?: number, limit = 10) {
  return useQuery<TopProductItem[]>({
    queryKey: ["analytics", "top-products", registerId, limit],
    queryFn: () =>
      api
        .get("/analytics/dashboard/top-products", {
          params: { ...withRegister(registerId), limit },
        })
        .then((r) => r.data),
    retry: false,
  });
}

export function usePaymentBreakdown(registerId?: number) {
  return useQuery<PaymentBreakdownItem[]>({
    queryKey: ["analytics", "payment-breakdown", registerId],
    queryFn: () =>
      api
        .get("/analytics/dashboard/payment-breakdown", { params: withRegister(registerId) })
        .then((r) => r.data),
    retry: false,
  });
}

export function useDeliveryStats(registerId?: number) {
  return useQuery<DeliveryStats>({
    queryKey: ["analytics", "delivery-stats", registerId],
    queryFn: () =>
      api
        .get("/analytics/dashboard/delivery-stats", { params: withRegister(registerId) })
        .then((r) => r.data),
    retry: false,
  });
}
export interface ManagementSummary {
  total_revenue: number;
  total_delivery_fees: number;
  total_products: number;
  avg_ticket: number;
  total_orders: number;
  total_cancelled: number;
  total_delivery: number;
  total_local: number;
  total_retirada: number;
  total_dinheiro: number;
  total_pix: number;
  total_cartao: number;
  count_registers: number;
  start_date: string | null;
  end_date: string | null;
}

export function useManagementSummary(fromDate?: string, toDate?: string) {
  return useQuery<ManagementSummary>({
    queryKey: ["analytics", "management-summary", fromDate, toDate],
    queryFn: () =>
      api
        .get("/analytics/dashboard/management-summary", {
          params: { from_date: fromDate, to_date: toDate },
        })
        .then((r) => r.data),
    retry: false,
  });
}
