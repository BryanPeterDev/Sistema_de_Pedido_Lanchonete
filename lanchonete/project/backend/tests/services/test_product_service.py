"""
test_product_service.py — Testes unitários do ProductService.

Cobre: list_all, get_or_404, create, update, delete (soft),
       adjust_stock, list_stock_logs, low_stock_products, is_promotion_active.
"""

from decimal import Decimal
from unittest.mock import patch

import pytest

from app.models.stock_log import StockOperation
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.stock import StockAdjust
from app.services.product_service import ProductService
from fastapi import HTTPException


def _product_payload(category_id: int, name: str = "Produto Teste", stock: int = 5) -> ProductCreate:
    return ProductCreate(
        name=name,
        description="Descrição",
        price=Decimal("15.00"),
        category_id=category_id,
        stock_quantity=stock,
        stock_alert_threshold=2,
        is_visible=True,
        is_available=True,
    )


class TestProductServiceCRUD:
    def test_create_product_success(self, db, sample_category):
        product = ProductService.create(db, _product_payload(sample_category.id))

        assert product.id is not None
        assert product.name == "Produto Teste"
        assert product.stock_quantity == 5

    def test_create_product_with_initial_stock_logs(self, db, sample_category):
        from app.models.stock_log import StockLog

        product = ProductService.create(
            db, _product_payload(sample_category.id, name="ComEstoque", stock=3)
        )
        logs = db.query(StockLog).filter_by(product_id=product.id).all()

        assert len(logs) == 1
        assert logs[0].operation == StockOperation.entrada
        assert logs[0].delta == 3

    def test_create_product_zero_stock_no_log(self, db, sample_category):
        from app.models.stock_log import StockLog

        product = ProductService.create(
            db, _product_payload(sample_category.id, name="SemEstoque", stock=0)
        )
        logs = db.query(StockLog).filter_by(product_id=product.id).all()
        assert len(logs) == 0

    def test_create_product_invalid_category_raises_404(self, db):
        with pytest.raises(HTTPException) as exc:
            ProductService.create(db, _product_payload(category_id=99999))
        assert exc.value.status_code == 404

    def test_get_or_404_found(self, db, sample_product):
        found = ProductService.get_or_404(db, sample_product.id)
        assert found.id == sample_product.id

    def test_get_or_404_not_found(self, db):
        with pytest.raises(HTTPException) as exc:
            ProductService.get_or_404(db, 99999)
        assert exc.value.status_code == 404

    def test_list_all_visible(self, db, sample_product):
        products = ProductService.list_all(db, only_visible=True)
        ids = [p.id for p in products]
        assert sample_product.id in ids

    def test_list_all_hidden_not_returned(self, db, sample_product):
        sample_product.is_visible = False
        db.commit()

        products = ProductService.list_all(db, only_visible=True)
        ids = [p.id for p in products]
        assert sample_product.id not in ids

    def test_update_product_name(self, db, sample_product):
        updated = ProductService.update(
            db, sample_product.id, ProductUpdate(name="Novo Nome")
        )
        assert updated.name == "Novo Nome"

    def test_update_product_price(self, db, sample_product):
        updated = ProductService.update(
            db, sample_product.id, ProductUpdate(price=Decimal("99.99"))
        )
        assert updated.price == Decimal("99.99")

    def test_delete_soft(self, db, sample_product):
        ProductService.delete(db, sample_product.id)
        db.refresh(sample_product)

        assert sample_product.is_visible is False
        assert sample_product.is_available is False


class TestProductServiceStock:
    def test_adjust_stock_entrada(self, db, sample_product):
        before = sample_product.stock_quantity
        payload = StockAdjust(delta=5, operation=StockOperation.entrada, reason="Reposição")

        updated = ProductService.adjust_stock(db, sample_product.id, payload)

        assert updated.stock_quantity == before + 5

    def test_adjust_stock_saida(self, db, sample_product):
        before = sample_product.stock_quantity
        payload = StockAdjust(delta=-3, operation=StockOperation.saida, reason="Venda")

        updated = ProductService.adjust_stock(db, sample_product.id, payload)

        assert updated.stock_quantity == before - 3

    def test_adjust_stock_insufficient_raises_409(self, db, sample_product):
        grande_saida = -(sample_product.stock_quantity + 100)
        payload = StockAdjust(delta=grande_saida, operation=StockOperation.saida, reason="Erro")

        with pytest.raises(HTTPException) as exc:
            ProductService.adjust_stock(db, sample_product.id, payload)

        assert exc.value.status_code == 409

    def test_adjust_stock_creates_log(self, db, sample_product):
        from app.models.stock_log import StockLog

        payload = StockAdjust(delta=2, operation=StockOperation.entrada, reason="Teste log")
        ProductService.adjust_stock(db, sample_product.id, payload)

        logs = db.query(StockLog).filter_by(product_id=sample_product.id).all()
        assert any(log.reason == "Teste log" for log in logs)

    def test_list_stock_logs_ordered_desc(self, db, sample_product):
        p1 = StockAdjust(delta=1, operation=StockOperation.entrada, reason="1")
        p2 = StockAdjust(delta=1, operation=StockOperation.entrada, reason="2")
        ProductService.adjust_stock(db, sample_product.id, p1)
        ProductService.adjust_stock(db, sample_product.id, p2)

        logs = ProductService.list_stock_logs(db, sample_product.id)

        assert logs[0].created_at >= logs[-1].created_at

    def test_low_stock_products(self, db, sample_category):
        """Produto com estoque <= threshold deve aparecer na lista."""
        low = ProductService.create(
            db,
            ProductCreate(
                name="Baixo Estoque",
                price=Decimal("5.00"),
                category_id=sample_category.id,
                stock_quantity=1,
                stock_alert_threshold=5,
                is_visible=True,
                is_available=True,
            ),
        )
        result = ProductService.low_stock_products(db)
        ids = [p.id for p in result]
        assert low.id in ids


class TestProductServicePromotion:
    def _make_item(self, is_promotional, promotional_price, active_days=None):
        """Helper que cria um objeto simples simulando Product ou ProductOptionItem."""

        class FakeItem:
            pass

        item = FakeItem()
        item.is_promotional = is_promotional
        item.promotional_price = promotional_price
        item.promotion_active_days = active_days
        return item

    def test_no_promotion_returns_false(self):
        item = self._make_item(False, None)
        assert ProductService.is_promotion_active(item) is False

    def test_promotion_without_price_returns_false(self):
        item = self._make_item(True, None)
        assert ProductService.is_promotion_active(item) is False

    def test_promotion_all_days_returns_true(self):
        item = self._make_item(True, Decimal("10.00"), active_days=None)
        assert ProductService.is_promotion_active(item) is True

    def test_promotion_correct_day_returns_true(self):
        from datetime import datetime

        today = str(datetime.now().weekday())
        item = self._make_item(True, Decimal("10.00"), active_days=today)
        assert ProductService.is_promotion_active(item) is True

    def test_promotion_wrong_day_returns_false(self):
        from datetime import datetime

        today = datetime.now().weekday()
        wrong_day = str((today + 1) % 7)
        item = self._make_item(True, Decimal("10.00"), active_days=wrong_day)
        assert ProductService.is_promotion_active(item) is False
