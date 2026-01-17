#!/bin/bash

###############################################################################
# 本地部署脚本（在服务器上直接执行）
# 用途: 在阿里云ECS服务器上直接构建和部署
# 使用方法: ./deploy-local.sh [环境]
# 示例: ./deploy-local.sh production
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
ENVIRONMENT=${1:-production}
PROJECT_NAME="financial-data-platform"
BUILD_DIR="build"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
DEPLOY_DIR="/var/www/html/${PROJECT_NAME}"

# 日志函数
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

# 检查必要的命令
check_requirements() {
    log_info "检查部署环境..."
    
    local required_commands=("node" "pnpm")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd 未安装，请先安装"
            exit 1
        fi
    done
    
    log_success "环境检查通过"
}

# 清理旧的构建文件
clean_build() {
    log_info "清理旧的构建文件..."
    
    if [ -d "$BUILD_DIR" ]; then
        rm -rf $BUILD_DIR
        log_success "清理完成"
    else
        log_info "没有需要清理的文件"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    pnpm install
    
    log_success "依赖安装完成"
}

# 构建项目
build_project() {
    log_info "开始构建项目 (环境: ${ENVIRONMENT})..."
    
    # 设置环境变量
    export NODE_ENV=${ENVIRONMENT}
    
    # 执行构建
    if pnpm build; then
        log_success "构建完成"
    else
        log_error "构建失败"
        exit 1
    fi
    
    # 检查构建产物
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "构建目录不存在"
        exit 1
    fi
    
    # 显示构建产物大小
    local build_size=$(du -sh $BUILD_DIR | cut -f1)
    log_info "构建产物大小: ${build_size}"
}

# 备份当前版本
backup_current() {
    log_info "备份当前版本..."
    
    if [ -d "${DEPLOY_DIR}" ] && [ "$(ls -A ${DEPLOY_DIR})" ]; then
        mkdir -p ${DEPLOY_DIR}/../${BACKUP_DIR}
        tar -czf ${DEPLOY_DIR}/../${BACKUP_DIR}/${PROJECT_NAME}_${TIMESTAMP}.tar.gz -C ${DEPLOY_DIR} . 2>/dev/null || true
        log_success "备份完成: ${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
        
        # 只保留最近5个备份
        cd ${DEPLOY_DIR}/../${BACKUP_DIR}
        ls -t ${PROJECT_NAME}_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
        cd - > /dev/null
    else
        log_info "部署目录为空，跳过备份"
    fi
}

# 部署文件
deploy_files() {
    log_info "部署文件..."
    
    # 确保部署目录存在
    mkdir -p ${DEPLOY_DIR}
    
    # 清空部署目录
    rm -rf ${DEPLOY_DIR}/*
    
    # 复制构建产物
    cp -r ${BUILD_DIR}/* ${DEPLOY_DIR}/
    
    log_success "文件部署完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    # 检查Nginx配置文件是否存在
    if [ ! -f "/etc/nginx/sites-available/${PROJECT_NAME}" ]; then
        cat > /etc/nginx/sites-available/${PROJECT_NAME} << 'NGINX_CONF'
server {
    listen 80;
    server_name _;
    
    root /var/www/html/financial-data-platform;
    index index.html;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
    
    # 静态资源缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://121.196.147.222:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX_CONF
        
        # 创建软链接
        ln -sf /etc/nginx/sites-available/${PROJECT_NAME} /etc/nginx/sites-enabled/
        
        log_info "Nginx配置文件已创建"
    else
        log_info "Nginx配置文件已存在"
    fi
    
    # 测试Nginx配置
    if nginx -t; then
        log_success "Nginx配置测试通过"
    else
        log_error "Nginx配置测试失败"
        exit 1
    fi
    
    # 重载Nginx
    systemctl reload nginx
    
    log_success "Nginx配置完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    chown -R www-data:www-data ${DEPLOY_DIR}
    chmod -R 755 ${DEPLOY_DIR}
    
    log_success "权限设置完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "尝试访问应用 (${attempt}/${max_attempts})..."
        
        if curl -f -s -o /dev/null http://localhost; then
            log_success "应用访问正常"
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "健康检查失败，但部署已完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=========================================="
    log_success "部署完成！"
    echo "=========================================="
    echo "环境: ${ENVIRONMENT}"
    echo "部署目录: ${DEPLOY_DIR}"
    echo "访问地址: http://121.196.147.222"
    echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  财务数据平台 - 本地部署脚本"
    echo "=========================================="
    echo ""
    
    # 检查是否为root用户
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用root权限运行此脚本"
        log_info "使用: sudo ./deploy-local.sh"
        exit 1
    fi
    
    # 执行部署流程
    check_requirements
    clean_build
    install_dependencies
    build_project
    backup_current
    deploy_files
    configure_nginx
    set_permissions
    health_check
    show_deployment_info
    
    log_success "所有部署步骤完成！"
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@"
