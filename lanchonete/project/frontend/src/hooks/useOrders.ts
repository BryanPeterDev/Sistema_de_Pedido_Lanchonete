"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Order, OrderList, OrderStatus, AttendantOrderPayload } from "@/types";

export function useOrders(status?: OrderStatus, onlyCurrentRegister: boolean = false, registerId?: number) {
  return useQuery<OrderList[]>({
    queryKey: ["orders", status, onlyCurrentRegister, registerId],
    queryFn: async () => {
      const params: any = {};
      if (status) params.order_status = status;
      if (onlyCurrentRegister) params.only_current_register = true;
      if (registerId) params.register_id = registerId;
      
      const { data } = await api.get("/orders", { params });
      return data;
    },
  });
}

export function useOrder(id: number) {
  return useQuery<Order>({
    queryKey: ["orders", id],
    queryFn: async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendantOrderPayload) =>
      api.post("/orders", payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      api.put(`/orders/${id}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}
