#!/bin/bash
# ==========================================
# main 分支前端部署脚本
# 构建后部署到独立的 Nginx 目录和端口
# ==========================================

set -e

NGINX_WEB_ROOT="/var/www/html/financial-data-platform-main"
NGINX_CONF_SOURCE="nginx-config-main.conf"
NGINX_CONF_TARGET="/etc/nginx/conf.d/ai-stock-main.conf"
BACKUP_DIR="/data/backups/ai-stock-web-main"
PORT=3667

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_header()  { echo -e "${CYAN}$1${NC}"; }

echo ""
log_header "=========================================="
log_header "  main 分支前端部署 (端口 ${PORT})"
log_header "=========================================="
echo ""

# 1. 切换到 main 分支并拉取
log_info "[1/6] 切换到 main 分支..."
git checkout main
git pull origin main
log_success "代码已更新"
git log --oneline -3
echo ""

# 2. 安装依赖
log_info "[2/6] 检查依赖..."
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
else
    log_error "未找到包管理器 (npm/pnpm)"
    exit 1
fi
log_info "使用 $PKG_MANAGER"
$PKG_MANAGER install
log_success "依赖安装完成"
echo ""

# 3. 构建
log_info "[3/6] 构建生产版本..."
$PKG_MANAGER run build
if [ -d "build" ]; then
    build_size=$(du -sh build | cut -f1)
    log_success "构建完成，产物大小: ${build_size}"
else
    log_error "构建失败：build 目录不存在"
    exit 1
fi
echo ""

# 4. 备份旧版本
log_info "[4/6] 备份..."
if [ -d "$NGINX_WEB_ROOT" ] && [ "$(ls -A $NGINX_WEB_ROOT 2>/dev/null)" ]; then
    mkdir -p "$BACKUP_DIR"
    backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    cp -r "$NGINX_WEB_ROOT" "${BACKUP_DIR}/${backup_name}" 2>/dev/null || true
    # 只保留最近 3 个备份
    cd "$BACKUP_DIR" && ls -dt backup_* 2>/dev/null | tail -n +4 | xargs rm -rf 2>/dev/null || true
    cd - > /dev/null
    log_success "备份完成"
fi
echo ""

# 5. 部署
log_info "[5/6] 部署到 ${NGINX_WEB_ROOT}..."
mkdir -p "$NGINX_WEB_ROOT"
rm -rf "${NGINX_WEB_ROOT:?}"/*
cp -r build/* "$NGINX_WEB_ROOT/"
log_success "文件已复制"

# 6. 配置 Nginx
log_info "[6/6] 配置 Nginx..."
if [ -f "$NGINX_CONF_SOURCE" ]; then
    cp "$NGINX_CONF_SOURCE" "$NGINX_CONF_TARGET"
    log_success "Nginx 配置已更新 → $NGINX_CONF_TARGET"
fi

if command -v nginx &> /dev/null; then
    nginx -t 2>&1 && nginx -s reload
    log_success "Nginx 已重新加载"
else
    log_warning "nginx 未安装，请手动配置"
fi

echo ""
log_header "=========================================="
log_header "  main 分支前端部署完成！"
log_header "=========================================="
echo ""
echo "  访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}"
echo ""
echo "  dev  前端: http://<IP>:80   → 后端 :8000"
echo "  main 前端: http://<IP>:${PORT} → 后端 :8001"
echo ""
