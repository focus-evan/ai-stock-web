#!/bin/bash

###############################################################################
# API 路径修复脚本
# 用途: 修复生产环境 API 请求路径问题
# 问题: 请求 URL 是 / 而不是 /api/collections
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "=========================================="
echo "  API 路径修复脚本"
echo "=========================================="
echo ""

# 1. 检查 .env.production
log_info "检查 .env.production 配置..."

if [ ! -f ".env.production" ]; then
    log_warning ".env.production 不存在，正在创建..."
    cat > .env.production << 'EOF'
# React Router Mode
VITE_ROUTER_MODE = hash

# 后端 API 前缀（生产环境通过 Nginx 代理）
VITE_API_BASE_URL = "/api"

# 登录之后默认跳转的路由
VITE_BASE_HOME_PATH = "/ai-assistant/qa"

# 网站标题
VITE_GLOB_APP_TITLE = "Financial Data Platform"

# 用于设置 Zustand 存储的前缀标识
VITE_APP_NAMESPACE = "react-antd-admin"

# 请求超时时间（毫秒）
VITE_API_TIMEOUT = 180000
EOF
    log_success ".env.production 已创建"
elif ! grep -q "VITE_API_BASE_URL" .env.production; then
    log_warning ".env.production 缺少 VITE_API_BASE_URL，正在添加..."
    echo '' >> .env.production
    echo '# 后端 API 前缀（生产环境通过 Nginx 代理）' >> .env.production
    echo 'VITE_API_BASE_URL = "/api"' >> .env.production
    log_success "VITE_API_BASE_URL 已添加"
else
    log_success ".env.production 配置正确"
fi

# 显示当前配置
log_info "当前 .env.production 配置："
grep "VITE_API_BASE_URL" .env.production || log_warning "未找到 VITE_API_BASE_URL"

# 2. 清理旧的构建
log_info "清理旧的构建文件..."
if [ -d "build" ]; then
    rm -rf build/
    log_success "旧构建已清理"
else
    log_info "没有需要清理的构建文件"
fi

# 清理 Vite 缓存
if [ -d "node_modules/.vite" ]; then
    log_info "清理 Vite 缓存..."
    rm -rf node_modules/.vite
    log_success "Vite 缓存已清理"
fi

# 3. 重新构建
log_info "开始重新构建..."
log_info "这可能需要几分钟时间..."

if npm run build; then
    log_success "构建完成"
else
    log_error "构建失败"
    exit 1
fi

# 4. 验证构建
log_info "验证构建产物..."

if [ ! -d "build" ]; then
    log_error "构建目录不存在"
    exit 1
fi

# 检查是否包含正确的 API 路径
if grep -r '"/api"' build/assets/*.js > /dev/null 2>&1; then
    log_success "✅ 构建包含正确的 API 路径"
else
    log_warning "⚠️  无法验证 API 路径，请手动检查"
fi

# 显示构建大小
BUILD_SIZE=$(du -sh build | cut -f1)
log_info "构建产物大小: ${BUILD_SIZE}"

# 5. 提示部署
echo ""
echo "=========================================="
log_success "构建完成！"
echo "=========================================="
echo ""
log_info "下一步操作："
echo "  1. 部署到服务器:"
echo "     sudo ./deploy-local.sh"
echo ""
echo "  2. 清除浏览器缓存:"
echo "     - 按 Ctrl+Shift+R (Windows/Linux)"
echo "     - 按 Cmd+Shift+R (Mac)"
echo "     - 或使用无痕模式测试"
echo ""
echo "  3. 验证修复:"
echo "     curl http://121.196.147.222/api/collections"
echo ""
echo "=========================================="

# 询问是否立即部署
read -p "是否立即部署到服务器? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "开始部署..."
    if [ "$EUID" -ne 0 ]; then
        log_info "需要 root 权限，使用 sudo..."
        sudo ./deploy-local.sh
    else
        ./deploy-local.sh
    fi
else
    log_info "跳过部署，请稍后手动执行: sudo ./deploy-local.sh"
fi

echo ""
log_success "脚本执行完成！"
