# 更新 Nginx 配置指南

## 当前配置状态

你的 Nginx 配置**基本正确**，但缺少了一些重要部分：

### ✅ 已有的（正确）
- API 代理配置正确
- Gzip 压缩
- 静态资源缓存

### ❌ 缺少的（需要添加）
- SPA 路由支持（`try_files` 指令）
- 安全头

## 快速更新步骤

### 方法 1：手动编辑（推荐）

```bash
# 1. 编辑配置文件
sudo nano /etc/nginx/conf.d/financial-data-platform.conf

# 2. 在 API 代理配置后面，添加以下内容：

    # SPA路由支持（重要！）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

# 3. 保存并退出（Ctrl+X, Y, Enter）

# 4. 测试配置
sudo nginx -t

# 5. 重载 Nginx
sudo systemctl reload nginx
```

### 方法 2：使用完整配置文件

```bash
# 1. 备份当前配置
sudo cp /etc/nginx/conf.d/financial-data-platform.conf /etc/nginx/conf.d/financial-data-platform.conf.bak

# 2. 创建新配置文件
sudo tee /etc/nginx/conf.d/financial-data-platform.conf > /dev/null << 'EOF'
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
    
    # API代理到后端
    # 前端请求: /api/collections -> 后端: http://121.196.147.222:8000/api/collections
    location /api/ {
        proxy_pass http://121.196.147.222:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # SPA路由支持（重要！）
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

# 3. 测试配置
sudo nginx -t

# 4. 重载 Nginx
sudo systemctl reload nginx
```

## 为什么需要 SPA 路由支持？

### 问题场景

React 使用 Hash 路由（`#/ai-assistant/documents`），但如果用户：
1. 直接访问 `http://121.196.147.222/#/ai-assistant/documents`
2. 刷新页面
3. 或通过书签访问

没有 `try_files` 指令，Nginx 会尝试查找物理文件，找不到就返回 404。

### 解决方案

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**工作原理**：
1. 先尝试查找请求的文件（`$uri`）
2. 如果不存在，尝试查找目录（`$uri/`）
3. 如果还不存在，返回 `index.html`
4. React Router 接管路由，显示正确的页面

## 验证配置

### 1. 测试 API 代理

```bash
# 应该返回 JSON 数据
curl http://121.196.147.222/api/collections
```

### 2. 测试 SPA 路由

```bash
# 应该返回 HTML（index.html）
curl http://121.196.147.222/ai-assistant/documents

# 或在浏览器中直接访问
http://121.196.147.222/#/ai-assistant/documents
```

### 3. 测试静态资源

```bash
# 应该返回 JavaScript 文件
curl -I http://121.196.147.222/assets/index-xxx.js

# 检查缓存头
# 应该包含: Cache-Control: public, immutable
```

## 完整的部署流程

现在你可以执行完整的部署：

```bash
# 1. 更新 Nginx 配置（如果需要）
sudo nano /etc/nginx/conf.d/financial-data-platform.conf
# 添加 SPA 路由支持和安全头

# 2. 测试 Nginx 配置
sudo nginx -t

# 3. 重载 Nginx
sudo systemctl reload nginx

# 4. 重新构建和部署
cd /data/ai-stock-web
sudo ./deploy-local.sh

# 5. 验证部署
curl http://121.196.147.222/api/collections
curl http://121.196.147.222

# 6. 浏览器访问
# http://121.196.147.222
```

## 当前配置评估

你的配置：
- ✅ API 代理：**正确**
- ✅ Gzip 压缩：**正确**
- ✅ 静态资源缓存：**正确**
- ✅ 超时设置：**合理**（300s 读取，75s 连接）
- ❌ SPA 路由支持：**缺失**
- ❌ 安全头：**缺失**

## 建议

**立即添加**：
1. SPA 路由支持（`try_files` 指令）
2. 安全头

**可选优化**：
1. 启用 HTTP/2（如果使用 HTTPS）
2. 配置访问日志格式
3. 添加速率限制

## 总结

**你的 API 代理配置是正确的，不需要修改！**

只需要添加：
```nginx
# SPA路由支持
location / {
    try_files $uri $uri/ /index.html;
}

# 安全头
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

然后：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

就完成了！
