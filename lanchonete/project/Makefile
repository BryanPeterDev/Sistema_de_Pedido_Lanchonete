.PHONY: up down migrate seed logs api worker frontend install

# ── Backend ───────────────────────────────────────────────────────────────────
up:
	cd backend && docker compose up --build -d

down:
	cd backend && docker compose down

logs:
	cd backend && docker compose logs -f api

migrate:
	cd backend && docker compose exec api alembic upgrade head

migration:
	cd backend && docker compose exec api alembic revision --autogenerate -m "$(msg)"

seed:
	cd backend && docker compose exec api python seed.py

# ── Frontend ──────────────────────────────────────────────────────────────────
install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

# ── All ───────────────────────────────────────────────────────────────────────
dev: up
	@echo "Waiting for API..."
	@sleep 5
	$(MAKE) migrate
	cd frontend && npm run dev
