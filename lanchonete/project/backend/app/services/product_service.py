from datetime import datetime
from typing import Any

from app.models.product import Product, ProductOptionGroup, ProductOptionItem
from app.models.stock_log import StockLog, StockOperation
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.stock import StockAdjust
from app.services.category_service import CategoryService
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class ProductService:
    # ── CRUD ──────────────────────────────────────────────────────────────────
    @staticmethod
    def list_all(
        db: Session,
        category_id: int | None = None,
        only_visible: bool = False,
        only_available: bool = False,
    ) -> list[Product]:
        q = db.query(Product)
        if only_visible:
            q = q.filter(Product.is_visible == True)
        if only_available:
            q = q.filter(Product.is_available == True)
        if category_id:
            q = q.filter(Product.category_id == category_id)
        return q.order_by(Product.name).all()

    @staticmethod
    def get_or_404(db: Session, product_id: int) -> Product:
        product = db.get(Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado"
            )
        return product

    @staticmethod
    def create(db: Session, payload: ProductCreate) -> Product:
        # valida categoria
        CategoryService.get_or_404(db, payload.category_id)

        option_groups_data = payload.model_dump(exclude={"option_groups"})

        product = Product(**option_groups_data)
        db.add(product)
        db.flush()  # gera o id antes do log

        if payload.option_groups:
            group_id_map = {}
            options_to_process = []
            for group_data in payload.option_groups:
                group = ProductOptionGroup(
                    product_id=product.id,
                    name=group_data.name,
                    option_type=group_data.option_type,
                    is_required=group_data.is_required,
                    min_selections=group_data.min_selections,
                    max_selections=group_data.max_selections,
                )
                db.add(group)
                db.flush()
                if group_data.id:
                    group_id_map[group_data.id] = group.id

                for option_data in group_data.options:
                    options_to_process.append((group.id, option_data))

            for g_id, o_data in options_to_process:
                target_id = o_data.target_group_id
                if target_id and target_id in group_id_map:
                    target_id = group_id_map[target_id]

                option = ProductOptionItem(
                    group_id=g_id,
                    name=o_data.name,
                    price_adjustment=o_data.price_adjustment,
                    target_group_id=target_id,
                    target_max_value=o_data.target_max_value,
                )
                db.add(option)

        # log de estoque inicial
        if product.stock_quantity > 0:
            log = StockLog(
                product_id=product.id,
                operation=StockOperation.entrada,
                delta=product.stock_quantity,
                quantity_before=0,
                quantity_after=product.stock_quantity,
                reason="Estoque inicial no cadastro",
            )
            db.add(log)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update(db: Session, product_id: int, payload: ProductUpdate) -> Product:
        product = ProductService.get_or_404(db, product_id)
        if payload.category_id:
            CategoryService.get_or_404(db, payload.category_id)
        update_data = payload.model_dump(exclude_unset=True, exclude={"option_groups"})
        for field, value in update_data.items():
            setattr(product, field, value)

        if payload.option_groups is not None:
            # Delete existing option groups and recreate
            db.query(ProductOptionGroup).filter(
                ProductOptionGroup.product_id == product.id
            ).delete()
            db.flush()

            group_id_map = {}
            options_to_process = []
            for group_data in payload.option_groups:
                group = ProductOptionGroup(
                    product_id=product.id,
                    name=group_data.name,
                    option_type=group_data.option_type,
                    is_required=group_data.is_required,
                    min_selections=group_data.min_selections,
                    max_selections=group_data.max_selections,
                )
                db.add(group)
                db.flush()
                if group_data.id:
                    group_id_map[group_data.id] = group.id

                for option_data in group_data.options:
                    options_to_process.append((group.id, option_data))

            for g_id, o_data in options_to_process:
                target_id = o_data.target_group_id
                if target_id and target_id in group_id_map:
                    target_id = group_id_map[target_id]

                option = ProductOptionItem(
                    group_id=g_id,
                    name=o_data.name,
                    price_adjustment=o_data.price_adjustment,
                    target_group_id=target_id,
                    target_max_value=o_data.target_max_value,
                )
                db.add(option)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete(db: Session, product_id: int) -> None:
        product = ProductService.get_or_404(db, product_id)
        # soft delete: apenas torna invisível e indisponível
        product.is_visible = False
        product.is_available = False
        db.commit()

    # ── Estoque ───────────────────────────────────────────────────────────────
    @staticmethod
    def adjust_stock(
        db: Session,
        product_id: int,
        payload: StockAdjust,
        performed_by: int | None = None,
        order_id: int | None = None,
    ) -> Product:
        product = ProductService.get_or_404(db, product_id)

        quantity_before = product.stock_quantity
        quantity_after = quantity_before + payload.delta

        if quantity_after < 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Estoque insuficiente: disponível {quantity_before}, solicitado {abs(payload.delta)}",
            )

        product.stock_quantity = quantity_after

        log = StockLog(
            product_id=product.id,
            operation=payload.operation,
            delta=payload.delta,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            reason=payload.reason,
            order_id=order_id,
            performed_by=performed_by,
        )
        db.add(log)
        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def list_stock_logs(db: Session, product_id: int) -> list[StockLog]:
        ProductService.get_or_404(db, product_id)
        return (
            db.query(StockLog)
            .filter(StockLog.product_id == product_id)
            .order_by(StockLog.created_at.desc())
            .all()
        )

    @staticmethod
    def low_stock_products(db: Session) -> list[Product]:
        """Retorna produtos cujo estoque está no ou abaixo do threshold de alerta."""
        return (
            db.query(Product)
            .filter(Product.stock_quantity <= Product.stock_alert_threshold)
            .filter(Product.is_visible == True)  # noqa: E712
            .order_by(Product.stock_quantity.asc())
            .all()
        )


