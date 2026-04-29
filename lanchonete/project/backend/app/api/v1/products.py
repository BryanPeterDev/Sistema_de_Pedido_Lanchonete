from typing import Annotated

from app.core.database import get_db
from app.core.deps import AdminUser
from app.schemas.product import ProductCreate, ProductPublic, ProductUpdate
from app.schemas.stock import StockAdjust, StockLogPublic
from app.services.product_service import ProductService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ProductPublic])
def list_products(
    db: Db,
    category_id: int | None = Query(default=None),
    only_available: bool = Query(default=False),
):
    """Cardápio público — retorna apenas produtos visíveis."""
    return ProductService.list_all(db, category_id=category_id, only_available=only_available)


@router.get("/low-stock", response_model=list[ProductPublic])
def low_stock(db: Db, _: AdminUser):
    """Produtos com estoque abaixo do threshold. Admin only."""
    return ProductService.low_stock_products(db)


@router.get("/{product_id}", response_model=ProductPublic)
def get_product(product_id: int, db: Db):
    return ProductService.get_or_404(db, product_id)


@router.post("", response_model=ProductPublic, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Db, _: AdminUser):
    return ProductService.create(db, payload)


@router.patch("/{product_id}", response_model=ProductPublic)
def update_product(product_id: int, payload: ProductUpdate, db: Db, _: AdminUser):
    return ProductService.update(db, product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Db, _: AdminUser):
    """Soft delete: marca como invisível e indisponível."""
    ProductService.delete(db, product_id)


# ── Estoque ───────────────────────────────────────────────────────────────────


@router.post("/{product_id}/stock", response_model=ProductPublic)
def adjust_stock(
    product_id: int,
    payload: StockAdjust,
    db: Db,
    current_user: AdminUser,
):
    return ProductService.adjust_stock(db, product_id, payload, performed_by=current_user.id)


@router.get("/{product_id}/stock/logs", response_model=list[StockLogPublic])
def stock_logs(product_id: int, db: Db, _: AdminUser):
    return ProductService.list_stock_logs(db, product_id)
