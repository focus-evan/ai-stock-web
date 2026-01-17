# 部署脚本说明

## 脚本列表

### 1. setup-server.sh
**用途**: 初始化阿里云ECS服务器环境

**功能**:
- 安装和配置Nginx
- 创建项目目录
- 配置防火墙
- 优化系统性能
- 安装监控工具

**使用方法**:
```bash
# 在服务器上执行
sudo bash setup-server.sh
```

**注意**: 仅需在首次部署前执行一次

---

### 2. rollback.sh
**用途**: 快速回滚到之前的版本

**功能**:
- 列出可用的备份
- 回滚到指定版本
- 自动设置权限

**使用方法**:
```bash
# 回滚到最新备份
./scripts/rollback.sh

# 回滚到指定备份
./scripts/rollback.sh financial-data-platform_20240117_143000.tar.gz
```

---

### 3. health-check.sh
**用途**: 检查应用和服务器健康状态

**功能**:
- 检查前端应用
- 检查后端API
- 检查响应时间
- 检查服务器资源
- 检查Nginx状态

**使用方法**:
```bash
./scripts/health-check.sh
```

**建议**: 部署后执行，或定期执行以监控系统状态

---

## 使用前准备

### 1. 赋予执行权限

```bash
chmod +x scripts/*.sh
chmod +x deploy.sh
```

### 2. 配置SSH密钥

```bash
# 生成SSH密钥
ssh-keygen -t rsa -b 4096

# 复制到服务器
ssh-copy-id root@121.196.147.222
```

### 3. 测试连接

```bash
ssh root@121.196.147.222 "echo 'Connection successful'"
```

## 脚本依赖

所有脚本需要以下工具:
- bash
- ssh
- curl
- rsync (部署脚本)

## 配置文件

编辑 `deploy-config.sh` 修改默认配置:
```bash
export SERVER_USER="root"
export SERVER_HOST="121.196.147.222"
export SERVER_PORT="22"
export PROJECT_NAME="financial-data-platform"
```

## 故障排除

### SSH连接失败
```bash
# 检查SSH服务
ssh -v root@121.196.147.222

# 检查防火墙
ssh root@121.196.147.222 "ufw status"
```

### 权限不足
```bash
# 确保使用root用户或sudo
sudo bash script-name.sh
```

### 脚本执行失败
```bash
# 检查脚本权限
ls -la scripts/

# 重新赋予权限
chmod +x scripts/*.sh
```

## 安全建议

1. 不要在脚本中硬编码密码
2. 使用SSH密钥认证
3. 定期更新服务器
4. 限制SSH访问IP
5. 启用防火墙

## 更多信息

详细部署文档: [../DEPLOYMENT.md](../DEPLOYMENT.md)
快速开始指南: [../QUICK_DEPLOY.md](../QUICK_DEPLOY.md)
