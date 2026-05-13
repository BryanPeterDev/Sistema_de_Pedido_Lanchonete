from typing import Annotated

from app.core.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.schemas.promotion import PromotionCreate, PromotionPublic, PromotionUpdate
from app.services.promotion_service import PromotionService
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

router = APIRouter()
Db = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[PromotionPublic])
def list_promotions(db: Db, _: CurrentUser):
    """Lista todas as promoções (ativas e inativas)."""
    return PromotionService.list_all(db)


@router.get("/active", response_model=list[PromotionPublic])
def list_active_promotions(db: Db, _: CurrentUser):
    """Lista apenas as promoções vigentes neste momento."""
    return PromotionService.get_active_promotions(db)


@router.post("", response_model=PromotionPublic, status_code=status.HTTP_201_CREATED)
def create_promotion(payload: PromotionCreate, db: Db, _: AdminUser):
    """Cria uma nova promoção."""
    return PromotionService.create(db, payload)


@router.get("/{promo_id}", response_model=PromotionPublic)
def get_promotion(promo_id: int, db: Db, _: CurrentUser):
    """Retorna detalhes de uma promoção."""
    return PromotionService.get_or_404(db, promo_id)


@router.put("/{promo_id}", response_model=PromotionPublic)
def update_promotion(promo_id: int, payload: PromotionUpdate, db: Db, _: AdminUser):
    """Atualiza uma promoção existente."""
    return PromotionService.update(db, promo_id, payload)


@router.delete("/{promo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_promotion(promo_id: int, db: Db, _: AdminUser):
    """Remove uma promoção do sistema."""
    PromotionService.delete(db, promo_id)
