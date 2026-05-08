"""
Service de Fechamento de Caixa.

Responsável por toda a lógica de negócio:
- Abrir / fechar caixa
- Consolidar dados dos pedidos no fechamento
- Calcular totais financeiros
"""

from datetime import UTC, datetime
from decimal import Decimal

from app.models.cash_register import CashRegister, CashRegisterStatus
from app.models.order import Order, OrderStatus, OrderType, PaymentMethod
from fastapi import HTTPException, status
from sqlalchemy.orm import Session


class CashRegisterService:

    # ── Abertura ───────────────────────────────────────────────────────────────

    @staticmethod
    def open(db: Session, opened_by_id: int, opening_cash: Decimal = Decimal("0"), notes: str | None = None) -> CashRegister:
        """Abre um novo caixa. Falha se já houver um caixa aberto."""
        existing = (
            db.query(CashRegister)
            .filter(CashRegister.status == CashRegisterStatus.aberto)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Já existe um caixa aberto. Feche-o antes de abrir um novo.",
            )

        now = datetime.now(UTC)
        register = CashRegister(
            status=CashRegisterStatus.aberto,
            opened_by_id=opened_by_id,
            opened_at=now,
            opening_cash=opening_cash,
            notes=notes,
        )
        db.add(register)
        db.commit()
        db.refresh(register)
        return register

    # ── Fechamento ─────────────────────────────────────────────────────────────

    @staticmethod
    def close(db: Session, closed_by_id: int, closing_cash: Decimal, notes: str | None = None) -> CashRegister:
        """Fecha o caixa atual e consolida os dados dos pedidos do período."""
        register = (
            db.query(CashRegister)
            .filter(CashRegister.status == CashRegisterStatus.aberto)
            .first()
        )
        if not register:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum caixa aberto encontrado.",
            )

        now = datetime.now(UTC)

        # Busca todos os pedidos criados desde a abertura do caixa
        orders = (
            db.query(Order)
            .filter(Order.created_at >= register.opened_at)
            .filter(Order.created_at <= now)
            .all()
        )

        # Consolida os totais
        totals = CashRegisterService._consolidate(orders)

        # Atualiza o caixa
        register.status = CashRegisterStatus.fechado
        register.closed_by_id = closed_by_id
        register.closed_at = now
        register.closing_cash = closing_cash
        register.notes = notes or register.notes

        register.total_revenue = totals["total_revenue"]
        register.total_delivery_fees = totals["total_delivery_fees"]
        register.total_products = totals["total_products"]
        register.avg_ticket = totals["avg_ticket"]
        register.total_orders = totals["total_orders"]
        register.total_cancelled = totals["total_cancelled"]
        register.total_delivery = totals["total_delivery"]
        register.total_local = totals["total_local"]
        register.total_retirada = totals["total_retirada"]
        register.total_dinheiro = totals["total_dinheiro"]
        register.total_pix = totals["total_pix"]
        register.total_cartao = totals["total_cartao"]

        db.commit()
        db.refresh(register)
        return register

    # ── Consultas ──────────────────────────────────────────────────────────────

    @staticmethod
    def get_current_open(db: Session) -> CashRegister | None:
        return (
            db.query(CashRegister)
            .filter(CashRegister.status == CashRegisterStatus.aberto)
            .first()
        )

    @staticmethod
    def get_last_closed(db: Session) -> CashRegister:
        register = (
            db.query(CashRegister)
            .filter(CashRegister.status == CashRegisterStatus.fechado)
            .order_by(CashRegister.closed_at.desc())
            .first()
        )
        if not register:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Nenhum caixa fechado encontrado. Abra e feche o caixa primeiro.",
            )
        return register

    @staticmethod
    def get_history(db: Session, limit: int = 30) -> list[CashRegister]:
        return (
            db.query(CashRegister)
            .filter(CashRegister.status == CashRegisterStatus.fechado)
            .order_by(CashRegister.closed_at.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_or_404(db: Session, register_id: int) -> CashRegister:
        register = db.get(CashRegister, register_id)
        if not register:
            raise HTTPException(status_code=404, detail="Caixa não encontrado.")
        return register

    # ── Analytics por caixa ────────────────────────────────────────────────────

    @staticmethod
    def get_orders_for_register(db: Session, register: CashRegister) -> list[Order]:
        """Retorna os pedidos do período do caixa."""
        q = db.query(Order).filter(Order.created_at >= register.opened_at)
        if register.closed_at:
            q = q.filter(Order.created_at <= register.closed_at)
        return q.all()

    @staticmethod
    def sales_by_hour(db: Session, register: CashRegister) -> list[dict]:
        """Agrupa pedidos não cancelados por hora do dia."""
        orders = CashRegisterService.get_orders_for_register(db, register)
        buckets: dict[int, dict] = {h: {"hour": h, "total_orders": 0, "total_revenue": Decimal("0")} for h in range(24)}

        for o in orders:
            if o.status == OrderStatus.cancelado:
                continue
            h = o.created_at.hour
            buckets[h]["total_orders"] += 1
            buckets[h]["total_revenue"] += o.total

        return list(buckets.values())

    @staticmethod
    def top_products(db: Session, register: CashRegister, limit: int = 10) -> list[dict]:
        """Top produtos por quantidade vendida."""
        orders = CashRegisterService.get_orders_for_register(db, register)
        product_map: dict[int, dict] = {}

        for order in orders:
            if order.status == OrderStatus.cancelado:
                continue
            for item in order.items:
                pid = item.product_id
                if pid not in product_map:
                    product_map[pid] = {
                        "product_id": pid,
                        "product_name": item.product.name,
                        "category_name": item.product.category.name if item.product.category else "",
                        "total_quantity": 0,
                        "total_revenue": Decimal("0"),
                    }
                product_map[pid]["total_quantity"] += item.quantity
                product_map[pid]["total_revenue"] += item.unit_price * item.quantity

        sorted_products = sorted(product_map.values(), key=lambda x: x["total_quantity"], reverse=True)
        return sorted_products[:limit]

    @staticmethod
    def payment_breakdown(db: Session, register: CashRegister) -> list[dict]:
        """Totais por forma de pagamento."""
        orders = CashRegisterService.get_orders_for_register(db, register)
        breakdown: dict[str, dict] = {}

        for o in orders:
            if o.status == OrderStatus.cancelado:
                continue
            pm = o.payment_method.value
            if pm not in breakdown:
                breakdown[pm] = {"payment_method": pm, "total": Decimal("0"), "count": 0}
            breakdown[pm]["total"] += o.total
            breakdown[pm]["count"] += 1

        return list(breakdown.values())

    @staticmethod
    def delivery_stats(db: Session, register: CashRegister) -> dict:
        """Estatísticas de entrega."""
        orders = CashRegisterService.get_orders_for_register(db, register)
        delivery_orders = [o for o in orders if o.order_type == OrderType.delivery and o.status != OrderStatus.cancelado]

        total_deliveries = len(delivery_orders)
        total_fees = sum(o.delivery_fee for o in delivery_orders)

        # Tempo médio de entrega (prepared_at → delivered_at)
        times = []
        for o in delivery_orders:
            if o.prepared_at and o.delivered_at:
                delta = (o.delivered_at - o.prepared_at).total_seconds() / 60
                times.append(delta)

        avg_time = round(sum(times) / len(times), 1) if times else None

        return {
            "total_deliveries": total_deliveries,
            "total_delivery_fees": total_fees,
            "avg_delivery_time_minutes": avg_time,
        }

    # ── Consolidação interna ───────────────────────────────────────────────────

    @staticmethod
    def _consolidate(orders: list[Order]) -> dict:
        """Calcula todos os totais para um conjunto de pedidos."""
        total_revenue = Decimal("0")
        total_delivery_fees = Decimal("0")
        total_dinheiro = Decimal("0")
        total_pix = Decimal("0")
        total_cartao = Decimal("0")

        total_orders = 0
        total_cancelled = 0
        total_delivery = 0
        total_local = 0
        total_retirada = 0

        for o in orders:
            if o.status == OrderStatus.cancelado:
                total_cancelled += 1
                continue

            total_orders += 1
            total_revenue += o.total
            total_delivery_fees += o.delivery_fee or Decimal("0")

            # Por tipo
            if o.order_type == OrderType.delivery:
                total_delivery += 1
            elif o.order_type == OrderType.local:
                total_local += 1
            elif o.order_type == OrderType.retirada:
                total_retirada += 1

            # Por pagamento
            if o.payment_method == PaymentMethod.dinheiro:
                total_dinheiro += o.total
            elif o.payment_method == PaymentMethod.pix:
                total_pix += o.total
            elif o.payment_method == PaymentMethod.cartao:
                total_cartao += o.total

        total_products = total_revenue - total_delivery_fees
        avg_ticket = total_revenue / total_orders if total_orders > 0 else Decimal("0")

        return {
            "total_revenue": total_revenue,
            "total_delivery_fees": total_delivery_fees,
            "total_products": total_products,
            "avg_ticket": avg_ticket,
            "total_orders": total_orders,
            "total_cancelled": total_cancelled,
            "total_delivery": total_delivery,
            "total_local": total_local,
            "total_retirada": total_retirada,
            "total_dinheiro": total_dinheiro,
            "total_pix": total_pix,
            "total_cartao": total_cartao,
        }

    @staticmethod
    def get_aggregated_stats(db: Session, start_date: datetime | None = None, end_date: datetime | None = None) -> dict:
        """Soma estatísticas de todos os caixas fechados no período."""
        from sqlalchemy import func
        
        query = db.query(
            func.sum(CashRegister.total_revenue).label("total_revenue"),
            func.sum(CashRegister.total_delivery_fees).label("total_delivery_fees"),
            func.sum(CashRegister.total_products).label("total_products"),
            func.sum(CashRegister.total_orders).label("total_orders"),
            func.sum(CashRegister.total_cancelled).label("total_cancelled"),
            func.sum(CashRegister.total_delivery).label("total_delivery"),
            func.sum(CashRegister.total_local).label("total_local"),
            func.sum(CashRegister.total_retirada).label("total_retirada"),
            func.sum(CashRegister.total_dinheiro).label("total_dinheiro"),
            func.sum(CashRegister.total_pix).label("total_pix"),
            func.sum(CashRegister.total_cartao).label("total_cartao"),
            func.count(CashRegister.id).label("count_registers")
        ).filter(CashRegister.status == CashRegisterStatus.fechado)

        if start_date:
            query = query.filter(CashRegister.closed_at >= start_date)
        if end_date:
            query = query.filter(CashRegister.closed_at <= end_date)

        res = query.first()
        
        # Se não houver dados, retorna tudo zerado
        if not res or res.count_registers == 0:
            return {
                "total_revenue": Decimal("0"),
                "total_delivery_fees": Decimal("0"),
                "total_products": Decimal("0"),
                "avg_ticket": Decimal("0"),
                "total_orders": 0,
                "total_cancelled": 0,
                "total_delivery": 0,
                "total_local": 0,
                "total_retirada": 0,
                "total_dinheiro": Decimal("0"),
                "total_pix": Decimal("0"),
                "total_cartao": Decimal("0"),
                "count_registers": 0,
                "start_date": start_date,
                "end_date": end_date,
            }

        total_revenue = res.total_revenue or Decimal("0")
        total_orders = res.total_orders or 0
        avg_ticket = total_revenue / total_orders if total_orders > 0 else Decimal("0")

        return {
            "total_revenue": total_revenue,
            "total_delivery_fees": res.total_delivery_fees or Decimal("0"),
            "total_products": res.total_products or Decimal("0"),
            "avg_ticket": avg_ticket,
            "total_orders": total_orders,
            "total_cancelled": res.total_cancelled or 0,
            "total_delivery": res.total_delivery or 0,
            "total_local": res.total_local or 0,
            "total_retirada": res.total_retirada or 0,
            "total_dinheiro": res.total_dinheiro or Decimal("0"),
            "total_pix": res.total_pix or Decimal("0"),
            "total_cartao": res.total_cartao or Decimal("0"),
            "count_registers": res.count_registers,
            "start_date": start_date,
            "end_date": end_date,
        }
