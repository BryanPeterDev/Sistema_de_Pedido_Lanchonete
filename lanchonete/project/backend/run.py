"""
Script para rodar o backend localmente.
Uso: python run.py

Cria as tabelas automaticamente se nao existirem (modo dev com SQLite).
"""

import os
import sys

# Garante encoding UTF-8 no Windows
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Garante que o diretorio do backend esta no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    # Importa todos os models para registrar no metadata
    import app.models  # noqa: F401
    from app.core.config import settings
    from app.core.database import Base, engine

    # Em modo dev, cria tabelas automaticamente (se nao existirem)
    if not settings.is_production:
        print("[SETUP] Criando tabelas no banco de dados...")
        Base.metadata.create_all(bind=engine)
        print(f"[OK] Banco de dados pronto: {settings.DATABASE_URL}")

    print(f"\n[START] Iniciando API em modo {settings.APP_ENV}")
    print("[DOCS]  http://localhost:8000/docs")
    print("[API]   http://localhost:8000/api/v1\n")

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # hot reload em dev
    )


if __name__ == "__main__":
    main()
