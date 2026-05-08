"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

export interface CashRegister {
  id: number;
  status: "aberto" | "fechado";
  opened_at: string;
  closed_at: string | null;
  opened_by_id: number;
  closed_by_id: number | null;
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
  opening_cash: number;
  closing_cash: number | null;
  notes: string | null;
}

export function useCashRegisterCurrent() {
  return useQuery<CashRegister | null>({
    queryKey: ["cash-register", "current"],
    queryFn: () => api.get("/analytics/cash-register/current").then((r) => r.data),
  });
}

export function useCashRegisterLastClosed() {
  return useQuery<CashRegister>({
    queryKey: ["cash-register", "last-closed"],
    queryFn: () => api.get("/analytics/cash-register/last-closed").then((r) => r.data),
    retry: false,
  });
}

export function useCashRegisterHistory(limit = 30) {
  return useQuery<CashRegister[]>({
    queryKey: ["cash-register", "history", limit],
    queryFn: () =>
      api.get("/analytics/cash-register/history", { params: { limit } }).then((r) => r.data),
  });
}

export function useOpenCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { opening_cash: number; notes?: string }) =>
      api.post("/analytics/cash-register/open", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-register"] });
    },
  });
}

export function useCloseCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { closing_cash: number; notes?: string }) =>
      api.post("/analytics/cash-register/close", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cash-register"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
