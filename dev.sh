#!/bin/bash

###############################################################################
# 开发环境启动脚本
# 用途: 在开发环境启动项目，自动检查配置和依赖
# 使用方法: ./dev.sh
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_header() {
    echo -e "${CYAN}$1${NC}"
}

clear

echo ""
log_header "=========================================="
log_header "  财务数据平台 - 开发环境启动"
log_header "=========================================="
echo ""

# 1. 检查 Node.js
log_info "检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js 版本: ${NODE_VERSION}"

# 2. 检查包管理器
log_info "检查包管理器..."
if command -v pnpm &> /dev/null; then
    PKG_MANAGER="pnpm"
    PKG_VERSION=$(pnpm -v)
    log_success "使用 pnpm 版本: ${PKG_VERSION}"
elif command -v npm &> /dev/null; then
    PKG_MANAGER="npm"
    PKG_VERSION=$(npm -v)
    log_success "使用 npm 版本: ${PKG_VERSION}"
else
    log_error "未找到包管理器 (npm/pnpm)"
    exit 1
fi

# 3. 检查依赖
log_info "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    log_warning "依赖未安装，正在安装..."
    $PKG_MANAGER install
    log_success "依赖安装完成"
else
    log_success "依赖已安装"
fi

# 4. 检查环境变量文件
log_info "检查环境配置..."
if [ -f ".env" ]; then
    log_success ".env 文件存在"
else
    log_warning ".env 文件不存在，使用默认配置"
fi

# 5. 检查文档管理配置
log_info "检查文档管理 API 配置..."
if [ -f "fake/document.fake.ts" ]; then
    log_warning "fake/document.fake.ts 存在，文档管理将使用 Mock 数据"
    log_warning "如需使用真实 API，请删除此文件"
else
    log_success "文档管理将使用真实后端 API"
fi

# 6. 检查端口占用
log_info "检查端口 3333..."
if command -v lsof &> /dev/null; then
    if lsof -Pi :3333 -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warning "端口 3333 已被占用"
        log_info "尝试终止占用进程..."
        lsof -ti:3333 | xargs kill -9 2>/dev/null || true
        sleep 1
        log_success "端口已释放"
    else
        log_success "端口 3333 可用"
    fi
elif command -v netstat &> /dev/null; then
    if netstat -an | grep :3333 | grep LISTEN >/dev/null 2>&1; then
        log_warning "端口 3333 已被占用，请手动终止占用进程"
    else
        log_success "端口 3333 可用"
    fi
else
    log_info "无法检查端口占用（跳过）"
fi

# 7. 显示配置信息
echo ""
log_header "=========================================="
log_header "  配置信息"
log_header "=========================================="
echo ""
echo "  开发服务器: http://localhost:3333"
echo "  网络访问:   http://$(hostname -I | awk '{print $1}'):3333"
echo "  后端 API:   http://121.196.147.222:8000"
echo ""
echo "  文档管理:"
if [ -f "fake/document.fake.ts" ]; then
    echo "    - 使用 Mock 数据"
else
    echo "    - 使用真实后端 API"
fi
echo ""
echo "  其他模块:"
echo "    - 使用 Mock 数据（用户、权限、通知等）"
echo ""
log_header "=========================================="
echo ""

# 8. 启动开发服务器
log_info "启动开发服务器..."
echo ""
log_success "开发服务器启动中..."
echo ""
log_info "按 Ctrl+C 停止服务器"
echo ""

# 启动 Vite 开发服务器
$PKG_MANAGER run dev
