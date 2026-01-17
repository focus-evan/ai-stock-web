#!/bin/bash

###############################################################################
# 回滚脚本
# 用途: 快速回滚到之前的版本
# 使用方法: ./scripts/rollback.sh [备份文件名]
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
SERVER_USER="root"
SERVER_HOST="121.196.147.222"
SERVER_PORT="22"
PROJECT_NAME="financial-data-platform"
REMOTE_DIR="/var/www/html/${PROJECT_NAME}"
BACKUP_DIR="${REMOTE_DIR}/../backups"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 列出可用的备份
list_backups() {
    log_info "获取可用的备份列表..."
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
        cd ${BACKUP_DIR}
        echo "可用的备份文件:"
        echo "----------------------------------------"
        ls -lht ${PROJECT_NAME}_*.tar.gz | awk '{print NR". "$9" ("$5", "$6" "$7" "$8")"}'
EOF
}

# 执行回滚
perform_rollback() {
    local backup_file=$1
    
    log_info "开始回滚到: ${backup_file}"
    
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} << EOF
        set -e
        
        # 备份当前版本
        if [ -d "${REMOTE_DIR}" ]; then
            timestamp=\$(date +%Y%m%d_%H%M%S)
            tar -czf ${BACKUP_DIR}/rollback_before_\${timestamp}.tar.gz -C ${REMOTE_DIR} .
            echo "当前版本已备份"
        fi
        
        # 清空当前目录
        rm -rf ${REMOTE_DIR}/*
        
        # 解压备份文件
        tar -xzf ${BACKUP_DIR}/${backup_file} -C ${REMOTE_DIR}
        
        # 设置权限
        chown -R www-data:www-data ${REMOTE_DIR}
        chmod -R 755 ${REMOTE_DIR}
        
        echo "回滚完成"
EOF
    
    log_success "回滚成功！"
}

# 主函数
main() {
    echo ""
    echo "=========================================="
    echo "  版本回滚工具"
    echo "=========================================="
    echo ""
    
    # 如果提供了备份文件名
    if [ -n "$1" ]; then
        perform_rollback "$1"
    else
        # 列出备份并让用户选择
        list_backups
        echo ""
        read -p "请输入要回滚的备份文件名 (或按Enter回滚到最新备份): " backup_file
        
        if [ -z "$backup_file" ]; then
            # 获取最新的备份
            backup_file=$(ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_HOST} "cd ${BACKUP_DIR} && ls -t ${PROJECT_NAME}_*.tar.gz | head -n 1")
            log_info "使用最新备份: ${backup_file}"
        fi
        
        perform_rollback "$backup_file"
    fi
    
    echo ""
    log_success "回滚操作完成！"
    echo "访问地址: http://${SERVER_HOST}"
    echo ""
}

main "$@"
