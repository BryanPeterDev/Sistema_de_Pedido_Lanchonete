"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

function WebSocketInitializer() {
  useWebSocket();
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: Infinity, // Confia 100% no WebSocket para invalidar o cache
            refetchOnWindowFocus: false, // Desabilita o recarregamento ao voltar para a aba
          },
        },
      })
  );
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketInitializer />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-body)",
            borderRadius: "16px",
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
