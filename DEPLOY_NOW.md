# 立即部署 - 文档管理使用真实 API

## ✅ 配置验证通过

所有配置已正确完成：
- ✅ `fake/document.fake.ts` 已删除
- ✅ `vite.config.ts` 配置正确（enableProd: true）
- ✅ `.env.production` 配置正确
- ✅ API 和页面文件完整
- ✅ 没有其他 fake 文件拦截文档管理 API

## 🚀 部署步骤

### 步骤 1: 提交代码（本地）

```bash
git add .
git commit -m "fix: 文档管理使用真实后端 API，删除 Mock 拦截"
git push
```

### 步骤 2: 连接服务器

```bash
ssh root@121.196.147.222
```

### 步骤 3: 部署（服务器上）

```bash
cd /data/ai-stock-web
sudo ./deploy-config.sh
```

**或者手动执行**：

```bash
cd /data/ai-stock-web
git pull
rm -rf build/ node_modules/.vite
npm run build
sudo ./deploy-local.sh
sudo systemctl restart nginx
```

### 步骤 4: 验证（浏览器）

1. 访问 `http://121.196.147.222`
2. 按 `Ctrl + Shift + R` 清除缓存
3. 打开开发者工具 (F12)
4. 进入 Network 标签
5. 点击"文档管理"菜单

**✅ 成功标志**：

```
Request URL: http://121.196.147.222/api/collections
Request Method: GET
Status Code: 200 OK
Response: {"status":"success","total_collections":1,"collections":[...]}
```

**控制台无错误**，页面正常显示集合列表。

## 📋 预期结果

### 文档管理模块
- ✅ 使用真实后端 API
- ✅ 可以查看真实的集合和文档
- ✅ 可以上传、删除文档
- ✅ 所有操作实时同步到后端

### 其他模块
- ✅ 继续使用 Mock 数据（用户、权限、通知等）
- ✅ 不受影响，正常工作

## 🔍 故障排查

### 问题 1: 浏览器还是显示旧错误

**解决方案**：
```bash
# 完全关闭浏览器，重新打开
# 或使用隐私模式/无痕模式访问
```

### 问题 2: 请求返回 404

**检查 Nginx 配置**：
```bash
sudo cat /etc/nginx/conf.d/financial-data-platform.conf
# 确认 proxy_pass 是: http://121.196.147.222:8000/api/
```

### 问题 3: 构建失败

**清理并重试**：
```bash
rm -rf node_modules/ build/ node_modules/.vite
npm install
npm run build
```

### 问题 4: 页面空白

**检查构建产物**：
```bash
ls -lh /var/www/html/financial-data-platform/
# 确认文件存在且时间是最新的
```

## 📚 相关文档

- `docs/document-real-api-config.md` - 详细配置说明
- `docs/FINAL_DEPLOYMENT_GUIDE.md` - 完整部署指南
- `QUICK_FIX.md` - 快速修复指南
- `verify-config.sh` - 配置验证脚本

## 🎯 关键点

1. **不需要修改 `vite.config.ts`** - 保持 `enableProd: true`
2. **不需要创建新的 fake 文件** - 已删除的就不要再创建
3. **只需要重新构建部署** - 让浏览器加载新的 JS 文件
4. **其他模块不受影响** - 继续使用 Mock 数据

## ⏱️ 预计时间

- 提交代码: 1 分钟
- 服务器部署: 2-3 分钟
- 验证测试: 1 分钟

**总计: 约 5 分钟**

## ✨ 完成后

文档管理模块将：
- 显示真实的集合数据（base 集合，613 个文档）
- 支持上传新文档到后端
- 支持删除文档
- 所有操作实时生效

开始部署吧！🚀
