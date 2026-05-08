from app.api.v1 import (
    analytics,
    auth,
    categories,
    chat,
    deliveries,
    orders,
    products,
    users,
    webhooks,
    websockets,
)
from fastapi import APIRouter

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(categories.router, prefix="/categories", tags=["categories"])
router.include_router(products.router, prefix="/products", tags=["products"])
router.include_router(orders.router, prefix="/orders", tags=["orders"])
router.include_router(deliveries.router, prefix="/deliveries", tags=["deliveries"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
router.include_router(websockets.router, prefix="/ws", tags=["websockets"])
router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
