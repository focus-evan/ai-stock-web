# 财务数据平台 - 部署文档

## 目录
- [概述](#概述)
- [前置要求](#前置要求)
- [服务器初始化](#服务器初始化)
- [手动部署](#手动部署)
- [自动化部署](#自动化部署)
- [GitHub Actions部署](#github-actions部署)
- [回滚操作](#回滚操作)
- [健康检查](#健康检查)
- [常见问题](#常见问题)

## 概述

本项目提供了完整的自动化部署方案，支持部署到阿里云ECS服务器。

**服务器信息：**
- 服务器地址: 121.196.147.222
- 前端端口: 80 (HTTP)
- 后端端口: 8000
- 部署目录: /var/www/html/financial-data-platform

## 前置要求

### 本地环境
- Node.js 18+
- pnpm 8+
- SSH客户端
- rsync

### 服务器环境
- Ubuntu 20.04+ / CentOS 7+
- Nginx
- 至少2GB内存
- 至少10GB可用磁盘空间

## 服务器初始化

### 1. 首次部署前，需要初始化服务器环境

在服务器上执行：

```bash
# 下载初始化脚本
wget https://your-repo/scripts/setup-server.sh

# 或者手动上传脚本后执行
chmod +x setup-server.sh
sudo bash setup-server.sh
```

初始化脚本会自动完成：
- ✅ 安装和配置Nginx
- ✅ 创建项目目录
- ✅ 配置防火墙规则
- ✅ 优化系统性能
- ✅ 安装监控工具

### 2. 配置SSH密钥认证（推荐）

```bash
# 在本地生成SSH密钥（如果还没有）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥复制到服务器
ssh-copy-id root@121.196.147.222

# 测试SSH连接
ssh root@121.196.147.222
```

## 手动部署

### 方式一：使用部署脚本（推荐）

```bash
# 1. 赋予脚本执行权限
chmod +x deploy.sh

# 2. 执行部署
./deploy.sh production

# 部署到其他环境
./deploy.sh staging
./deploy.sh development
```

### 方式二：手动执行步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 构建项目
pnpm build

# 3. 上传到服务器
rsync -avz --delete dist/ root@121.196.147.222:/var/www/html/financial-data-platform/

# 4. 设置权限
ssh root@121.196.147.222 "chown -R www-data:www-data /var/www/html/financial-data-platform && chmod -R 755 /var/www/html/financial-data-platform"

# 5. 重载Nginx
ssh root@121.196.147.222 "systemctl reload nginx"
```

## 自动化部署

### 部署脚本功能

`deploy.sh` 脚本提供以下功能：

- ✅ 环境检查
- ✅ SSH连接测试
- ✅ 依赖安装
- ✅ 项目构建
- ✅ 远程备份
- ✅ 文件上传
- ✅ Nginx配置
- ✅ 权限设置
- ✅ 健康检查

### 配置文件

编辑 `deploy-config.sh` 修改部署配置：

```bash
# 服务器配置
export SERVER_USER="root"
export SERVER_HOST="121.196.147.222"
export SERVER_PORT="22"

# 项目配置
export PROJECT_NAME="financial-data-platform"
export REMOTE_DIR="/var/www/html/${PROJECT_NAME}"
```

## GitHub Actions部署

### 1. 配置GitHub Secrets

在GitHub仓库设置中添加以下Secrets：

- `SSH_PRIVATE_KEY`: SSH私钥内容
- `SERVER_HOST`: 服务器地址 (121.196.147.222)
- `SERVER_USER`: SSH用户名 (root)

### 2. 触发部署

部署会在以下情况自动触发：
- 推送代码到 `main` 或 `master` 分支
- 手动触发 (Actions -> Deploy to Aliyun ECS -> Run workflow)

### 3. 查看部署状态

访问 GitHub Actions 页面查看部署进度和日志。

## 回滚操作

### 自动回滚到最新备份

```bash
./scripts/rollback.sh
```

### 回滚到指定备份

```bash
# 1. 查看可用备份
./scripts/rollback.sh

# 2. 选择要回滚的备份文件
./scripts/rollback.sh financial-data-platform_20240117_143000.tar.gz
```

### 手动回滚

```bash
ssh root@121.196.147.222 << 'EOF'
  cd /var/www/html/backups
  ls -lht financial-data-platform_*.tar.gz
  
  # 选择备份文件
  tar -xzf financial-data-platform_YYYYMMDD_HHMMSS.tar.gz -C /var/www/html/financial-data-platform
  
  # 设置权限
  chown -R www-data:www-data /var/www/html/financial-data-platform
  chmod -R 755 /var/www/html/financial-data-platform
EOF
```

## 健康检查

### 使用健康检查脚本

```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

检查项目包括：
- ✅ 前端应用可访问性
- ✅ 后端API状态
- ✅ 响应时间
- ✅ Nginx状态
- ✅ 磁盘空间
- ✅ 内存使用
- ✅ 关键进程

### 手动检查

```bash
# 检查前端
curl http://121.196.147.222

# 检查后端API
curl http://121.196.147.222:8000/health

# 检查Nginx状态
ssh root@121.196.147.222 "systemctl status nginx"

# 查看Nginx日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/access.log"
```

## Nginx配置

### 查看当前配置

```bash
ssh root@121.196.147.222 "cat /etc/nginx/sites-available/financial-data-platform"
```

### 修改配置

```bash
ssh root@121.196.147.222 "nano /etc/nginx/sites-available/financial-data-platform"

# 测试配置
ssh root@121.196.147.222 "nginx -t"

# 重载配置
ssh root@121.196.147.222 "systemctl reload nginx"
```

### 配置HTTPS（可选）

```bash
# 安装Certbot
ssh root@121.196.147.222 "apt-get install -y certbot python3-certbot-nginx"

# 获取SSL证书
ssh root@121.196.147.222 "certbot --nginx -d your-domain.com"

# 自动续期
ssh root@121.196.147.222 "certbot renew --dry-run"
```

## 常见问题

### 1. 部署失败：SSH连接超时

**解决方案：**
```bash
# 检查SSH连接
ssh -v root@121.196.147.222

# 检查防火墙
ssh root@121.196.147.222 "ufw status"

# 确保22端口开放
ssh root@121.196.147.222 "ufw allow 22/tcp"
```

### 2. 构建失败：内存不足

**解决方案：**
```bash
# 增加Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm build
```

### 3. Nginx 502 Bad Gateway

**解决方案：**
```bash
# 检查后端API是否运行
ssh root@121.196.147.222 "ps aux | grep uvicorn"

# 检查Nginx错误日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/error.log"

# 重启后端服务
ssh root@121.196.147.222 "systemctl restart your-backend-service"
```

### 4. 文件权限问题

**解决方案：**
```bash
ssh root@121.196.147.222 << 'EOF'
  chown -R www-data:www-data /var/www/html/financial-data-platform
  chmod -R 755 /var/www/html/financial-data-platform
EOF
```

### 5. 磁盘空间不足

**解决方案：**
```bash
# 清理旧备份
ssh root@121.196.147.222 << 'EOF'
  cd /var/www/html/backups
  ls -t financial-data-platform_*.tar.gz | tail -n +6 | xargs rm
EOF

# 清理Nginx日志
ssh root@121.196.147.222 "truncate -s 0 /var/log/nginx/*.log"

# 清理系统缓存
ssh root@121.196.147.222 "apt-get clean && apt-get autoclean"
```

## 监控和日志

### 查看应用日志

```bash
# Nginx访问日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/access.log"

# Nginx错误日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/error.log"

# 系统日志
ssh root@121.196.147.222 "journalctl -u nginx -f"
```

### 性能监控

```bash
# 查看系统资源
ssh root@121.196.147.222 "htop"

# 查看磁盘使用
ssh root@121.196.147.222 "df -h"

# 查看内存使用
ssh root@121.196.147.222 "free -h"

# 查看网络连接
ssh root@121.196.147.222 "netstat -tulpn"
```

## 安全建议

1. **使用SSH密钥认证**，禁用密码登录
2. **配置防火墙**，只开放必要端口
3. **启用HTTPS**，使用Let's Encrypt免费证书
4. **定期更新系统**和软件包
5. **设置自动备份**，定期测试恢复
6. **监控日志**，及时发现异常
7. **使用非root用户**进行部署（可选）

## 联系支持

如有问题，请联系：
- 技术支持: support@example.com
- 文档: https://your-docs-site.com

---

**最后更新**: 2024-01-17
