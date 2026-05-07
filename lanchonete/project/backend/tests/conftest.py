"""
conftest.py — Fixtures globais para todos os testes.

Usa SQLite em memória para isolamento total do banco de produção.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import create_app
from app.models.category import Category
from app.models.product import Product
from app.models.user import User, UserRole

# ── Engine SQLite em memória ──────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

TestingSessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Cria todas as tabelas uma única vez por sessão de testes."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    """
    Sessão de banco isolada por teste.
    Faz rollback automático ao final de cada teste.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    """
    TestClient do FastAPI com override de get_db apontando para o banco de teste.
    """
    app = create_app()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c


# ── Helpers de criação de usuário ─────────────────────────────────────────────

def _make_user(db, name: str, email: str, role: UserRole) -> User:
    user = User(
        name=name,
        email=email,
        phone="11999999999",
        hashed_password=hash_password("senha123"),
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _token(user: User) -> str:
    return create_access_token(str(user.id), user.role)


# ── Fixtures de usuários ──────────────────────────────────────────────────────

@pytest.fixture()
def admin_user(db):
    return _make_user(db, "Admin", "admin@test.com", UserRole.admin)


@pytest.fixture()
def atendente_user(db):
    return _make_user(db, "Atendente", "atendente@test.com", UserRole.atendente)


@pytest.fixture()
def cozinha_user(db):
    return _make_user(db, "Cozinha", "cozinha@test.com", UserRole.cozinha)


@pytest.fixture()
def motoboy_user(db):
    return _make_user(db, "Motoboy", "motoboy@test.com", UserRole.motoboy)


@pytest.fixture()
def admin_token(admin_user):
    return _token(admin_user)


@pytest.fixture()
def atendente_token(atendente_user):
    return _token(atendente_user)


@pytest.fixture()
def motoboy_token(motoboy_user):
    return _token(motoboy_user)


# ── Fixtures de entidades base ────────────────────────────────────────────────

@pytest.fixture()
def sample_category(db):
    cat = Category(name="Lanches", is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@pytest.fixture()
def sample_product(db, sample_category):
    product = Product(
        name="X-Burguer",
        description="Delicioso",
        price=25.00,
        category_id=sample_category.id,
        stock_quantity=10,
        stock_alert_threshold=2,
        is_visible=True,
        is_available=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
