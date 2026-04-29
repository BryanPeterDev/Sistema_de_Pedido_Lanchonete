"use client";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const qc = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Constrói a URL do WebSocket a partir da URL da API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const wsUrl = apiUrl.replace("http", "ws") + "/ws";

    function connect() {
      console.log("Conectando ao WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "orders_update") {
            console.log("Atualização de pedidos recebida via WebSocket");
            // Invalida as queries de pedidos para forçar o refetch
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["kitchen-orders"] });
            qc.invalidateQueries({ queryKey: ["admin-kitchen"] });
            qc.invalidateQueries({ queryKey: ["deliveries"] });
          }
        } catch (err) {
          console.error("Erro ao processar mensagem do WebSocket", err);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket desconectado. Tentando reconectar em 5s...");
        setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("Erro no WebSocket:", err);
        ws.close();
      };

      socketRef.current = ws;
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [qc]);
}
