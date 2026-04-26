# CuidarLink - checklist de producao

## Antes do deploy

1. Criar um banco PostgreSQL gerenciado.
2. Copiar `.env.production.example` para as variaveis do provedor.
   - `DATABASE_URL`: connection pooling do Supabase.
   - `DIRECT_URL`: direct connection do Supabase.
3. Definir `CARE_ENABLE_DEMO_FALLBACK="false"` no ambiente de producao real.
4. Gerar um `JWT_SECRET` longo e unico.
5. Configurar Google OAuth.
6. Configurar Sign in with Apple, se for usar Apple ja no lancamento.
7. Conferir `GET /api/auth/providers`; provedores sem credenciais ficam desativados na tela.
8. Rodar `npm run check`.
9. Rodar `npx prisma migrate deploy`.
10. Opcional: rodar `npx prisma db seed` apenas em staging ou demo.

## Callbacks OAuth

URL inicial publicada:

```txt
https://cuidar-link.vercel.app
```

Troque pelo dominio final quando comprar/apontar um dominio proprio:

- `https://cuidar-link.vercel.app/api/auth/oauth/google/callback`
- `https://cuidar-link.vercel.app/api/auth/oauth/apple/callback`

## Health check

Use:

```txt
GET /api/health
```

Resposta `200` significa app e banco acessiveis. Resposta `503` significa que o app subiu, mas o banco nao respondeu.

## Deploy sugerido

### Vercel

Build command:

```txt
npm run build
```

Install command:

```txt
npm install
```

Post-deploy ou etapa manual:

```txt
npx prisma migrate deploy
```

### Docker

```powershell
docker compose up --build
```

## Minimo para lancar esta semana

- Banco Postgres ativo.
- `DATABASE_URL` usa connection pooling.
- `DIRECT_URL` usa direct connection.
- Migracoes aplicadas.
- `CARE_ENABLE_DEMO_FALLBACK=false`.
- Google OAuth configurado.
- Apple pode ficar visivel depois, se a conta Apple Developer ainda nao estiver pronta.
- Icones sociais sem credenciais ficam desativados, sem mandar o usuario para erro.
- Testar cadastro de paciente, cadastro de profissional, busca, solicitacao e dashboard.
