# 修复 304 错误和 API 路径问题

## 问题分析

### 错误信息
```
Request URL: http://121.196.147.222/
Request Method: GET
Status Code: 304 Not Modified
```

### 问题根源

1. **请求 URL 错误**：应该是 `/api/collections`，实际是 `/`
2. **环境变量未生效**：`.env.production` 中的 `VITE_API_BASE_URL` 没有被构建时读取
3. **使用了旧的构建**：浏览器缓存了旧版本的代码

## 完整解决方案

### 步骤 1: 确保 .env.production 配置正确

```bash
# 查看当前配置
cat .env.production

# 应该包含：
# VITE_API_BASE_URL = "/api"
```

如果没有，创建或更新：

```bash
cat > .env.production << 'EOF'
# React Router Mode
VITE_ROUTER_MODE = hash

# 后端 API 前缀（生产环境通过 Nginx 代理）
VITE_API_BASE_URL = "/api"

# 登录之后默认跳转的路由
VITE_BASE_HOME_PATH = "/ai-assistant/qa"

# 网站标题
VITE_GLOB_APP_TITLE = "Financial Data Platform"

# 用于设置 Zustand 存储的前缀标识
VITE_APP_NAMESPACE = "react-antd-admin"

# 请求超时时间（毫秒）
VITE_API_TIMEOUT = 180000
EOF
```

### 步骤 2: 清理旧的构建

```bash
# 删除旧的构建目录
rm -rf build/

# 清理 node_modules 缓存（可选，如果问题持续）
rm -rf node_modules/.vite
```

### 步骤 3: 重新构建

```bash
# 确保使用生产环境配置
NODE_ENV=production npm run build

# 或
npm run build
```

**验证构建**：
```bash
# 检查构建产物中是否包含正确的 API 地址
grep -r "VITE_API_BASE_URL" build/ || echo "环境变量已被替换"

# 查看构建的 JS 文件（应该包含 /api 路径）
grep -r '"/api"' build/assets/*.js | head -5
```

### 步骤 4: 部署

```bash
# 使用部署脚本
sudo ./deploy-local.sh

# 或手动部署
sudo rm -rf /var/www/html/financial-data-platform/*
sudo cp -r build/* /var/www/html/financial-data-platform/
sudo systemctl reload nginx
```

### 步骤 5: 清除浏览器缓存

**重要！** 必须清除浏览器缓存，否则会继续使用旧代码。

**方法 1：硬性刷新**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**方法 2：清空缓存**
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

**方法 3：无痕模式**
- 打开无痕/隐私浏览窗口
- 访问 `http://121.196.147.222`

### 步骤 6: 验证修复

#### A. 检查 Network 请求

打开开发者工具 → Network 标签：

**正确的请求**：
```
Request URL: http://121.196.147.222/api/collections
Request Method: GET
Status Code: 200 OK
```

**错误的请求**：
```
Request URL: http://121.196.147.222/  ❌ 错误
Request Method: GET
Status Code: 304 Not Modified
```

#### B. 测试 API

```bash
# 测试 collections 接口
curl http://121.196.147.222/api/collections

# 应该返回 JSON 数据
```

#### C. 检查 Console

浏览器 Console 应该没有错误，或者至少没有 "Failed to load collections" 错误。

## 常见问题排查

### Q1: 构建后仍然请求错误的 URL

**原因**：环境变量没有被正确读取

**检查**：
```bash
# 查看 .env.production
cat .env.production

# 确认包含 VITE_API_BASE_URL = "/api"
```

**解决**：
```bash
# 确保文件格式正确（没有多余的空格或特殊字符）
# 重新构建
rm -rf build/
npm run build
```

### Q2: 浏览器仍然显示 304

**原因**：浏览器缓存

**解决**：
1. 强制刷新：`Ctrl + Shift + R`
2. 清空缓存
3. 使用无痕模式测试

### Q3: 构建时没有读取 .env.production

**原因**：Vite 需要 `VITE_` 前缀的环境变量

**检查**：
```bash
# 所有环境变量必须以 VITE_ 开头
grep "^VITE_" .env.production
```

**正确格式**：
```env
VITE_API_BASE_URL = "/api"  ✅
API_BASE_URL = "/api"        ❌ 错误：缺少 VITE_ 前缀
```

### Q4: 开发环境正常，生产环境错误

**原因**：开发环境和生产环境使用不同的配置文件

**对比**：
```bash
# 开发环境
cat .env

# 生产环境
cat .env.production

# 确保两者都有 VITE_API_BASE_URL
```

## 调试技巧

### 1. 查看构建时的环境变量

在 `vite.config.ts` 中添加日志：

```typescript
export default defineConfig({
  // ...
  define: {
    __APP_INFO__: JSON.stringify(__APP_INFO__),
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL),
  },
});
```

然后在浏览器 Console 中：
```javascript
console.log(__API_BASE_URL__)
// 应该输出: "/api"
```

### 2. 检查构建产物

```bash
# 查看构建的 JS 文件中是否包含正确的 API 路径
cd build/assets
grep -l "api/collections" *.js
```

### 3. 对比开发和生产环境

```bash
# 开发环境（应该正常）
npm run dev
# 访问 http://121.196.147.222:3333

# 生产环境（检查是否正常）
npm run build
npm run preview
# 访问 http://localhost:4173
```

## 一键修复脚本

创建一个脚本来自动执行所有步骤：

```bash
#!/bin/bash

echo "=== 修复 API 路径问题 ==="

# 1. 检查 .env.production
echo "1. 检查 .env.production..."
if ! grep -q "VITE_API_BASE_URL" .env.production; then
    echo "❌ .env.production 缺少 VITE_API_BASE_URL"
    echo "正在添加..."
    echo 'VITE_API_BASE_URL = "/api"' >> .env.production
fi

# 2. 清理构建
echo "2. 清理旧的构建..."
rm -rf build/

# 3. 重新构建
echo "3. 重新构建..."
npm run build

# 4. 验证构建
echo "4. 验证构建..."
if grep -r '"/api"' build/assets/*.js > /dev/null; then
    echo "✅ 构建包含正确的 API 路径"
else
    echo "❌ 构建可能有问题，请检查"
fi

# 5. 部署
echo "5. 部署..."
sudo ./deploy-local.sh

echo "=== 完成 ==="
echo "请清除浏览器缓存并刷新页面"
```

保存为 `fix-api-path.sh`，然后：

```bash
chmod +x fix-api-path.sh
./fix-api-path.sh
```

## 总结

**问题**：请求 URL 是 `/` 而不是 `/api/collections`

**原因**：
1. `.env.production` 缺少或配置错误
2. 使用了旧的构建代码
3. 浏览器缓存

**解决**：
1. ✅ 确保 `.env.production` 包含 `VITE_API_BASE_URL = "/api"`
2. ✅ 清理并重新构建：`rm -rf build/ && npm run build`
3. ✅ 重新部署：`sudo ./deploy-local.sh`
4. ✅ 清除浏览器缓存：`Ctrl + Shift + R`

**验证**：
```bash
# 应该返回 JSON 数据
curl http://121.196.147.222/api/collections
```

浏览器 Network 标签应该显示：
```
Request URL: http://121.196.147.222/api/collections ✅
Status Code: 200 OK ✅
```
