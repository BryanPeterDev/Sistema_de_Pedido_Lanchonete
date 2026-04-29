# Script de setup para Windows (PowerShell)
# Execute: .\scripts\setup.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup - Sistema Lanchonete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot

# ── 1. Backend ──────────────────────────────────────────────
Write-Host "[1/4] Configurando Backend..." -ForegroundColor Yellow

$backendDir = Join-Path $projectRoot "backend"

# Verifica Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "  ERRO: Python nao encontrado! Instale Python 3.11+ de https://python.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Python: $(python --version)" -ForegroundColor Green

# Cria venv se nao existir
$venvDir = Join-Path $backendDir "venv"
if (-not (Test-Path $venvDir)) {
    Write-Host "  Criando ambiente virtual..." -ForegroundColor Gray
    python -m venv $venvDir
}

# Ativa venv
$activateScript = Join-Path $venvDir "Scripts\Activate.ps1"
. $activateScript

# Instala dependencias
Write-Host "  Instalando dependencias Python..." -ForegroundColor Gray
pip install -r (Join-Path $backendDir "requirements.txt") --quiet

Write-Host "  Backend configurado!" -ForegroundColor Green

# ── 2. Frontend ─────────────────────────────────────────────
Write-Host ""
Write-Host "[2/4] Configurando Frontend..." -ForegroundColor Yellow

$frontendDir = Join-Path $projectRoot "frontend"

# Verifica Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "  ERRO: Node.js nao encontrado! Instale de https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js: $(node --version)" -ForegroundColor Green

# Instala dependencias
Write-Host "  Instalando dependencias npm..." -ForegroundColor Gray
Push-Location $frontendDir
npm install --silent 2>$null
Pop-Location

Write-Host "  Frontend configurado!" -ForegroundColor Green

# ── 3. Banco de dados ───────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Configurando Banco de Dados..." -ForegroundColor Yellow

$envFile = Join-Path $backendDir ".env"
if (Test-Path $envFile) {
    Write-Host "  .env ja existe" -ForegroundColor Green
} else {
    Write-Host "  AVISO: .env nao encontrado!" -ForegroundColor Red
}

# Cria tabelas (modo dev)
Write-Host "  Criando tabelas..." -ForegroundColor Gray
Push-Location $backendDir
python -c "
import sys; sys.path.insert(0, '.')
from app.core.database import engine, Base
import app.models
Base.metadata.create_all(bind=engine)
print('  Tabelas criadas com sucesso!')
"
Pop-Location

Write-Host "  Banco de dados pronto!" -ForegroundColor Green

# ── 4. Seed (dados iniciais) ────────────────────────────────
Write-Host ""
Write-Host "[4/4] Populando dados iniciais..." -ForegroundColor Yellow

Push-Location $backendDir
python seed.py 2>$null
Pop-Location

# ── Resumo ──────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup concluido!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o projeto:" -ForegroundColor White
Write-Host ""
Write-Host "  Backend:" -ForegroundColor Yellow
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "    python run.py" -ForegroundColor Gray
Write-Host ""
Write-Host "  Frontend (em outro terminal):" -ForegroundColor Yellow
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  URLs:" -ForegroundColor Yellow
Write-Host "    API:      http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "    Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "  Usuarios de teste:" -ForegroundColor Yellow
Write-Host "    admin@lanchonete.com   / admin123   (Admin)" -ForegroundColor Gray
Write-Host "    motoboy@lanchonete.com / motoboy123 (Motoboy)" -ForegroundColor Gray
Write-Host "    cliente@teste.com      / cliente123 (Cliente)" -ForegroundColor Gray
Write-Host ""
