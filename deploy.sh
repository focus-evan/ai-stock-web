#!/bin/bash

###############################################################################
# 生产环境构建部署脚本
# 用途: 拉取最新代码，构建生产版本，部署到 nginx
#
# 使用方法:
#   ./deploy.sh           - 部署 dev  分支前端（默认，PORT=3666）
#   ./deploy.sh dev       - 部署 dev  分支前端（PORT=3666）
#   ./deploy.sh main      - 部署 main 分支前端（PORT=3667）
#   ./deploy.sh build     - 仅构建不部署
#
# ⚠️  重要：dev 和 main 前端使用完全隔离的 nginx 目录和端口，
#     绝对不会互相覆盖！
###############################################################################

set -e

# ==================== 环境参数 ====================
ENV=${1:-dev}       # dev | main，决定端口和部署目录

case "$ENV" in
    dev)
        NGINX_WEB_ROOT="/var/www/html/ai-stock-web-dev"   # dev 前端静态文件目录
        PORT=3666                                           # dev 前端端口
        ;;
    main)
        NGINX_WEB_ROOT="/var/www/html/ai-stock-web-main"  # main 前端静态文件目录
        PORT=3667                                           # main 前端端口
        ;;
    build)
        # 仅构建模式，不实际部署
        NGINX_WEB_ROOT=""
        PORT=0
        ;;
    *)
        echo "用法: $0 {dev|main|build}"
        echo ""
        echo "命令说明:"
        echo "  dev    - 部署 dev  分支前端（PORT=3666，目录=ai-stock-web-dev）"
        echo "  main   - 部署 main 分支前端（PORT=3667，目录=ai-stock-web-main）"
        echo "  build  - 仅构建，不部署"
        echo ""
        exit 1
        ;;
esac

BACKUP_DIR="/data/backups/ai-stock-web-${ENV}"

# ==================== 颜色 ====================
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

# ==================== 拉取代码 ====================
pull_code() {
    log_info "拉取最新代码..."
    git pull
    log_success "代码已更新"

    # 显示最近的提交
    log_info "最近提交:"
    git log --oneline -3
    echo ""
}

# ==================== 安装依赖 ====================
install_deps() {
    log_info "检查依赖..."

    # 检测包管理器
    if command -v pnpm &> /dev/null; then
        PKG_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        PKG_MANAGER="npm"
    else
        log_error "未找到包管理器 (npm/pnpm)"
        exit 1
    fi
    log_info "使用 $PKG_MANAGER"

    if [ ! -d "node_modules" ]; then
        log_warning "依赖未安装，正在安装..."
        $PKG_MANAGER install
        log_success "依赖安装完成"
    else
        if [ "$(git diff HEAD~1 --name-only 2>/dev/null | grep -c 'package.json\|pnpm-lock')" -gt 0 ]; then
            log_warning "依赖文件有变化，重新安装..."
            $PKG_MANAGER install
            log_success "依赖更新完成"
        else
            log_success "依赖已是最新"
        fi
    fi
}

# ==================== 构建 ====================
build_project() {
    log_header "=========================================="
    log_header "  开始构建生产版本（环境: ${ENV}）"
    log_header "=========================================="
    echo ""

    if [ ! -f ".env.production" ]; then
        log_error "缺少 .env.production 文件"
        exit 1
    fi
    log_success ".env.production 存在"
    grep "VITE_API_BASE_URL" .env.production || log_warning "未找到 VITE_API_BASE_URL"

    log_info "执行构建 ($PKG_MANAGER run build)..."
    local start_time=$(date +%s)

    $PKG_MANAGER run build

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ -d "build" ]; then
        local build_size=$(du -sh build | cut -f1)
        log_success "构建完成！耗时 ${duration}s，产物大小: ${build_size}"
    else
        log_error "构建失败：build 目录不存在"
        exit 1
    fi
    echo ""
}

# ==================== 部署 ====================
deploy_to_nginx() {
    log_header "=========================================="
    log_header "  部署到 nginx（环境: ${ENV}，端口: ${PORT}）"
    log_header "=========================================="
    echo ""

    if [ ! -d "build" ]; then
        log_error "build 目录不存在，请先执行构建"
        exit 1
    fi

    # ⚠️ 安全确认：打印目标目录，绝对不自动探测
    log_warning "目标部署目录: ${NGINX_WEB_ROOT}"
    log_warning "（此目录只属于 ${ENV} 分支，不会影响另一个分支）"
    echo ""

    # 创建备份
    if [ -d "$NGINX_WEB_ROOT" ] && [ "$(ls -A $NGINX_WEB_ROOT 2>/dev/null)" ]; then
        mkdir -p "$BACKUP_DIR"
        local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
        log_info "备份当前版本到 ${BACKUP_DIR}/${backup_name}..."
        cp -r "$NGINX_WEB_ROOT" "${BACKUP_DIR}/${backup_name}" 2>/dev/null || true
        log_success "备份完成"

        # 只保留最近 5 个备份
        cd "$BACKUP_DIR"
        ls -dt backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
        cd - > /dev/null
    fi

    # 部署新版本
    log_info "部署构建产物到 ${NGINX_WEB_ROOT}..."
    mkdir -p "$NGINX_WEB_ROOT"
    rm -rf "${NGINX_WEB_ROOT:?}"/*
    cp -r build/* "$NGINX_WEB_ROOT/"
    log_success "文件已复制"

    # 重载 nginx
    if command -v nginx &> /dev/null; then
        if nginx -T 2>/dev/null | grep -q "listen ${PORT}"; then
            log_info "重新加载 nginx..."
            nginx -t 2>&1 && nginx -s reload
            log_success "nginx 已重新加载"
        else
            log_warning "nginx 中未找到监听 ${PORT} 端口的 server block！"
            log_warning "请在 /etc/nginx/conf.d/ 添加如下配置后手动 reload："
            echo ""
            echo "  # /etc/nginx/conf.d/ai-stock-web-${ENV}.conf"
            echo "  server {"
            echo "      listen ${PORT};"
            echo "      root ${NGINX_WEB_ROOT};"
            echo "      index index.html;"
            echo "      location / { try_files \$uri \$uri/ /index.html; }"
            echo "  }"
            echo ""
        fi
    else
        log_warning "nginx 未安装，请手动配置"
    fi

    echo ""
    log_success "部署完成！"
    echo ""
    echo "  环境:     ${ENV}"
    echo "  端口:     ${PORT}"
    echo "  目录:     ${NGINX_WEB_ROOT}"
    echo "  访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}"
    echo ""
}

# ==================== 主函数 ====================
main() {
    echo ""
    log_header "=========================================="
    log_header "  ai-stock 前端部署 [${ENV}]"
    log_header "=========================================="
    echo ""

    case "$ENV" in
        build)
            pull_code
            install_deps
            build_project
            log_success "构建完成，使用 './deploy.sh dev' 或 './deploy.sh main' 部署"
            ;;
        dev|main)
            pull_code
            install_deps
            build_project
            deploy_to_nginx
            ;;
    esac
}

main
