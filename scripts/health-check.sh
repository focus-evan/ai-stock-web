#!/bin/bash

###############################################################################
# 健康检查脚本
# 用途: 检查应用和服务器的健康状态
# 使用方法: ./scripts/health-check.sh
###############################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 配置
SERVER_HOST="121.196.147.222"
API_HOST="http://121.196.147.222:8000"
FRONTEND_URL="http://${SERVER_HOST}"

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

# 检查前端应用
check_frontend() {
    log_info "检查前端应用..."
    
    if curl -f -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL} | grep -q "200"; then
        log_success "前端应用正常 (${FRONTEND_URL})"
        return 0
    else
        log_error "前端应用无法访问"
        return 1
    fi
}

# 检查后端API
check_backend() {
    log_info "检查后端API..."
    
    local health_endpoint="${API_HOST}/health"
    
    if curl -f -s -o /dev/null -w "%{http_code}" ${health_endpoint} | grep -q "200"; then
        log_success "后端API正常 (${health_endpoint})"
        return 0
    else
        log_error "后端API无法访问"
        return 1
    fi
}

# 检查响应时间
check_response_time() {
    log_info "检查响应时间..."
    
    local response_time=$(curl -o /dev/null -s -w '%{time_total}' ${FRONTEND_URL})
    local response_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time < 2" | bc -l) )); then
        log_success "响应时间正常: ${response_ms}ms"
    else
        log_warning "响应时间较慢: ${response_ms}ms"
    fi
}

# 检查SSL证书 (如果启用了HTTPS)
check_ssl() {
    log_info "检查SSL证书..."
    
    if echo | openssl s_client -servername ${SERVER_HOST} -connect ${SERVER_HOST}:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        log_success "SSL证书有效"
    else
        log_info "未启用HTTPS或证书无效"
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_info "检查服务器磁盘空间..."
    
    ssh root@${SERVER_HOST} << 'EOF'
        disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
        
        if [ $disk_usage -lt 80 ]; then
            echo -e "\033[0;32m[✓]\033[0m 磁盘空间充足: ${disk_usage}%"
        elif [ $disk_usage -lt 90 ]; then
            echo -e "\033[1;33m[!]\033[0m 磁盘空间警告: ${disk_usage}%"
        else
            echo -e "\033[0;31m[✗]\033[0m 磁盘空间不足: ${disk_usage}%"
        fi
EOF
}

# 检查内存使用
check_memory() {
    log_info "检查服务器内存使用..."
    
    ssh root@${SERVER_HOST} << 'EOF'
        mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
        
        if [ $mem_usage -lt 80 ]; then
            echo -e "\033[0;32m[✓]\033[0m 内存使用正常: ${mem_usage}%"
        elif [ $mem_usage -lt 90 ]; then
            echo -e "\033[1;33m[!]\033[0m 内存使用较高: ${mem_usage}%"
        else
            echo -e "\033[0;31m[✗]\033[0m 内存使用过高: ${mem_usage}%"
        fi
EOF
}

# 检查Nginx状态
check_nginx() {
    log_info "检查Nginx状态..."
    
    ssh root@${SERVER_HOST} << 'EOF'
        if systemctl is-active --quiet nginx; then
            echo -e "\033[0;32m[✓]\033[0m Nginx运行正常"
        else
            echo -e "\033[0;31m[✗]\033[0m Nginx未运行"
        fi
EOF
}

# 检查进程
check_processes() {
    log_info "检查关键进程..."
    
    ssh root@${SERVER_HOST} << 'EOF'
        # 检查Nginx进程
        if pgrep nginx > /dev/null; then
            echo -e "\033[0;32m[✓]\033[0m Nginx进程正常"
        else
            echo -e "\033[0;31m[✗]\033[0m Nginx进程未运行"
        fi
        
        # 检查Python进程 (后端API)
        if pgrep -f "python.*uvicorn" > /dev/null; then
            echo -e "\033[0;32m[✓]\033[0m 后端API进程正常"
        else
            echo -e "\033[1;33m[!]\033[0m 后端API进程未找到"
        fi
EOF
}

# 生成报告
generate_report() {
    echo ""
    echo "=========================================="
    echo "  健康检查报告"
    echo "=========================================="
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "服务器: ${SERVER_HOST}"
    echo "=========================================="
}

# 主函数
main() {
    generate_report
    echo ""
    
    check_frontend
    check_backend
    check_response_time
    # check_ssl
    check_nginx
    check_processes
    check_disk_space
    check_memory
    
    echo ""
    echo "=========================================="
    log_success "健康检查完成"
    echo "=========================================="
    echo ""
}

main "$@"
