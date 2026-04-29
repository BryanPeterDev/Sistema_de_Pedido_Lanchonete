from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.exceptions import add_exception_handlers
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Lanchonete API",
        version="0.1.0",
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        lifespan=lifespan,
    )

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    add_exception_handlers(app)

    from app.api.v1 import router as api_v1

    app.include_router(api_v1, prefix="/api/v1")

    @app.get("/health")
    def health():
        return {"status": "ok", "env": settings.APP_ENV}

    return app


app = create_app()
