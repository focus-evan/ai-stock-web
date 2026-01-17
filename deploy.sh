#!/bin/bash

###############################################################################
# 阿里云ECS自动化部署脚本
# 用途: 自动构建并部署React前端项目到阿里云ECS服务器
# 使用方法: ./deploy.sh [环境] 
# 示例: ./deploy.sh production
###############################################################################

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
ENVIRONMENT=${1:-production}  # 默认为生产环境
PROJECT_NAME="financial-data-platform"
BUILD_DIR="dist"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

# 服务器配置 (请根据实际情况修改)
SERVER_USER="root"
SERVER_HOST="121.196.147.222"
SERVER_PORT="22"
REMOTE_DIR="/var/www/html/${PROJECT_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${PROJECT_NAME}"

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
    
    local required_commands=("node" "pnpm" "ssh" "rsync")
    for cmd in "${required_commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd 未安装，请先安装"
            exit 1
        fi
    done
    
    log_success "环境检查通过"
}

# 检查SSH连接
check_ssh_connection() {
    log_info "检查SSH连接..."
    
    if ssh -p ${SERVER_PORT} -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_HOST} "echo 'SSH连接成功'" &> /dev/null; then
        log_success "SSH连接正常"
    else
        log_error "无法连接到服务器，请检查SSH配置"
        exit 1
    fi
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
    
    if [ ! -d "node_modules" ]; then
        pnpm install
    else
        log_info "依赖已存在，跳过安装"
    fi
    
    log_success "依赖安装完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    if pnpm test -- --run; then
        log_success "测试通过"
    else
        log_warning "测试失败，但继续部署"
    fi
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

# 备份服务器上的旧版本
backup_remote() {
    log_info "备份服务器上的旧版本..."
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
        if [ -d "${REMOTE_DIR}" ]; then
            mkdir -p ${REMOTE_DIR}/../${BACKUP_DIR}
            tar -czf ${REMOTE_DIR}/../${BACKUP_DIR}/${PROJECT_NAME}_${TIMESTAMP}.tar.gz -C ${REMOTE_DIR} . 2>/dev/null || true
            echo "备份完成: ${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
            
            # 只保留最近5个备份
            cd ${REMOTE_DIR}/../${BACKUP_DIR}
            ls -t ${PROJECT_NAME}_*.tar.gz | tail -n +6 | xargs -r rm
        else
            echo "远程目录不存在，跳过备份"
        fi
EOF
    
    log_success "备份完成"
}

# 上传文件到服务器
upload_files() {
    log_info "上传文件到服务器..."
    
    # 确保远程目录存在
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${REMOTE_DIR}"
    
    # 使用rsync同步文件
    rsync -avz --delete \
        -e "ssh -p ${SERVER_PORT}" \
        --progress \
        ${BUILD_DIR}/ \
        ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/
    
    log_success "文件上传完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << 'EOF'
        # 检查Nginx配置文件是否存在
        if [ ! -f "/etc/nginx/sites-available/financial-data-platform" ]; then
            cat > /etc/nginx/sites-available/financial-data-platform << 'NGINX_CONF'
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
            ln -sf /etc/nginx/sites-available/financial-data-platform /etc/nginx/sites-enabled/
            
            echo "Nginx配置文件已创建"
        else
            echo "Nginx配置文件已存在"
        fi
        
        # 测试Nginx配置
        nginx -t
        
        # 重载Nginx
        systemctl reload nginx
        
        echo "Nginx配置完成"
EOF
    
    log_success "Nginx配置完成"
}

# 设置文件权限
set_permissions() {
    log_info "设置文件权限..."
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
        chown -R www-data:www-data ${REMOTE_DIR}
        chmod -R 755 ${REMOTE_DIR}
        echo "权限设置完成"
EOF
    
    log_success "权限设置完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "尝试访问应用 (${attempt}/${max_attempts})..."
        
        if curl -f -s -o /dev/null http://${SERVER_HOST}; then
            log_success "应用访问正常"
            return 0
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warning "健康检查失败，但部署已完成"
}

# 回滚到上一个版本
rollback() {
    log_warning "开始回滚..."
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
        cd ${REMOTE_DIR}/../${BACKUP_DIR}
        latest_backup=\$(ls -t ${PROJECT_NAME}_*.tar.gz | head -n 1)
        
        if [ -n "\$latest_backup" ]; then
            rm -rf ${REMOTE_DIR}/*
            tar -xzf \$latest_backup -C ${REMOTE_DIR}
            echo "回滚完成: \$latest_backup"
        else
            echo "没有可用的备份文件"
            exit 1
        fi
EOF
    
    log_success "回滚完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "=========================================="
    log_success "部署完成！"
    echo "=========================================="
    echo "环境: ${ENVIRONMENT}"
    echo "服务器: ${SERVER_HOST}"
    echo "访问地址: http://${SERVER_HOST}"
    echo "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  财务数据平台 - 自动化部署脚本"
    echo "=========================================="
    echo ""
    
    # 执行部署流程
    check_requirements
    check_ssh_connection
    clean_build
    install_dependencies
    # run_tests  # 可选：运行测试
    build_project
    backup_remote
    upload_files
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
