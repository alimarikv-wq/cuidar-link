$ErrorActionPreference = "Stop"

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Arquivo .env criado a partir de .env.example"
}

Write-Host "Instalando dependencias..."
npm install

Write-Host "Subindo Postgres e Redis..."
docker compose up -d postgres redis

Write-Host "Gerando Prisma Client..."
npx prisma generate

Write-Host "Aplicando migracoes versionadas..."
npx prisma migrate deploy

Write-Host "Populando banco..."
npx prisma db seed

Write-Host "Setup concluido. Rode npm run dev"
