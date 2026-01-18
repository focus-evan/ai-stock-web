#!/bin/bash

###############################################################################
# 开发环境启动脚本
# 用途: 在开发环境启动项目，支持后台运行
# 使用方法: 
#   ./dev.sh start   - 启动开发服务器（后台运行）
#   ./dev.sh stop    - 停止开发服务器
#   ./dev.sh restart - 重启开发服务器
#   ./dev.sh status  - 查看服务器状态
#   ./dev.sh logs    - 查看日志
###############################################################################

set -e

# 配置
PID_FILE="dev.pid"
LOG_FILE="dev.log"
PORT=3333

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

# 获取服务器 IP
get_server_ip() {
    # 尝试多种方法获取 IP
    if command -v hostname &> /dev/null; then
        SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
    
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP=$(ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -1)
    fi
    
    if [ -z "$SERVER_IP" ]; then
        SERVER_IP="localhost"
    fi
    
    echo "$SERVER_IP"
}

# 检查进程是否运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# 启动服务器
start_server() {
    if is_running; then
        log_warning "开发服务器已在运行中 (PID: $(cat $PID_FILE))"
        log_info "使用 './dev.sh stop' 停止服务器"
        exit 1
    fi

    
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
    log_info "检查端口 ${PORT}..."
    if command -v lsof &> /dev/null; then
        if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "端口 ${PORT} 已被占用"
            log_info "尝试终止占用进程..."
            lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
            sleep 1
            log_success "端口已释放"
        else
            log_success "端口 ${PORT} 可用"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -an | grep :${PORT} | grep LISTEN >/dev/null 2>&1; then
            log_warning "端口 ${PORT} 已被占用"
            # 尝试使用 fuser 终止
            if command -v fuser &> /dev/null; then
                fuser -k ${PORT}/tcp 2>/dev/null || true
                sleep 1
                log_success "端口已释放"
            else
                log_warning "请手动终止占用端口 ${PORT} 的进程"
            fi
        else
            log_success "端口 ${PORT} 可用"
        fi
    else
        log_info "无法检查端口占用（跳过）"
    fi
    
    # 7. 获取服务器 IP
    SERVER_IP=$(get_server_ip)
    
    # 8. 显示配置信息
    echo ""
    log_header "=========================================="
    log_header "  配置信息"
    log_header "=========================================="
    echo ""
    echo "  本地访问:   http://localhost:${PORT}"
    echo "  网络访问:   http://${SERVER_IP}:${PORT}"
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
    echo "  日志文件:   ${LOG_FILE}"
    echo "  PID 文件:   ${PID_FILE}"
    echo ""
    log_header "=========================================="
    echo ""
    
    # 9. 启动开发服务器（后台运行）
    log_info "启动开发服务器（后台运行）..."
    
    # 清空旧日志
    > "$LOG_FILE"
    
    # 使用 nohup 后台运行
    nohup $PKG_MANAGER run dev > "$LOG_FILE" 2>&1 &
    
    # 保存 PID
    echo $! > "$PID_FILE"
    
    # 等待服务器启动
    log_info "等待服务器启动..."
    sleep 3
    
    # 检查是否启动成功
    if is_running; then
        log_success "开发服务器已启动！"
        echo ""
        log_success "PID: $(cat $PID_FILE)"
        echo ""
        log_info "访问地址:"
        echo "  - http://localhost:${PORT}"
        echo "  - http://${SERVER_IP}:${PORT}"
        echo ""
        log_info "管理命令:"
        echo "  - 查看日志: ./dev.sh logs"
        echo "  - 查看状态: ./dev.sh status"
        echo "  - 停止服务: ./dev.sh stop"
        echo "  - 重启服务: ./dev.sh restart"
        echo ""
        
        # 显示最近的日志
        log_info "最近日志:"
        tail -20 "$LOG_FILE"
    else
        log_error "服务器启动失败"
        log_info "查看日志: cat $LOG_FILE"
        exit 1
    fi
}

# 停止服务器
stop_server() {
    if ! is_running; then
        log_warning "开发服务器未运行"
        exit 1
    fi
    
    PID=$(cat "$PID_FILE")
    log_info "停止开发服务器 (PID: $PID)..."
    
    # 尝试优雅停止
    kill "$PID" 2>/dev/null || true
    
    # 等待进程结束
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # 如果还在运行，强制终止
    if ps -p "$PID" > /dev/null 2>&1; then
        log_warning "进程未响应，强制终止..."
        kill -9 "$PID" 2>/dev/null || true
    fi
    
    # 清理 PID 文件
    rm -f "$PID_FILE"
    
    log_success "开发服务器已停止"
}

# 查看状态
show_status() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        log_success "开发服务器正在运行"
        echo ""
        echo "  PID:        $PID"
        echo "  端口:       ${PORT}"
        echo "  访问地址:   http://$(get_server_ip):${PORT}"
        echo "  日志文件:   ${LOG_FILE}"
        echo ""
        
        # 显示进程信息
        if command -v ps &> /dev/null; then
            log_info "进程信息:"
            ps -p "$PID" -o pid,ppid,cmd,%cpu,%mem,etime
        fi
    else
        log_warning "开发服务器未运行"
        
        # 检查是否有残留的 PID 文件
        if [ -f "$PID_FILE" ]; then
            log_info "清理残留的 PID 文件..."
            rm -f "$PID_FILE"
        fi
    fi
}

# 查看日志
show_logs() {
    if [ ! -f "$LOG_FILE" ]; then
        log_warning "日志文件不存在"
        exit 1
    fi
    
    log_info "显示日志 (按 Ctrl+C 退出)..."
    echo ""
    
    # 如果服务器在运行，实时显示日志
    if is_running; then
        tail -f "$LOG_FILE"
    else
        # 否则显示全部日志
        cat "$LOG_FILE"
    fi
}

# 重启服务器
restart_server() {
    log_info "重启开发服务器..."
    
    if is_running; then
        stop_server
        sleep 2
    fi
    
    start_server
}

# 主函数
main() {
    ACTION=${1:-start}
    
    case "$ACTION" in
        start)
            start_server
            ;;
        stop)
            stop_server
            ;;
        restart)
            restart_server
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        *)
            echo "用法: $0 {start|stop|restart|status|logs}"
            echo ""
            echo "命令说明:"
            echo "  start   - 启动开发服务器（后台运行）"
            echo "  stop    - 停止开发服务器"
            echo "  restart - 重启开发服务器"
            echo "  status  - 查看服务器状态"
            echo "  logs    - 查看日志（实时）"
            echo ""
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
