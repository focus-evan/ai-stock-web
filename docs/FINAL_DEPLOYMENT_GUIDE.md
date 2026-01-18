# 最终部署指南 - 修复文档管理错误

## 问题说明

当前服务器上运行的是旧版本代码，包含以下错误：
- ❌ GET 请求包含 body 参数
- ❌ Mock 数据拦截真实 API 请求
- ❌ 缺少错误处理

代码已经修复，但需要重新构建和部署才能生效。

## 修复步骤

### 1. 连接到服务器

```bash
ssh root@121.196.147.222
```

### 2. 进入项目目录

```bash
cd /data/ai-stock-web
```

### 3. 拉取最新代码

```bash
git pull
```

### 4. 清理旧的构建缓存

```bash
# 删除旧的构建产物
rm -rf build/

# 清理 Vite 缓存
rm -rf node_modules/.vite

# 清理 npm 缓存（可选）
npm cache clean --force
```

### 5. 重新安装依赖（可选，如果 package.json 有更新）

```bash
pnpm install
```

### 6. 构建生产版本

```bash
npm run build
```

**重要**: 确保构建过程中没有错误，并且看到类似以下输出：
```
✓ built in 30s
✓ 1234 modules transformed.
build/index.html                  1.23 kB
build/assets/index-xxxxx.js       234.56 kB
```

### 7. 部署到 Nginx

```bash
sudo ./deploy-local.sh
```

### 8. 验证 Nginx 配置

```bash
# 检查 Nginx 配置文件
cat /etc/nginx/conf.d/financial-data-platform.conf

# 确保 API 代理配置正确：
# location /api/ {
#     proxy_pass http://121.196.147.222:8000/api/;
#     ...
# }
```

### 9. 重启 Nginx（如果需要）

```bash
sudo systemctl restart nginx
```

### 10. 清理浏览器缓存

在浏览器中访问 `http://121.196.147.222`，然后：

**方法 1: 硬刷新**
- Windows/Linux: `Ctrl + Shift + R` 或 `Ctrl + F5`
- macOS: `Cmd + Shift + R`

**方法 2: 清除缓存**
1. 打开开发者工具 (F12)
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

### 11. 验证修复

打开浏览器开发者工具 (F12)，进入 Network 标签页：

#### ✅ 正确的请求应该是：

```
GET http://121.196.147.222/api/collections
Status: 200 OK
Response: {"collections": [...]}
```

#### ❌ 如果还是看到错误：

```
Request URL: http://121.196.147.222/
Status: 304 Not Modified
或
TypeError: Request with GET/HEAD method cannot have body
```

**说明浏览器还在使用旧的缓存**，请：
1. 完全关闭浏览器
2. 重新打开浏览器
3. 访问 `http://121.196.147.222`

## 验证清单

- [ ] 代码已拉取到最新版本 (`git pull`)
- [ ] 旧的构建产物已删除 (`rm -rf build/`)
- [ ] Vite 缓存已清理 (`rm -rf node_modules/.vite`)
- [ ] 构建成功完成 (`npm run build`)
- [ ] 文件已部署到 Nginx (`sudo ./deploy-local.sh`)
- [ ] Nginx 配置正确 (API 代理到 `/api/`)
- [ ] Nginx 已重启 (`sudo systemctl restart nginx`)
- [ ] 浏览器缓存已清除 (`Ctrl + Shift + R`)
- [ ] Network 标签显示正确的 API 请求 (`/api/collections`)
- [ ] 文档管理页面正常加载，没有错误

## 常见问题

### Q1: 构建失败，提示 TypeScript 错误

**A**: 确保代码是最新的：
```bash
git status
git pull
```

### Q2: 部署脚本提示权限错误

**A**: 使用 sudo 运行：
```bash
sudo ./deploy-local.sh
```

### Q3: 浏览器还是显示旧版本

**A**: 检查构建产物的时间戳：
```bash
ls -lh /var/www/html/financial-data-platform/assets/
```

如果时间不是最新的，说明部署没有成功，重新执行步骤 6-7。

### Q4: API 请求返回 404

**A**: 检查 Nginx 配置：
```bash
sudo nginx -t
cat /etc/nginx/conf.d/financial-data-platform.conf
```

确保 `proxy_pass` 配置正确。

### Q5: 开发环境正常，生产环境有问题

**A**: 检查 `.env.production` 文件：
```bash
cat .env.production
```

确保包含：
```
VITE_API_BASE_URL = "/api"
```

## 技术说明

### 为什么需要重新构建？

1. **环境变量**: `.env.production` 中的配置在构建时被注入到代码中
2. **代码打包**: TypeScript/React 代码需要编译成浏览器可执行的 JavaScript
3. **缓存清理**: Vite 会缓存构建结果，需要清理才能使用新代码

### 开发环境 vs 生产环境

| 特性 | 开发环境 (npm run dev) | 生产环境 (npm run build) |
|------|----------------------|------------------------|
| 端口 | 3333 | 80 (Nginx) |
| API 代理 | Vite 代理 | Nginx 代理 |
| 热更新 | ✅ 是 | ❌ 否 |
| 代码压缩 | ❌ 否 | ✅ 是 |
| 环境文件 | `.env` | `.env.production` |

### 修复的具体内容

1. **删除 Mock 数据**: 移除 `fake/document.fake.ts`，不再拦截真实 API
2. **修复 GET 请求**: 移除 body 参数，只使用 searchParams
3. **添加错误处理**: 所有 API 调用都有 `onError` 回调
4. **修复上传接口**: 使用 options 对象而不是直接传递回调函数

## 联系支持

如果按照以上步骤操作后仍有问题，请提供：
1. 浏览器 Console 的完整错误信息
2. Network 标签中的请求详情（URL、Status、Response）
3. 服务器上的构建日志
