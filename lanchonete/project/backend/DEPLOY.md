# Deploy — Backend

## Railway (recomendado)

1. Crie um projeto em [railway.app](https://railway.app)
2. Adicione um serviço PostgreSQL e um Redis
3. Conecte este repositório → Railway detecta o `Dockerfile` automaticamente
4. Defina as variáveis de ambiente (veja `.env.example`)
5. Adicione o comando de start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Render

1. Crie um Web Service apontando para este repo
2. Build command: `pip install poetry && poetry install --no-dev`
3. Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Variáveis obrigatórias em produção

```
DATABASE_URL=postgresql://...
SECRET_KEY=<openssl rand -hex 32>
REDIS_URL=redis://...
APP_ENV=production
CORS_ORIGINS=["https://seu-dominio.vercel.app"]
```

## Worker Celery (serviço separado)

No Railway/Render, crie um segundo serviço com o mesmo código e o comando:
```
celery -A app.tasks.celery_app worker --loglevel=info
```
