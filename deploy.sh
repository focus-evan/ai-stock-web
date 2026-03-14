#!/bin/bash

###############################################################################
# 生产环境构建部署脚本
# 用途: 拉取最新代码，构建生产版本，部署到 nginx
# 使用方法:
#   ./deploy.sh          - 完整构建部署
#   ./deploy.sh build    - 仅构建不部署
#   ./deploy.sh deploy   - 仅部署（使用已有构建产物）
###############################################################################

set -e

# ==================== 配置 ====================
NGINX_WEB_ROOT="/usr/share/nginx/html"   # nginx 静态文件目录
BACKUP_DIR="/data/backups/ai-stock-web"  # 备份目录
PORT=80                                   # nginx 端口

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

# ==================== 检测 nginx 配置 ====================
detect_nginx_root() {
    # 尝试从 nginx 配置中自动检测 root 目录
    if command -v nginx &> /dev/null; then
        # 查找包含 ai-stock 或 3666 或 默认的 server 配置
        local detected_root=""

        # 方法1: 检查 conf.d 目录
        for conf_file in /etc/nginx/conf.d/*.conf /etc/nginx/sites-enabled/*; do
            if [ -f "$conf_file" ]; then
                local root_line=$(grep -E '^\s*root\s+' "$conf_file" 2>/dev/null | head -1)
                if [ -n "$root_line" ]; then
                    detected_root=$(echo "$root_line" | awk '{print $2}' | tr -d ';')
                    break
                fi
            fi
        done

        # 方法2: 检查默认配置
        if [ -z "$detected_root" ]; then
            detected_root=$(nginx -T 2>/dev/null | grep -E '^\s*root\s+' | head -1 | awk '{print $2}' | tr -d ';')
        fi

        if [ -n "$detected_root" ] && [ "$detected_root" != "$NGINX_WEB_ROOT" ]; then
            log_warning "检测到 nginx root 目录: $detected_root"
            log_warning "脚本配置的目录: $NGINX_WEB_ROOT"
            NGINX_WEB_ROOT="$detected_root"
            log_info "使用检测到的目录: $NGINX_WEB_ROOT"
        fi
    fi
}

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

    # 检查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        log_warning "依赖未安装，正在安装..."
        $PKG_MANAGER install
        log_success "依赖安装完成"
    else
        # 检查 package.json 是否有变化
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
    log_header "  开始构建生产版本"
    log_header "=========================================="
    echo ""

    # 检查环境变量文件
    if [ ! -f ".env.production" ]; then
        log_error "缺少 .env.production 文件"
        exit 1
    fi
    log_success ".env.production 存在"
    grep "VITE_API_BASE_URL" .env.production || log_warning "未找到 VITE_API_BASE_URL"

    # 构建
    log_info "执行构建 ($PKG_MANAGER run build)..."
    local start_time=$(date +%s)

    $PKG_MANAGER run build

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    if [ -d "dist" ]; then
        local dist_size=$(du -sh dist | cut -f1)
        log_success "构建完成！耗时 ${duration}s，产物大小: ${dist_size}"
    else
        log_error "构建失败：dist 目录不存在"
        exit 1
    fi
    echo ""
}

# ==================== 部署 ====================
deploy_to_nginx() {
    log_header "=========================================="
    log_header "  部署到 nginx"
    log_header "=========================================="
    echo ""

    if [ ! -d "dist" ]; then
        log_error "dist 目录不存在，请先执行构建"
        exit 1
    fi

    detect_nginx_root

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
    cp -r dist/* "$NGINX_WEB_ROOT/"
    log_success "文件已复制"

    # 重新加载 nginx
    if command -v nginx &> /dev/null; then
        log_info "重新加载 nginx..."
        nginx -t 2>&1 && nginx -s reload
        log_success "nginx 已重新加载"
    else
        log_warning "nginx 未安装，请手动部署"
    fi

    echo ""
    log_success "部署完成！"
    echo ""
    echo "  访问地址: http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}"
    echo ""
}

# ==================== 完整流程 ====================
full_deploy() {
    echo ""
    log_header "=========================================="
    log_header "  价值投资-Agent 前端生产部署"
    log_header "=========================================="
    echo ""

    pull_code
    install_deps
    build_project
    deploy_to_nginx

    log_header "=========================================="
    log_header "  部署完成！"
    log_header "=========================================="
    echo ""
}

# ==================== 主函数 ====================
main() {
    ACTION=${1:-full}

    case "$ACTION" in
        full|"")
            full_deploy
            ;;
        build)
            pull_code
            install_deps
            build_project
            log_success "构建完成，使用 './deploy.sh deploy' 部署"
            ;;
        deploy)
            deploy_to_nginx
            ;;
        *)
            echo "用法: $0 {full|build|deploy}"
            echo ""
            echo "命令说明:"
            echo "  full    - 完整流程：拉取代码 → 安装依赖 → 构建 → 部署 (默认)"
            echo "  build   - 仅拉取代码并构建"
            echo "  deploy  - 仅部署已有的 dist 目录到 nginx"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
