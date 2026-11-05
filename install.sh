#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NOFX AI Trading System - 一键免克隆安装脚本 (Linux / macOS)
# ═══════════════════════════════════════════════════════════════
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

clear 2>/dev/null || true
echo -e "${CYAN}${BOLD}"
echo "  _   _  ____  ______   __"
echo " | \ | |/ __ \|  ____\ \ / /"
echo " |  \| | |  | | |__   \ V / "
echo " | . \` | |  | |  __|   > <  "
echo " | |\  | |__| | |     / . \ "
echo " |_| \_|\____/|_|    /_/ \_\\"
echo -e "${NC}"
echo -e "${BOLD}=== NOFX AI 量化交易系统 · 一键免克隆部署 ===${NC}\n"

# 1. 检查并创建安装目录
INSTALL_DIR="${NOFX_DIR:-$HOME/nofx}"
print_info "安装目标目录: ${CYAN}${INSTALL_DIR}${NC}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 2. 检查 Docker 环境
detect_docker() {
    if ! command -v docker &> /dev/null; then
        print_warning "未检测到 Docker，正在尝试自动安装 Docker..."
        if [ "$EUID" -ne 0 ] && ! command -v sudo &> /dev/null; then
            print_error "当前不是 root 用户且无 sudo 权限，无法自动安装 Docker。请手动安装后再运行。"
            exit 1
        fi
        curl -fsSL https://get.docker.com | sh
        if command -v systemctl &> /dev/null; then
            systemctl enable --now docker 2>/dev/null || true
        fi
    fi

    # 检查 Docker 守护进程
    if ! docker info &> /dev/null; then
        if command -v systemctl &> /dev/null; then
            print_info "正在启动 Docker 服务..."
            sudo systemctl start docker 2>/dev/null || systemctl start docker 2>/dev/null || true
        fi
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker 无法正常与 Daemon 通信。请检查 Docker 服务是否已启动，或将当前用户加入 docker 组。"
        exit 1
    fi

    # 检测 docker compose 命令
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    elif command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        print_error "未检测到 Docker Compose！请安装 Docker Compose 插件。"
        exit 1
    fi
    print_success "Docker 环境检查通过 (${COMPOSE_CMD})"
}
detect_docker

# 3. 检查并准备 OpenSSL（用于自动生成安全密钥）
ensure_openssl() {
    if ! command -v openssl &> /dev/null; then
        print_warning "未检测到 openssl，正在尝试自动安装..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -y && sudo apt-get install -y openssl
        elif command -v yum &> /dev/null; then
            sudo yum install -y openssl
        elif command -v apk &> /dev/null; then
            apk add --no-cache openssl
        else
            print_warning "无法自动安装 openssl，将使用容器内环境生成密钥..."
        fi
    fi
}
ensure_openssl

# 4. 生成 .env 配置文件
if [ ! -f ".env" ]; then
    print_info "正在生成随机安全密钥 (.env)..."

    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -base64 32)
        DATA_KEY=$(openssl rand -base64 32)
        RSA_KEY=$(openssl genrsa 2048 2>/dev/null | awk '{printf "%s\\n", $0}')
    else
        # 降级使用 Docker 容器生成
        print_info "使用 Docker 临时容器生成加密密钥..."
        JWT_SECRET=$(docker run --rm alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl rand -base64 32")
        DATA_KEY=$(docker run --rm alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl rand -base64 32")
        RSA_KEY=$(docker run --rm alpine sh -c "apk add --no-cache openssl >/dev/null 2>&1 && openssl genrsa 2048 2>/dev/null | awk '{printf \"%s\\\\n\", \$0}'")
    fi

    cat <<EOF > .env
# ===========================================
# NOFX 自动生成配置 (请妥善保管，勿随意泄露)
# ===========================================
NOFX_BACKEND_PORT=8080
NOFX_FRONTEND_PORT=3000
TZ=Asia/Shanghai

REGISTRATION_ENABLED=true
MAX_USERS=10
EXPERIENCE_IMPROVEMENT=true

# 认证与加密密钥
JWT_SECRET=${JWT_SECRET}
DATA_ENCRYPTION_KEY=${DATA_KEY}
RSA_PRIVATE_KEY="${RSA_KEY}"
TRANSPORT_ENCRYPTION=false

# 数据库存储
DB_TYPE=sqlite
DB_PATH=data/data.db
EOF

    chmod 600 .env 2>/dev/null || true
    print_success ".env 文件生成完毕（密钥已随机初始化）"
else
    print_info ".env 已存在，保留现有配置"
fi

# 5. 创建数据持久化目录
mkdir -p data
chmod 700 data 2>/dev/null || true

# 6. 生成生产级 docker-compose.yml（免克隆、直接拉取预构建镜像）
cat <<'EOF' > docker-compose.yml
services:
  nofx:
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
    platform: linux/amd64
    image: ghcr.io/xuano47/nofx-frontend:latest
    container_name: nofx-frontend
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
EOF

# 7. 生成快捷管理脚本 nofx.sh
cat <<'EOF' > nofx.sh
#!/bin/bash
cd "$(dirname "$0")"

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "未检测到 Docker Compose！"
    exit 1
fi

case "${1:-status}" in
    start)
        $COMPOSE_CMD up -d
        ;;
    stop)
        $COMPOSE_CMD down
        ;;
    restart)
        $COMPOSE_CMD restart
        ;;
    logs)
        $COMPOSE_CMD logs -f "${2:-nofx}"
        ;;
    status)
        $COMPOSE_CMD ps
        ;;
    update)
        echo "正在拉取最新镜像..."
        $COMPOSE_CMD pull
        echo "正在重启服务..."
        $COMPOSE_CMD up -d
        echo "升级完成！"
        ;;
    *)
        echo "用法: ./nofx.sh [start|stop|restart|logs|status|update]"
        ;;
esac
EOF
chmod +x nofx.sh

# 尝试在 /usr/local/bin 建立全局快捷方式
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/nofx.sh" /usr/local/bin/nofx 2>/dev/null || true
fi

# 8. 拉取镜像并启动
print_info "正在拉取云端预构建镜像 (ghcr.io)..."
$COMPOSE_CMD pull

print_info "正在启动容器..."
$COMPOSE_CMD up -d --no-build

# 9. 智能获取外网 IP
SERVER_IP=$(curl -s --connect-timeout 2 https://api.ipify.org 2>/dev/null || curl -s --connect-timeout 2 https://ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "你的服务器IP")

PORT=$(grep "^NOFX_FRONTEND_PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "3000")
PORT=$(echo "$PORT" | tr -d '"'"'" | tr -d ' ')
PORT=${PORT:-3000}

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}   🎉 NOFX AI 量化交易系统 已成功启动！${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Web 界面地址:  ${CYAN}${BOLD}http://${SERVER_IP}:${PORT}${NC}"
echo -e "  📁 系统安装目录:  ${YELLOW}${INSTALL_DIR}${NC}"
echo ""
echo -e "  ${BOLD}日常管理命令：${NC}"
echo -e "    cd ${INSTALL_DIR}"
echo -e "    ./nofx.sh logs      # 查看运行日志"
echo -e "    ./nofx.sh restart   # 重启系统"
echo -e "    ./nofx.sh stop      # 停止系统"
echo -e "    ./nofx.sh update    # 一键平滑更新到最新镜像"
echo ""
echo -e "${YELLOW}${BOLD}⚠️  重要提示：${NC}"
echo -e "  1. 若使用腾讯云/阿里云/华为云等云服务器，请务必在【安全组 / 防火墙】放行 ${PORT} 端口！"
echo -e "  2. 首次进入 Web 界面，请直接注册管理员账号。"
echo -e "  3. 资金安全加固：量化系统涉及实盘资金，强烈建议在云安全组中将 ${PORT} 端口设置为【仅允许自己的 IP 访问】（白名单机制），切勿对全网 (0.0.0.0/0) 敞开！"
echo -e "  4. 免责声明：本项目已完全开源，请自行检查代码与风控逻辑，系统不对任何实际交易结果与盈亏负责。"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════════${NC}\n"
