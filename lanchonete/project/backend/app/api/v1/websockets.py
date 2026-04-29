from app.core.websocket import manager
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Mantém a conexão aberta e aguarda mensagens (embora o cliente não precise enviar nada)
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
