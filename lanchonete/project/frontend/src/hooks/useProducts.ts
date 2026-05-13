"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Product, Category } from "@/types";

export function useProducts(categoryId?: number, onlyVisible?: boolean) {
  return useQuery<Product[]>({
    queryKey: ["products", categoryId, onlyVisible],
    queryFn: async () => {
      const params: any = {};
      if (categoryId !== undefined) params.category_id = categoryId;
      if (onlyVisible !== undefined) params.only_visible = onlyVisible;

      const { data } = await api.get("/products", { params });
      return data;
    },
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });
}

export function useLowStock() {
  return useQuery<Product[]>({
    queryKey: ["products", "low-stock"],
    queryFn: () => api.get("/products/low-stock").then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData | object) => api.post("/products", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      api.patch(`/products/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      delta,
      reason,
    }: {
      id: number;
      delta: number;
      reason?: string;
    }) =>
      api
        .post(`/products/${id}/stock`, { delta, operation: "ajuste", reason })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}
