#!/bin/bash

###############################################################################
# 快速部署脚本 - 修复文档管理错误
# 用途: 在服务器上快速重新构建和部署
# 使用方法: sudo ./deploy-config.sh
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "=========================================="
echo "  快速部署 - 修复文档管理错误"
echo "=========================================="
echo ""

# 1. 拉取最新代码
log_info "步骤 1/7: 拉取最新代码..."
git pull
log_success "代码已更新"

# 2. 清理构建缓存
log_info "步骤 2/7: 清理构建缓存..."
rm -rf build/
rm -rf node_modules/.vite
log_success "缓存已清理"

# 3. 检查环境变量
log_info "步骤 3/7: 检查环境变量..."
if grep -q "VITE_API_BASE_URL" .env.production; then
    log_success "环境变量配置正确"
else
    log_error "缺少 VITE_API_BASE_URL 配置"
    exit 1
fi

# 4. 构建项目
log_info "步骤 4/7: 构建项目..."
npm run build
log_success "构建完成"

# 5. 检查构建产物
log_info "步骤 5/7: 检查构建产物..."
if [ -d "build" ] && [ -f "build/index.html" ]; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    log_success "构建产物大小: ${BUILD_SIZE}"
else
    log_error "构建产物不存在"
    exit 1
fi

# 6. 部署文件
log_info "步骤 6/7: 部署文件..."
./deploy-local.sh
log_success "文件已部署"

# 7. 验证部署
log_info "步骤 7/7: 验证部署..."
if [ -f "/var/www/html/financial-data-platform/index.html" ]; then
    log_success "部署验证通过"
else
    log_error "部署验证失败"
    exit 1
fi

echo ""
echo "=========================================="
log_success "部署完成！"
echo "=========================================="
echo ""
echo "访问地址: http://121.196.147.222"
echo ""
echo "⚠️  重要提示："
echo "1. 在浏览器中按 Ctrl+Shift+R 清除缓存"
echo "2. 打开开发者工具 (F12) 查看 Network 标签"
echo "3. 确认请求 URL 是 /api/collections 而不是 /"
echo "4. 确认响应状态是 200 而不是 304"
echo ""
echo "=========================================="
