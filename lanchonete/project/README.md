# 🍔 Sistema de Pedidos — Lanchonete

Stack completa para gerenciamento de pedidos online com painel admin, app de motoboy, chatbot IA e notificações WhatsApp.

## Estrutura

```
lanchonete/
├── backend/       FastAPI · SQLAlchemy · Alembic · PostgreSQL/SQLite
├── frontend/      Next.js 14 · Tailwind · Zustand · TanStack Query
└── scripts/       Scripts de automação
```

## Pré-requisitos

- **Python 3.11+** → [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18+** → [nodejs.org](https://nodejs.org/)
- **PostgreSQL 16** (opcional, pode usar SQLite) → [postgresql.org](https://www.postgresql.org/download/windows/)

## Setup Rápido (Windows)

### Opção A: Script automático (PowerShell)

```powershell
.\scripts\setup.ps1
```

### Opção B: Manual passo a passo

#### 1. Backend

```powershell
cd backend

# Criar e ativar ambiente virtual
python -m venv venv
.\venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt

# Rodar (cria tabelas automaticamente em modo dev)
python run.py
```

A API estará em **http://localhost:8000**
Swagger docs em **http://localhost:8000/docs**

#### 2. Seed (dados de teste)

```powershell
# Com o venv ativo, na pasta backend:
python seed.py
```

Usuários criados:
| Email | Senha | Role |
|-------|-------|------|
| admin@lanchonete.com | admin123 | Admin |
| motoboy@lanchonete.com | motoboy123 | Motoboy |
| cliente@teste.com | cliente123 | Cliente |

#### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

O app estará em **http://localhost:3000**

---

## Banco de Dados

### SQLite (padrão para dev — zero configuração)

O projeto vem configurado para usar **SQLite** por padrão. O arquivo `dev.db` é criado automaticamente ao rodar o backend.

### PostgreSQL (recomendado para produção)

1. **Instale o PostgreSQL** no Windows
2. **Abra o pgAdmin** ou psql e execute:

```sql
CREATE DATABASE lanchonete;
CREATE USER lanche WITH PASSWORD 'lanche';
GRANT ALL PRIVILEGES ON DATABASE lanchonete TO lanche;
ALTER DATABASE lanchonete OWNER TO lanche;
-- No PostgreSQL 15+, é necessário:
\c lanchonete
GRANT ALL ON SCHEMA public TO lanche;
```

3. **Edite o `backend/.env`**:

```env
DATABASE_URL=postgresql://lanche:lanche@localhost:5432/lanchonete
```

4. **Rode as migrations**:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
python seed.py
```

---

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| 🍔 Cardápio | Catálogo de produtos com categorias e busca |
| 🛒 Carrinho | Carrinho persistente com checkout |
| 📦 Pedidos | Sistema de pedidos com state machine |
| 👨‍💼 Admin | Painel completo de gestão |
| 🛵 Motoboy | App de entregas com claim/confirm |
| 🤖 Chatbot | Assistente virtual com IA (opcional) |
| 📱 WhatsApp | Notificações automáticas (opcional) |
| 📊 Estoque | Controle de estoque com alertas |

## Endpoints da API

| Grupo | Rota | Descrição |
|-------|------|-----------|
| Auth | `POST /api/v1/auth/register` | Registrar usuário |
| Auth | `POST /api/v1/auth/login` | Login (retorna tokens) |
| Auth | `POST /api/v1/auth/refresh` | Renovar access token |
| Auth | `GET /api/v1/auth/me` | Dados do usuário logado |
| Produtos | `GET /api/v1/products` | Listar produtos |
| Produtos | `POST /api/v1/products` | Criar produto (admin) |
| Categorias | `GET /api/v1/categories` | Listar categorias |
| Pedidos | `POST /api/v1/orders` | Criar pedido |
| Pedidos | `GET /api/v1/orders` | Listar pedidos |
| Pedidos | `PATCH /api/v1/orders/{id}/status` | Atualizar status |
| Entregas | `GET /api/v1/deliveries` | Listar entregas |
| Chat | `POST /api/v1/chat` | Enviar mensagem ao chatbot |

## Deploy

| Serviço    | Plataforma          |
|------------|---------------------|
| API        | Railway ou Render   |
| Frontend   | Vercel              |
| PostgreSQL | Supabase ou Neon    |
| Redis      | Upstash             |

Veja `backend/DEPLOY.md` e `frontend/DEPLOY.md` para instruções detalhadas.
