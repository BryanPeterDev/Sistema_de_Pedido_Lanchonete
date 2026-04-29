from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Lista de conexões ativas
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Envia uma mensagem para todos os conectados."""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Se falhar (conexão fechada sem avisar), removemos depois
                pass


# Instância global para ser usada em toda a aplicação
manager = ConnectionManager()
