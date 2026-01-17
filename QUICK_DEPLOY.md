# 快速部署指南

## 🚀 5分钟快速部署

### 前置条件
- ✅ 已有阿里云ECS服务器 (121.196.147.222)
- ✅ 本地已安装 Node.js 18+ 和 pnpm
- ✅ 可以SSH连接到服务器

### 步骤1: 初始化服务器（仅首次）

```bash
# 连接到服务器
ssh root@121.196.147.222

# 下载并执行初始化脚本
wget https://raw.githubusercontent.com/your-repo/main/scripts/setup-server.sh
chmod +x setup-server.sh
sudo bash setup-server.sh

# 退出服务器
exit
```

### 步骤2: 配置SSH密钥（推荐）

```bash
# 生成SSH密钥（如果还没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id root@121.196.147.222

# 测试连接
ssh root@121.196.147.222 "echo 'SSH连接成功'"
```

### 步骤3: 执行部署

```bash
# 克隆项目（如果还没有）
git clone your-repo-url
cd financial-data-platform

# 赋予部署脚本执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh production
```

### 步骤4: 验证部署

```bash
# 访问应用
curl http://121.196.147.222

# 或在浏览器中打开
open http://121.196.147.222
```

## 🔄 日常部署流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 执行部署
./deploy.sh production

# 3. 检查健康状态
./scripts/health-check.sh
```

## 🔙 快速回滚

```bash
# 回滚到上一个版本
./scripts/rollback.sh
```

## 📊 查看状态

```bash
# 健康检查
./scripts/health-check.sh

# 查看服务器日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/access.log"
```

## ⚙️ 自定义配置

编辑 `deploy-config.sh` 修改部署参数：

```bash
# 服务器配置
export SERVER_USER="root"
export SERVER_HOST="121.196.147.222"
export SERVER_PORT="22"

# 项目配置
export PROJECT_NAME="financial-data-platform"
export REMOTE_DIR="/var/www/html/${PROJECT_NAME}"
```

## 🐛 常见问题

### 问题1: SSH连接失败
```bash
# 检查SSH服务
ssh -v root@121.196.147.222

# 确保防火墙开放22端口
ssh root@121.196.147.222 "ufw allow 22/tcp"
```

### 问题2: 构建失败
```bash
# 清理并重新安装依赖
rm -rf node_modules
pnpm install

# 增加内存限制
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm build
```

### 问题3: 部署后无法访问
```bash
# 检查Nginx状态
ssh root@121.196.147.222 "systemctl status nginx"

# 重启Nginx
ssh root@121.196.147.222 "systemctl restart nginx"

# 查看错误日志
ssh root@121.196.147.222 "tail -f /var/log/nginx/error.log"
```

## 📚 更多信息

详细文档请参考: [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎯 部署检查清单

- [ ] 服务器已初始化
- [ ] SSH密钥已配置
- [ ] 本地环境已准备
- [ ] 代码已提交到Git
- [ ] 执行部署脚本
- [ ] 验证应用可访问
- [ ] 检查健康状态
- [ ] 通知团队部署完成

---

**提示**: 首次部署建议先在测试环境验证，确认无误后再部署到生产环境。
