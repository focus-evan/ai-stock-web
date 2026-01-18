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

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo ""
echo "=========================================="
echo "  快速部署 - 修复文档管理错误"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    log_error "请使用 root 权限运行此脚本"
    log_info "使用: sudo ./deploy-config.sh"
    exit 1
fi

# 1. 拉取最新代码
log_info "步骤 1/8: 拉取最新代码..."
git pull
log_success "代码已更新"

# 2. 清理构建缓存
log_info "步骤 2/8: 清理构建缓存..."
rm -rf build/
rm -rf node_modules/.vite
rm -f tsconfig.tsbuildinfo
log_success "缓存已清理"

# 3. 检查环境变量
log_info "步骤 3/8: 检查环境变量..."
if grep -q "VITE_API_BASE_URL" .env.production; then
    API_BASE_URL=$(grep "VITE_API_BASE_URL" .env.production | cut -d'=' -f2 | tr -d ' "')
    log_success "环境变量配置正确: VITE_API_BASE_URL = ${API_BASE_URL}"
else
    log_error "缺少 VITE_API_BASE_URL 配置"
    exit 1
fi

# 4. 检查文档管理配置
log_info "步骤 4/8: 检查文档管理配置..."
if [ -f "fake/document.fake.ts" ]; then
    log_error "fake/document.fake.ts 仍然存在！"
    log_error "文档管理将使用 Mock 数据而不是真实 API"
    log_info "请删除此文件: rm fake/document.fake.ts"
    exit 1
else
    log_success "fake/document.fake.ts 不存在（正确）"
fi

# 5. 检查包管理器
log_info "步骤 5/8: 检查包管理器..."
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

# 6. 构建项目
log_info "步骤 6/8: 构建项目..."
log_info "使用 ${PKG_MANAGER} 构建..."
$PKG_MANAGER run build
log_success "构建完成"

# 7. 检查构建产物
log_info "步骤 7/8: 检查构建产物..."
if [ -d "build" ] && [ -f "build/index.html" ]; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    log_success "构建产物大小: ${BUILD_SIZE}"
    
    # 显示主要 JS 文件
    log_info "主要文件:"
    ls -lh build/assets/*.js 2>/dev/null | head -3 | awk '{print "  - " $9 " (" $5 ")"}'
else
    log_error "构建产物不存在"
    exit 1
fi

# 8. 部署文件
log_info "步骤 8/8: 部署文件..."
./deploy-local.sh
log_success "文件已部署"

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
echo "5. 确认响应数据格式是真实 API 返回的格式"
echo ""
echo "✅ 预期结果:"
echo "   GET http://121.196.147.222/api/collections"
echo "   Status: 200 OK"
echo "   Response: {\"status\":\"success\",\"collections\":[...]}"
echo ""
echo "=========================================="
