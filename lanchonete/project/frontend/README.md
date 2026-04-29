# Lanchonete — Frontend

Next.js 14 · Tailwind CSS · Zustand · TanStack Query

## Setup

```bash
npm install
cp .env.local.example .env.local  # ajuste NEXT_PUBLIC_API_URL
npm run dev
```

## Rotas

| Rota | Acesso |
|---|---|
| `/cardapio` | Público |
| `/carrinho` | Público |
| `/login` `/registro` | Público |
| `/pedidos` `/pedidos/[id]` | Cliente autenticado |
| `/chat` | Cliente autenticado |
| `/admin/*` | Admin |
| `/motoboy` | Motoboy |

## Variáveis de ambiente

| Variável | Valor padrão |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` |
