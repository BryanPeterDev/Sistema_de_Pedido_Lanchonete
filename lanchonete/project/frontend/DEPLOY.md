# Deploy — Frontend

## Vercel (recomendado)

1. Importe este repositório em [vercel.com](https://vercel.com)
2. Root Directory: `frontend`
3. Framework Preset: Next.js (detectado automaticamente)
4. Adicione a variável de ambiente:
   ```
   NEXT_PUBLIC_API_URL=https://sua-api.railway.app/api/v1
   ```
5. Deploy

## Variáveis de ambiente

| Variável              | Valor                              |
|-----------------------|------------------------------------|
| NEXT_PUBLIC_API_URL   | URL completa da API com /api/v1    |
