.PHONY: help install build deploy rollback health-check clean setup-server

# 默认目标
help:
	@echo "财务数据平台 - 部署命令"
	@echo ""
	@echo "可用命令:"
	@echo "  make install        - 安装项目依赖"
	@echo "  make build          - 构建项目"
	@echo "  make deploy         - 部署到生产环境"
	@echo "  make deploy-staging - 部署到测试环境"
	@echo "  make rollback       - 回滚到上一个版本"
	@echo "  make health-check   - 执行健康检查"
	@echo "  make clean          - 清理构建文件"
	@echo "  make setup-server   - 初始化服务器（仅首次）"
	@echo "  make logs           - 查看服务器日志"
	@echo "  make ssh            - SSH连接到服务器"
	@echo ""

# 安装依赖
install:
	@echo "📦 安装项目依赖..."
	pnpm install

# 构建项目
build:
	@echo "🔨 构建项目..."
	pnpm build

# 部署到生产环境
deploy:
	@echo "🚀 部署到生产环境..."
	chmod +x deploy.sh
	./deploy.sh production

# 部署到测试环境
deploy-staging:
	@echo "🚀 部署到测试环境..."
	chmod +x deploy.sh
	./deploy.sh staging

# 回滚
rollback:
	@echo "🔙 执行回滚..."
	chmod +x scripts/rollback.sh
	./scripts/rollback.sh

# 健康检查
health-check:
	@echo "🏥 执行健康检查..."
	chmod +x scripts/health-check.sh
	./scripts/health-check.sh

# 清理构建文件
clean:
	@echo "🧹 清理构建文件..."
	rm -rf dist
	rm -rf node_modules/.vite

# 初始化服务器
setup-server:
	@echo "⚙️  初始化服务器..."
	chmod +x scripts/setup-server.sh
	scp scripts/setup-server.sh root@121.196.147.222:/tmp/
	ssh root@121.196.147.222 "bash /tmp/setup-server.sh"

# 查看日志
logs:
	@echo "📋 查看Nginx访问日志..."
	ssh root@121.196.147.222 "tail -f /var/log/nginx/access.log"

# 查看错误日志
logs-error:
	@echo "📋 查看Nginx错误日志..."
	ssh root@121.196.147.222 "tail -f /var/log/nginx/error.log"

# SSH连接
ssh:
	@echo "🔐 连接到服务器..."
	ssh root@121.196.147.222

# 测试
test:
	@echo "🧪 运行测试..."
	pnpm test -- --run

# 开发模式
dev:
	@echo "💻 启动开发服务器..."
	pnpm dev

# 完整部署流程（测试+构建+部署）
deploy-full: test build deploy health-check
	@echo "✅ 完整部署流程完成！"

# 快速部署（跳过测试）
deploy-quick: build deploy
	@echo "✅ 快速部署完成！"

# 检查环境
check-env:
	@echo "🔍 检查部署环境..."
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js 未安装"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm 未安装"; exit 1; }
	@command -v ssh >/dev/null 2>&1 || { echo "❌ SSH 未安装"; exit 1; }
	@command -v rsync >/dev/null 2>&1 || { echo "❌ rsync 未安装"; exit 1; }
	@echo "✅ 环境检查通过"

# 备份服务器数据
backup:
	@echo "💾 备份服务器数据..."
	ssh root@121.196.147.222 << 'EOF'
		timestamp=$$(date +%Y%m%d_%H%M%S)
		tar -czf /var/www/html/backups/manual_backup_$${timestamp}.tar.gz \
			-C /var/www/html/financial-data-platform .
		echo "备份完成: manual_backup_$${timestamp}.tar.gz"
	EOF

# 查看服务器状态
status:
	@echo "📊 查看服务器状态..."
	@ssh root@121.196.147.222 << 'EOF'
		echo "=== Nginx状态 ==="
		systemctl status nginx --no-pager | head -n 5
		echo ""
		echo "=== 磁盘使用 ==="
		df -h / | tail -n 1
		echo ""
		echo "=== 内存使用 ==="
		free -h | grep Mem
		echo ""
		echo "=== 最近部署 ==="
		ls -lht /var/www/html/backups/*.tar.gz 2>/dev/null | head -n 3 || echo "无备份文件"
	EOF

# 重启Nginx
restart-nginx:
	@echo "🔄 重启Nginx..."
	ssh root@121.196.147.222 "systemctl restart nginx"
	@echo "✅ Nginx已重启"

# 查看备份列表
list-backups:
	@echo "📦 查看备份列表..."
	ssh root@121.196.147.222 "ls -lht /var/www/html/backups/*.tar.gz"

# 清理旧备份
clean-backups:
	@echo "🧹 清理旧备份（保留最近5个）..."
	ssh root@121.196.147.222 << 'EOF'
		cd /var/www/html/backups
		ls -t financial-data-platform_*.tar.gz | tail -n +6 | xargs -r rm
		echo "清理完成"
	EOF
