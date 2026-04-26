# Plano cronologico de lancamento - CuidarLink

Considerando hoje, 25/04/2026, este plano mira colocar o site no ar entre 27/04/2026 e 03/05/2026.

## 27/04/2026 - Fundacao de producao

1. Escolher dominio final.
2. Criar projeto no provedor de deploy.
3. Criar banco PostgreSQL gerenciado.
4. Configurar variaveis de ambiente usando `.env.production.example`.
5. Definir `CARE_ENABLE_DEMO_FALLBACK="false"`.
6. Gerar `JWT_SECRET` forte.
7. Rodar `npm run check`.

## 28/04/2026 - Banco e dados

1. Rodar `npx prisma migrate deploy` apontando para o banco de producao.
2. Acessar `/api/health` e confirmar `database: true`.
3. Criar pelo menos um usuario paciente real.
4. Criar pelo menos tres profissionais reais ou importar profissionais aprovados.
5. Conferir busca por banho, transferencia, tecnico de enfermagem e fisioterapia.

## 29/04/2026 - Google OAuth

1. Criar credenciais OAuth no Google Cloud.
2. Configurar callback `https://SEU_DOMINIO/api/auth/oauth/google/callback`.
3. Preencher `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
4. Testar cadastro de paciente com Google.
5. Testar cadastro de profissional com Google.
6. Testar login de retorno com a mesma conta Google.

## 30/04/2026 - Apple OAuth e decisao de escopo

1. Se a conta Apple Developer estiver pronta, configurar Sign in with Apple.
2. Callback: `https://SEU_DOMINIO/api/auth/oauth/apple/callback`.
3. Preencher `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` e `APPLE_PRIVATE_KEY`.
4. Testar cadastro e login com Apple.
5. Se Apple atrasar, manter o botao oculto temporariamente ou publicar somente com Google e e-mail.

## 01/05/2026 - QA funcional

1. Testar cadastro por e-mail como paciente.
2. Testar cadastro por e-mail como profissional.
3. Testar busca com filtros: genero, raio, tipo de profissional, capacidade de transferencia.
4. Testar solicitacao de atendimento.
5. Testar dashboard do paciente.
6. Testar admin.
7. Testar mobile.

## 02/05/2026 - Revisao de producao

1. Confirmar `CARE_ENABLE_DEMO_FALLBACK="false"` em producao.
2. Confirmar `/api/health` retornando 200.
3. Confirmar `npm audit --omit=dev` sem vulnerabilidades.
4. Revisar textos sensiveis de cuidado, privacidade e seguranca.
5. Fazer backup ou snapshot inicial do banco.

## 03/05/2026 - Publicacao

1. Apontar dominio para o deploy.
2. Testar HTTPS.
3. Testar cadastro, login, busca e solicitacao no dominio final.
4. Criar primeira lista de profissionais verificados.
5. Monitorar logs de erro nas primeiras horas.

## Criterios de pronto para ir ao ar

- `/api/health` retorna 200.
- Banco de producao tem migracoes aplicadas.
- Google OAuth funciona no dominio final.
- Apple OAuth funciona ou foi removido/ocultado ate ficar pronto.
- Busca retorna profissionais reais.
- Solicitacao grava no banco.
- Dashboard abre para paciente e profissional.
- `npm run check` passa.
