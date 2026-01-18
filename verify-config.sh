#!/bin/bash

###############################################################################
# 配置验证脚本 - 部署前检查
# 用途: 验证文档管理模块配置是否正确
# 使用方法: ./verify-config.sh
###############################################################################

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
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo ""
echo "=========================================="
echo "  配置验证 - 文档管理真实 API"
echo "=========================================="
echo ""

ERRORS=0

# 1. 检查 fake/document.fake.ts 是否已删除
log_info "检查 1/6: fake/document.fake.ts 文件状态"
if [ -f "fake/document.fake.ts" ]; then
    log_error "fake/document.fake.ts 仍然存在，需要删除"
    ERRORS=$((ERRORS + 1))
else
    log_success "fake/document.fake.ts 已删除（正确）"
fi

# 2. 检查 vite.config.ts 中的 enableProd 配置
log_info "检查 2/6: vite.config.ts 配置"
if grep -q "enableProd: true" vite.config.ts; then
    log_success "enableProd: true（其他模块使用 Mock）"
elif grep -q "enableProd: false" vite.config.ts; then
    log_warning "enableProd: false（所有模块都不使用 Mock）"
else
    log_error "找不到 enableProd 配置"
    ERRORS=$((ERRORS + 1))
fi

# 3. 检查 .env.production 配置
log_info "检查 3/6: .env.production 配置"
if [ -f ".env.production" ]; then
    if grep -q "VITE_API_BASE_URL" .env.production; then
        API_BASE_URL=$(grep "VITE_API_BASE_URL" .env.production | cut -d'=' -f2 | tr -d ' "')
        log_success "VITE_API_BASE_URL = ${API_BASE_URL}"
    else
        log_error "缺少 VITE_API_BASE_URL 配置"
        ERRORS=$((ERRORS + 1))
    fi
else
    log_error ".env.production 文件不存在"
    ERRORS=$((ERRORS + 1))
fi

# 4. 检查 src/api/document/index.ts 是否存在
log_info "检查 4/6: 文档管理 API 文件"
if [ -f "src/api/document/index.ts" ]; then
    log_success "src/api/document/index.ts 存在"
else
    log_error "src/api/document/index.ts 不存在"
    ERRORS=$((ERRORS + 1))
fi

# 5. 检查 src/pages/ai-assistant/documents/index.tsx 是否存在
log_info "检查 5/6: 文档管理页面文件"
if [ -f "src/pages/ai-assistant/documents/index.tsx" ]; then
    log_success "src/pages/ai-assistant/documents/index.tsx 存在"
else
    log_error "src/pages/ai-assistant/documents/index.tsx 不存在"
    ERRORS=$((ERRORS + 1))
fi

# 6. 检查是否有其他 fake 文件定义了文档管理路由
log_info "检查 6/6: 其他 fake 文件中的文档管理路由"
if grep -r "url.*['\"].*\(collections\|agent/upload\|agent/document\)" fake/*.fake.ts 2>/dev/null; then
    log_error "发现其他 fake 文件定义了文档管理路由"
    ERRORS=$((ERRORS + 1))
else
    log_success "没有其他 fake 文件定义文档管理路由"
fi

echo ""
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
    log_success "所有检查通过！配置正确。"
    echo ""
    echo "下一步："
    echo "1. 提交代码: git add . && git commit -m 'fix: 文档管理使用真实 API'"
    echo "2. 推送代码: git push"
    echo "3. 在服务器上部署: sudo ./deploy-config.sh"
    echo "4. 清除浏览器缓存: Ctrl + Shift + R"
    echo ""
    exit 0
else
    log_error "发现 ${ERRORS} 个问题，请修复后再部署"
    echo ""
    exit 1
fi

echo "=========================================="
