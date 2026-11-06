# ═══════════════════════════════════════════════════════════════
# NOFX AI Trading System - 一键免克隆安装脚本 (Windows PowerShell)
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  _   _  ____  ______   __" -ForegroundColor Cyan
Write-Host " | \ | |/ __ \|  ____\ \ / /" -ForegroundColor Cyan
Write-Host " |  \| | |  | | |__   \ V / " -ForegroundColor Cyan
Write-Host " | . \` | |  | |  __|   > <  " -ForegroundColor Cyan
Write-Host " | |\  | |__| | |     / . \ " -ForegroundColor Cyan
Write-Host " |_| \_|\____/|_|    /_/ \_\" -ForegroundColor Cyan
Write-Host ""
Write-Host "=== NOFX AI 量化交易系统 · Windows 一键部署 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Docker 环境
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] 未检测到 Docker！" -ForegroundColor Red
    Write-Host ""
    Write-Host "Windows 运行 NOFX 需要先安装 Docker Desktop：" -ForegroundColor Yellow
    Write-Host "👉 官网下载地址: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    Write-Host "请下载并安装 Docker Desktop，开启后重新运行此脚本。" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker 守护进程是否在运行
$dockerRunning = $false
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "[ERROR] Docker Desktop 尚未启动！" -ForegroundColor Red
    Write-Host "请在 Windows 任务栏或开始菜单打开 Docker Desktop，等待左下角显示绿色 Running 后重试。" -ForegroundColor Yellow
    exit 1
}

Write-Host "[SUCCESS] Docker 环境检查通过！" -ForegroundColor Green

# 2. 创建并进入安装目录
$installDir = Join-Path $env:USERPROFILE "nofxold"
Write-Host "[INFO] 安装目标目录: $installDir" -ForegroundColor Blue
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}
Set-Location $installDir

# 3. 创建数据目录
$dataDir = Join-Path $installDir "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
}

# 4. 生成 .env 配置文件
$envFile = Join-Path $installDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[INFO] 正在自动生成安全加密密钥..." -ForegroundColor Blue

    # 生成 32 字节随机 Base64
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    
    $jwtBytes = New-Object byte[] 32
    $rng.GetBytes($jwtBytes)
    $jwtSecret = [Convert]::ToBase64String($jwtBytes)

    $dataBytes = New-Object byte[] 32
    $rng.GetBytes($dataBytes)
    $dataKey = [Convert]::ToBase64String($dataBytes)

    # 生成 RSA 2048 密钥 (优先使用本地 openssl，其次用 docker 生成)
    $rawRsa = $null
    $opensslCmd = $null
    if (Get-Command openssl -ErrorAction SilentlyContinue) {
        $opensslCmd = "openssl"
    } elseif (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
        $opensslCmd = "C:\Program Files\Git\usr\bin\openssl.exe"
    }

    if ($opensslCmd) {
        $rawRsa = & $opensslCmd genrsa 2048 2>$null
    } else {
        Write-Host "[INFO] 通过 Docker 容器生成 RSA 密钥..." -ForegroundColor Blue
        $rawRsa = docker run --rm alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl genrsa 2048 2>/dev/null"
    }

    $rsaKeySingleLine = ($rawRsa -join '\n')

    $envContent = @"
# ===========================================
# NOFX 自动生成配置 (请妥善保管)
# ===========================================
NOFX_BACKEND_PORT=8080
NOFX_FRONTEND_PORT=3000
TZ=Asia/Shanghai

REGISTRATION_ENABLED=true
MAX_USERS=10
EXPERIENCE_IMPROVEMENT=true

# 认证与加密密钥
JWT_SECRET=$jwtSecret
DATA_ENCRYPTION_KEY=$dataKey
RSA_PRIVATE_KEY="$rsaKeySingleLine"
TRANSPORT_ENCRYPTION=false

# 数据库存储
DB_TYPE=sqlite
DB_PATH=data/data.db
"@
    [System.IO.File]::WriteAllText($envFile, $envContent, [System.Text.Encoding]::UTF8)
    Write-Host "[SUCCESS] .env 配置已初始化！" -ForegroundColor Green
} else {
    Write-Host "[INFO] .env 文件已存在，保留现有密钥配置。" -ForegroundColor Blue
}

# 5. 生成生产级 docker-compose.yml
$composeFile = Join-Path $installDir "docker-compose.yml"
$composeContent = @'
services:
  nofx:
    container_name: nofxold-backend
    platform: linux/amd64
    image: ghcr.io/xuano47/nofx-backend:latest
    restart: unless-stopped
    stop_grace_period: 30s
    ports:
      - "${NOFX_BACKEND_PORT:-8080}:8080"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    environment:
      - TZ=${TZ:-Asia/Shanghai}
      - AI_MAX_TOKENS=8000
    networks:
      - nofx-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nofx-frontend:
    container_name: nofxold-frontend
    platform: linux/amd64
    image: ghcr.io/xuano47/nofx-frontend:latest
    restart: unless-stopped
    ports:
      - "${NOFX_FRONTEND_PORT:-3000}:80"
    networks:
      - nofx-network
    depends_on:
      - nofx
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s

networks:
  nofx-network:
    driver: bridge
'@
[System.IO.File]::WriteAllText($composeFile, $composeContent, [System.Text.Encoding]::UTF8)

# 6. 生成 Windows 快捷管理批处理 nofxold.bat 与 nofx.bat
$batFile = Join-Path $installDir "nofxold.bat"
$batContent = @'
@echo off
cd /d "%~dp0"

if "%1"=="" goto status
if "%1"=="start" goto start
if "%1"=="stop" goto stop
if "%1"=="restart" goto restart
if "%1"=="logs" goto logs
if "%1"=="update" goto update
if "%1"=="status" goto status
goto help

:start
docker compose up -d
goto end

:stop
docker compose down
goto end

:restart
docker compose restart
goto end

:logs
docker compose logs -f nofx
goto end

:update
echo 正在拉取最新版本...
docker compose pull
echo 重启服务...
docker compose up -d
echo 升级完成！
goto end

:status
docker compose ps
goto end

:help
echo 用法: nofxold [start^|stop^|restart^|logs^|status^|update]
goto end

:end
'@
[System.IO.File]::WriteAllText($batFile, $batContent, [System.Text.Encoding]::ASCII)
$legacyBatFile = Join-Path $installDir "nofx.bat"
[System.IO.File]::WriteAllText($legacyBatFile, $batContent, [System.Text.Encoding]::ASCII)

# 7. 拉取镜像并启动
Write-Host "[INFO] 正在拉取云端预构建镜像..." -ForegroundColor Blue
docker compose pull

# 清理历史可能残留的冲突容器（如更名前旧容器 nofx-frontend 或旧工程容器）
try {
    $existingContainers = docker ps -a --format '{{.Names}}'
    if ($existingContainers -contains "nofx-frontend") {
        Write-Host "[INFO] 清理历史遗留容器 nofx-frontend..." -ForegroundColor Blue
        docker rm -f nofx-frontend | Out-Null
    }
    if ($existingContainers -contains "nofx-nofx-1") {
        Write-Host "[INFO] 清理历史旧项目容器 nofx-nofx-1..." -ForegroundColor Blue
        docker rm -f nofx-nofx-1 | Out-Null
    }
} catch {}

Write-Host "[INFO] 启动服务容器..." -ForegroundColor Blue
docker compose up -d

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   🎉 NOFX AI 量化交易系统 已在 Windows 成功启动！" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 访问地址:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  📁 安装目录:     $installDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "  日常运维命令 (在 $installDir 下执行):" -ForegroundColor White
Write-Host "    .\nofxold.bat logs      # 查看后台运行日志" -ForegroundColor Gray
Write-Host "    .\nofxold.bat restart   # 重启服务" -ForegroundColor Gray
Write-Host "    .\nofxold.bat stop      # 停止服务" -ForegroundColor Gray
Write-Host "    .\nofxold.bat update    # 一键升级到最新版" -ForegroundColor Gray
Write-Host ""
Write-Host "  ⚠️  免责声明: 本项目已完全开源，请自行检查风险，不对任何交易盈亏负责。" -ForegroundColor DarkYellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# 自动在默认浏览器中打开页面
try {
    Start-Process "http://localhost:3000"
} catch {}
