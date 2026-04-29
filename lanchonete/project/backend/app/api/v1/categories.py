from typing import Annotated

from app.core.database import get_db
from app.core.deps import AdminUser
from app.schemas.category import CategoryCreate, CategoryPublic, CategoryUpdate
from app.services.category_service import CategoryService
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

router = APIRouter()

Db = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CategoryPublic])
def list_categories(
    db: Db,
    only_active: bool = Query(default=True),
):
    return CategoryService.list_all(db, only_active=only_active)


@router.get("/{category_id}", response_model=CategoryPublic)
def get_category(category_id: int, db: Db):
    return CategoryService.get_or_404(db, category_id)


@router.post("", response_model=CategoryPublic, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: Db, _: AdminUser):
    return CategoryService.create(db, payload)


@router.patch("/{category_id}", response_model=CategoryPublic)
def update_category(category_id: int, payload: CategoryUpdate, db: Db, _: AdminUser):
    return CategoryService.update(db, category_id, payload)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Db, _: AdminUser):
    CategoryService.delete(db, category_id)
