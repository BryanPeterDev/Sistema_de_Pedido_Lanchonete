"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Delivery, DeliveryStatus } from "@/types";

export function useDeliveries(params?: { only_current_register?: boolean }) {
  return useQuery<Delivery[]>({
    queryKey: ["deliveries", params],
    queryFn: () => api.get("/deliveries", { params }).then((r) => r.data),
  });
}

export function useClaimDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api.post(`/deliveries/${id}/claim`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries"] }),
  });
}

export function useUpdateDeliveryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: number; status: DeliveryStatus; notes?: string }) =>
      api.patch(`/deliveries/${id}/status`, { status, notes }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries"] }),
  });
}
