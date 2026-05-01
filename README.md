# CuidarLink

Marketplace para conectar pacientes PCD a cuidadores, tecnicos de enfermagem e fisioterapeutas proximos, com foco em atendimento domiciliar, banho assistido, transferencia segura e recorrencia.

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL
- Redis opcional
- OAuth Google e Apple

## Funcionalidades

- Busca por raio na Zona Sul de Porto Alegre
- Filtros por tipo de profissional, disponibilidade, genero de preferencia para cuidado intimo e capacidade de transferencia
- Cards com distancia, avaliacao, credenciais, preco e disponibilidade
- Fallback demonstrativo quando o banco local nao estiver ativo
- Cadastro de paciente e profissional
- Login/cadastro com e-mail, Google e Apple
- Geolocalizacao, documentos, agenda e solicitacoes persistidas no banco
- Validacao de documentos profissionais com storage privado, CPF, COREN/CREFITO e auditoria admin
- Dashboard para acompanhar solicitacoes e perfil
- Admin com metricas operacionais
- Notificacoes por e-mail para novas solicitacoes e mudancas de status
- Health check em `/api/health`

## Como rodar localmente

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npm run dev
```

Para usar banco real local:

```powershell
docker compose up -d postgres redis
npx prisma migrate deploy
npx prisma db seed
```

Abra [http://localhost:3000](http://localhost:3000).

## Usuarios seed

- `admin@cuidarlink.com` / `admin123`
- `paciente@cuidarlink.com` / `demo123`
- profissionais seedados usam `demo123`

## APIs principais

- `GET /api/health`
- `GET /api/professionals`
- `POST /api/care-requests`
- `GET /api/care-requests`
- `GET /api/auth/oauth/google`
- `GET /api/auth/oauth/apple`
- `GET /api/auth/providers`

## Login social

Preencha no `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`
- `APPLE_TEAM_ID`
- `APPLE_KEY_ID`
- `APPLE_PRIVATE_KEY`

Para Supabase em producao, use:

- `DATABASE_URL`: connection pooling
- `DIRECT_URL`: direct connection
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: chave secreta do Supabase, somente no servidor/Vercel
- `SUPABASE_DOCUMENTS_BUCKET`: bucket privado para documentos, por padrao `professional-documents`
- `RESEND_API_KEY`: chave da Resend para notificacoes por e-mail
- `RESEND_FROM_EMAIL`: remetente verificado, por exemplo `CuidarLink <notificacoes@seudominio.com>`
- `CARE_ADMIN_EMAILS`: e-mails administrativos separados por virgula, opcional

Callbacks locais:

- `http://localhost:3000/api/auth/oauth/google/callback`
- `http://localhost:3000/api/auth/oauth/apple/callback`

## Producao

Veja [PRODUCTION.md](./PRODUCTION.md).

## Plano cronologico

Veja [LAUNCH_PLAN.md](./LAUNCH_PLAN.md).
Deploy atualizado em 26/04/2026.
