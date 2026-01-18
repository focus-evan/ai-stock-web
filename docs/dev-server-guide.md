# 开发服务器使用指南

## 概述

`dev.sh` 脚本用于在阿里云 ECS 上后台运行开发服务器，支持完整的进程管理功能。

## 使用方法

### 启动服务器

```bash
./dev.sh start
```

服务器将在后台运行，输出日志到 `dev.log` 文件。

**输出示例**:
```
==========================================
  财务数据平台 - 开发环境启动
==========================================

[✓] Node.js 版本: v22.22.0
[✓] 使用 pnpm 版本: 10.6.4
[✓] 依赖已安装
[✓] .env 文件存在
[✓] 文档管理将使用真实后端 API
[✓] 端口 3333 可用

==========================================
  配置信息
==========================================

  本地访问:   http://localhost:3333
  网络访问:   http://172.16.142.214:3333
  后端 API:   http://121.196.147.222:8000

  文档管理:
    - 使用真实后端 API

  其他模块:
    - 使用 Mock 数据（用户、权限、通知等）

  日志文件:   dev.log
  PID 文件:   dev.pid

==========================================

[✓] 开发服务器已启动！

PID: 12345

访问地址:
  - http://localhost:3333
  - http://172.16.142.214:3333

管理命令:
  - 查看日志: ./dev.sh logs
  - 查看状态: ./dev.sh status
  - 停止服务: ./dev.sh stop
  - 重启服务: ./dev.sh restart
```

### 停止服务器

```bash
./dev.sh stop
```

优雅地停止开发服务器进程。

### 重启服务器

```bash
./dev.sh restart
```

先停止再启动服务器，用于应用代码更改。

### 查看状态

```bash
./dev.sh status
```

显示服务器运行状态、PID、端口等信息。

**输出示例**:
```
[✓] 开发服务器正在运行

  PID:        12345
  端口:       3333
  访问地址:   http://172.16.142.214:3333
  日志文件:   dev.log

进程信息:
  PID  PPID CMD                         %CPU %MEM     ELAPSED
12345     1 node /usr/bin/pnpm run dev  2.5  1.2    00:15:30
```

### 查看日志

```bash
./dev.sh logs
```

实时查看服务器日志（类似 `tail -f`）。按 `Ctrl+C` 退出。

## 文件说明

### dev.pid

存储开发服务器的进程 ID (PID)。

- 自动创建：启动服务器时
- 自动删除：停止服务器时

### dev.log

存储开发服务器的所有输出日志。

- 包含 Vite 启动信息
- 包含请求日志
- 包含错误信息

## 常见场景

### 场景 1: 首次启动

```bash
# 1. 进入项目目录
cd /data/ai-stock-web

# 2. 启动服务器
./dev.sh start

# 3. 查看日志确认启动成功
./dev.sh logs
```

### 场景 2: 代码更新后重启

```bash
# 1. 拉取最新代码
git pull

# 2. 重启服务器
./dev.sh restart

# 3. 查看日志
./dev.sh logs
```

### 场景 3: 排查问题

```bash
# 1. 查看服务器状态
./dev.sh status

# 2. 查看日志
./dev.sh logs

# 3. 如果有问题，重启服务器
./dev.sh restart
```

### 场景 4: 临时停止服务器

```bash
# 停止服务器
./dev.sh stop

# 稍后重新启动
./dev.sh start
```

## 端口管理

### 默认端口

开发服务器使用端口 **3333**。

### 端口被占用

脚本会自动检测并尝试释放端口 3333。如果自动释放失败：

```bash
# 手动查找占用进程
lsof -i :3333

# 或使用 netstat
netstat -tulpn | grep 3333

# 终止进程
kill -9 <PID>
```

### 修改端口

编辑 `dev.sh` 文件，修改 `PORT` 变量：

```bash
PORT=3333  # 改为其他端口，如 8080
```

## 访问方式

### 本地访问

```
http://localhost:3333
```

### 网络访问

```
http://<服务器IP>:3333
```

例如：`http://121.196.147.222:3333`

### 通过域名访问

如果配置了域名和 Nginx 反向代理：

```
http://your-domain.com
```

## 日志管理

### 查看完整日志

```bash
cat dev.log
```

### 查看最近日志

```bash
tail -50 dev.log
```

### 实时查看日志

```bash
./dev.sh logs
```

### 清空日志

```bash
> dev.log
```

或者重启服务器（会自动清空日志）：

```bash
./dev.sh restart
```

### 日志轮转

如果日志文件过大，可以手动轮转：

```bash
# 备份旧日志
mv dev.log dev.log.$(date +%Y%m%d_%H%M%S)

# 重启服务器（会创建新的日志文件）
./dev.sh restart
```

## 进程管理

### 查看进程

```bash
# 使用脚本
./dev.sh status

# 或直接查看
ps aux | grep vite
```

### 终止进程

```bash
# 使用脚本（推荐）
./dev.sh stop

# 或手动终止
kill $(cat dev.pid)

# 强制终止
kill -9 $(cat dev.pid)
```

### 清理残留进程

如果脚本无法停止服务器：

```bash
# 查找所有 vite 进程
ps aux | grep vite

# 终止所有 vite 进程
pkill -f vite

# 或使用端口查找
lsof -ti:3333 | xargs kill -9
```

## 开机自启动

### 使用 systemd

创建服务文件 `/etc/systemd/system/ai-stock-dev.service`：

```ini
[Unit]
Description=AI Stock Web Development Server
After=network.target

[Service]
Type=forking
User=root
WorkingDirectory=/data/ai-stock-web
ExecStart=/data/ai-stock-web/dev.sh start
ExecStop=/data/ai-stock-web/dev.sh stop
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启用开机自启动
sudo systemctl enable ai-stock-dev

# 启动服务
sudo systemctl start ai-stock-dev

# 查看状态
sudo systemctl status ai-stock-dev
```

### 使用 crontab

```bash
# 编辑 crontab
crontab -e

# 添加以下行（开机启动）
@reboot cd /data/ai-stock-web && ./dev.sh start
```

## 故障排查

### 问题 1: 服务器无法启动

**检查**:
```bash
# 查看日志
cat dev.log

# 检查端口
lsof -i :3333

# 检查依赖
ls node_modules/
```

**解决**:
```bash
# 重新安装依赖
rm -rf node_modules/
pnpm install

# 重启服务器
./dev.sh restart
```

### 问题 2: 无法访问服务器

**检查**:
```bash
# 确认服务器运行
./dev.sh status

# 检查防火墙
sudo firewall-cmd --list-ports

# 检查端口监听
netstat -tulpn | grep 3333
```

**解决**:
```bash
# 开放端口（如果使用防火墙）
sudo firewall-cmd --add-port=3333/tcp --permanent
sudo firewall-cmd --reload

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 3333 -j ACCEPT
```

### 问题 3: 日志文件过大

**检查**:
```bash
# 查看日志大小
ls -lh dev.log
```

**解决**:
```bash
# 清空日志
> dev.log

# 或轮转日志
mv dev.log dev.log.backup
./dev.sh restart
```

### 问题 4: 进程僵死

**检查**:
```bash
# 查看进程状态
ps aux | grep vite
```

**解决**:
```bash
# 强制终止
pkill -9 -f vite

# 清理 PID 文件
rm -f dev.pid

# 重新启动
./dev.sh start
```

## 性能优化

### 内存限制

如果服务器内存不足，可以限制 Node.js 内存使用：

编辑 `package.json`：

```json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=2048' vite --host"
  }
}
```

### 文件监听优化

如果文件过多导致性能问题，可以排除某些目录：

编辑 `vite.config.ts`：

```typescript
export default defineConfig({
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/build/**', '**/.git/**']
    }
  }
})
```

## 安全建议

1. **不要在生产环境使用开发服务器**
   - 开发服务器不适合生产环境
   - 使用 `deploy-local.sh` 部署生产版本

2. **限制访问**
   - 使用防火墙限制端口 3333 的访问
   - 或使用 Nginx 反向代理并配置访问控制

3. **定期更新依赖**
   ```bash
   pnpm update
   ```

4. **监控日志**
   - 定期检查 `dev.log` 中的错误
   - 使用日志分析工具

## 对比：开发环境 vs 生产环境

| 特性 | 开发环境 (dev.sh) | 生产环境 (deploy-local.sh) |
|------|------------------|---------------------------|
| 启动方式 | `./dev.sh start` | `sudo ./deploy-local.sh` |
| 运行模式 | 开发模式 | 生产模式 |
| 端口 | 3333 | 80 (Nginx) |
| 热更新 | ✅ 支持 | ❌ 不支持 |
| 代码压缩 | ❌ 否 | ✅ 是 |
| 性能 | 较慢 | 快速 |
| 适用场景 | 开发调试 | 生产部署 |

## 总结

`dev.sh` 脚本提供了完整的开发服务器管理功能：

- ✅ 后台运行
- ✅ 进程管理（启动、停止、重启）
- ✅ 状态监控
- ✅ 日志查看
- ✅ 自动端口检测
- ✅ 环境检查

使用这个脚本，你可以方便地在阿里云 ECS 上运行开发服务器，无需保持 SSH 连接。
