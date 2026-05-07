"""
test_category_service.py — Testes unitários do CategoryService.

Cobre: list_all, get_or_404, create, update, delete.
"""

import pytest

from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.services.category_service import CategoryService
from fastapi import HTTPException


class TestCategoryServiceCreate:
    def test_create_category_success(self, db):
        payload = CategoryCreate(name="Bebidas", is_active=True)
        cat = CategoryService.create(db, payload)

        assert cat.id is not None
        assert cat.name == "Bebidas"
        assert cat.is_active is True

    def test_create_duplicate_name_raises_409(self, db):
        CategoryService.create(db, CategoryCreate(name="Sobremesas"))

        with pytest.raises(HTTPException) as exc:
            CategoryService.create(db, CategoryCreate(name="Sobremesas"))

        assert exc.value.status_code == 409


class TestCategoryServiceRead:
    def test_list_all_returns_only_active(self, db):
        CategoryService.create(db, CategoryCreate(name="Ativa", is_active=True))
        cat2 = CategoryService.create(db, CategoryCreate(name="Inativa", is_active=False))
        cat2.is_active = False
        db.commit()

        result = CategoryService.list_all(db, only_active=True)
        names = [c.name for c in result]

        assert "Ativa" in names
        assert "Inativa" not in names

    def test_list_all_returns_all_when_flag_false(self, db):
        CategoryService.create(db, CategoryCreate(name="Todas1"))
        cat2 = Category(name="Todas2", is_active=False)
        db.add(cat2)
        db.commit()

        result = CategoryService.list_all(db, only_active=False)
        assert len(result) >= 2

    def test_get_or_404_returns_existing(self, db):
        cat = CategoryService.create(db, CategoryCreate(name="Achada"))
        found = CategoryService.get_or_404(db, cat.id)
        assert found.id == cat.id

    def test_get_or_404_raises_404(self, db):
        with pytest.raises(HTTPException) as exc:
            CategoryService.get_or_404(db, 99999)
        assert exc.value.status_code == 404


class TestCategoryServiceUpdate:
    def test_update_category_name(self, db):
        cat = CategoryService.create(db, CategoryCreate(name="Antes"))
        updated = CategoryService.update(db, cat.id, CategoryUpdate(name="Depois"))
        assert updated.name == "Depois"

    def test_update_category_status(self, db):
        cat = CategoryService.create(db, CategoryCreate(name="AtualizaStatus", is_active=True))
        updated = CategoryService.update(db, cat.id, CategoryUpdate(is_active=False))
        assert updated.is_active is False


class TestCategoryServiceDelete:
    def test_delete_category_without_products(self, db):
        cat = CategoryService.create(db, CategoryCreate(name="ParaDeletar"))
        CategoryService.delete(db, cat.id)

        with pytest.raises(HTTPException) as exc:
            CategoryService.get_or_404(db, cat.id)
        assert exc.value.status_code == 404

    def test_delete_category_with_products_raises_409(self, db, sample_category, sample_product):
        with pytest.raises(HTTPException) as exc:
            CategoryService.delete(db, sample_category.id)
        assert exc.value.status_code == 409
