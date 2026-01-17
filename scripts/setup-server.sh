#!/bin/bash

###############################################################################
# 服务器初始化脚本
# 用途: 在阿里云ECS上初始化部署环境
# 使用方法: 在服务器上执行 bash setup-server.sh
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

# 更新系统
update_system() {
    log_info "更新系统包..."
    apt-get update
    apt-get upgrade -y
    log_success "系统更新完成"
}

# 安装Nginx
install_nginx() {
    log_info "安装Nginx..."
    
    if command -v nginx &> /dev/null; then
        log_info "Nginx已安装，跳过"
        return
    fi
    
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    
    log_success "Nginx安装完成"
}

# 安装Node.js (可选，如果需要在服务器上构建)
install_nodejs() {
    log_info "安装Node.js..."
    
    if command -v node &> /dev/null; then
        log_info "Node.js已安装，版本: $(node -v)"
        return
    fi
    
    # 安装nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
    
    # 加载nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # 安装Node.js LTS
    nvm install --lts
    nvm use --lts
    
    log_success "Node.js安装完成"
}

# 创建项目目录
create_directories() {
    log_info "创建项目目录..."
    
    mkdir -p /var/www/html/financial-data-platform
    mkdir -p /var/www/html/backups
    
    log_success "目录创建完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    # 安装ufw
    apt-get install -y ufw
    
    # 允许SSH
    ufw allow 22/tcp
    
    # 允许HTTP和HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # 允许后端API端口
    ufw allow 8000/tcp
    
    # 启用防火墙
    echo "y" | ufw enable
    
    log_success "防火墙配置完成"
}

# 配置Nginx基础设置
configure_nginx_base() {
    log_info "配置Nginx基础设置..."
    
    # 创建sites-available和sites-enabled目录
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    
    # 修改nginx.conf以包含sites-enabled
    if ! grep -q "include /etc/nginx/sites-enabled/\*;" /etc/nginx/nginx.conf; then
        sed -i '/http {/a \    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
    fi
    
    log_success "Nginx基础配置完成"
}

# 安装SSL证书工具 (可选)
install_certbot() {
    log_info "安装Certbot (Let's Encrypt)..."
    
    apt-get install -y certbot python3-certbot-nginx
    
    log_success "Certbot安装完成"
    log_info "使用以下命令获取SSL证书:"
    log_info "certbot --nginx -d your-domain.com"
}

# 设置自动更新
setup_auto_updates() {
    log_info "配置自动安全更新..."
    
    apt-get install -y unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades
    
    log_success "自动更新配置完成"
}

# 安装监控工具
install_monitoring() {
    log_info "安装监控工具..."
    
    # 安装htop
    apt-get install -y htop
    
    # 安装netdata (可选)
    # bash <(curl -Ss https://my-netdata.io/kickstart.sh)
    
    log_success "监控工具安装完成"
}

# 优化系统性能
optimize_system() {
    log_info "优化系统性能..."
    
    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65535
* hard nofile 65535
EOF
    
    # 优化网络参数
    cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
EOF
    
    sysctl -p
    
    log_success "系统优化完成"
}

# 创建部署用户 (可选)
create_deploy_user() {
    log_info "创建部署用户..."
    
    if id "deploy" &>/dev/null; then
        log_info "部署用户已存在"
        return
    fi
    
    useradd -m -s /bin/bash deploy
    usermod -aG sudo deploy
    
    # 设置SSH密钥认证
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    
    log_success "部署用户创建完成"
    log_info "请手动添加SSH公钥到 /home/deploy/.ssh/authorized_keys"
}

# 显示服务器信息
show_server_info() {
    echo ""
    echo "=========================================="
    log_success "服务器初始化完成！"
    echo "=========================================="
    echo "操作系统: $(lsb_release -d | cut -f2)"
    echo "Nginx版本: $(nginx -v 2>&1 | cut -d'/' -f2)"
    echo "项目目录: /var/www/html/financial-data-platform"
    echo "Nginx配置: /etc/nginx/sites-available/"
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  阿里云ECS服务器初始化脚本"
    echo "=========================================="
    echo ""
    
    # 检查是否为root用户
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用root权限运行此脚本"
        exit 1
    fi
    
    update_system
    install_nginx
    # install_nodejs  # 如果需要在服务器上构建，取消注释
    create_directories
    configure_firewall
    configure_nginx_base
    # install_certbot  # 如果需要SSL，取消注释
    setup_auto_updates
    install_monitoring
    optimize_system
    # create_deploy_user  # 如果需要专用部署用户，取消注释
    show_server_info
    
    log_success "所有初始化步骤完成！"
}

# 执行主函数
main "$@"
