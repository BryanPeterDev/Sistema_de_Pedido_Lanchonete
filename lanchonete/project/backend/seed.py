"""
Script de seed -- popula o banco com dados iniciais para teste.
Execute: python seed.py
"""

import os
import sys

# Fix encoding no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Garante que todas as tabelas existam
import app.models  # noqa: F401
from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole

# Drop e recria todas as tabelas (apenas para dev!)
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.commit()

Base.metadata.create_all(bind=engine)
print("[OK] Schema recriado com sucesso")


def seed():
    db = SessionLocal()
    try:
        # Admin
        if not db.query(User).filter_by(email="admin@lanchonete.com").first():
            db.add(
                User(
                    name="Administrador",
                    email="admin@lanchonete.com",
                    hashed_password=hash_password("admin123"),
                    role=UserRole.admin,
                    phone="+5511999999999",
                )
            )

        # Atendente
        if not db.query(User).filter_by(email="atendente@lanchonete.com").first():
            db.add(
                User(
                    name="Ana Atendente",
                    email="atendente@lanchonete.com",
                    hashed_password=hash_password("atendente123"),
                    role=UserRole.atendente,
                    phone="+5511988888888",
                )
            )

        # Cozinha 1
        if not db.query(User).filter_by(email="cozinha@lanchonete.com").first():
            db.add(
                User(
                    name="Carlos Cozinha",
                    email="cozinha@lanchonete.com",
                    hashed_password=hash_password("cozinha123"),
                    role=UserRole.cozinha,
                    phone="+5511977777777",
                )
            )

        # Cozinha 2
        if not db.query(User).filter_by(email="cozinha2@lanchonete.com").first():
            db.add(
                User(
                    name="Julia Cozinha",
                    email="cozinha2@lanchonete.com",
                    hashed_password=hash_password("cozinha123"),
                    role=UserRole.cozinha,
                    phone="+5511966666666",
                )
            )

        # Motoboy
        if not db.query(User).filter_by(email="motoboy@lanchonete.com").first():
            db.add(
                User(
                    name="Joao Motoboy",
                    email="motoboy@lanchonete.com",
                    hashed_password=hash_password("motoboy123"),
                    role=UserRole.motoboy,
                    phone="+5511888888888",
                )
            )

        db.flush()

        # Categorias
        cats = {}
        for name in ["Lanches", "Bebidas", "Combos", "Sobremesas"]:
            cat = db.query(Category).filter_by(name=name).first()
            if not cat:
                cat = Category(name=name)
                db.add(cat)
                db.flush()
            cats[name] = cat

        # Produtos
        produtos = [
            dict(
                name="X-Burguer",
                price=22.90,
                category_id=cats["Lanches"].id,
                stock_quantity=50,
                description="Hamburguer artesanal com queijo, alface e tomate",
            ),
            dict(
                name="X-Bacon",
                price=27.90,
                category_id=cats["Lanches"].id,
                stock_quantity=40,
                description="Hamburguer com bacon crocante e queijo cheddar",
            ),
            dict(
                name="X-Frango",
                price=24.90,
                category_id=cats["Lanches"].id,
                stock_quantity=45,
                description="Frango grelhado com maionese e salada",
            ),
            dict(
                name="Coca-Cola 350ml",
                price=7.00,
                category_id=cats["Bebidas"].id,
                stock_quantity=100,
            ),
            dict(
                name="Suco de Laranja",
                price=8.50,
                category_id=cats["Bebidas"].id,
                stock_quantity=60,
                description="Suco natural 400ml",
            ),
            dict(
                name="Agua Mineral", price=4.00, category_id=cats["Bebidas"].id, stock_quantity=80
            ),
            dict(
                name="Combo Duplo",
                price=42.90,
                category_id=cats["Combos"].id,
                stock_quantity=30,
                description="2 hamburgueres + 2 bebidas + batata frita",
            ),
            dict(
                name="Combo Familia",
                price=89.90,
                category_id=cats["Combos"].id,
                stock_quantity=20,
                description="4 hamburgueres + 4 bebidas + 2 batatas",
            ),
            dict(
                name="Brownie",
                price=9.90,
                category_id=cats["Sobremesas"].id,
                stock_quantity=25,
                description="Brownie de chocolate com sorvete",
            ),
            dict(
                name="Milk Shake",
                price=14.90,
                category_id=cats["Sobremesas"].id,
                stock_quantity=35,
                description="500ml -- chocolate, morango ou baunilha",
            ),
        ]

        for p in produtos:
            if not db.query(Product).filter_by(name=p["name"]).first():
                db.add(Product(**p))

        db.commit()
        print("[OK] Seed concluido!")
        print("")
        print("Usuarios criados:")
        print("  admin@lanchonete.com      / admin123      (Admin)")
        print("  atendente@lanchonete.com  / atendente123  (Atendente)")
        print("  cozinha@lanchonete.com    / cozinha123    (Cozinha)")
        print("  cozinha2@lanchonete.com   / cozinha123    (Cozinha)")
        print("  motoboy@lanchonete.com    / motoboy123    (Motoboy)")

    except Exception as e:
        db.rollback()
        print(f"[ERRO] Erro no seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
