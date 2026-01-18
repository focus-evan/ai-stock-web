# 快速修复指南

## 问题现状

浏览器显示错误：
```
TypeError: Request with GET/HEAD method cannot have body
```

**原因**: 服务器运行的是旧版本代码，虽然代码已修复但未重新构建部署。

## 快速修复（3分钟）

**当前配置状态**:
- ✅ `vite.config.ts`: `enableProd: true`（其他模块继续使用 Mock）
- ✅ `fake/document.fake.ts`: 已删除（文档管理使用真实 API）
- ✅ 所有代码修复已完成

**需要做的**: 重新构建部署，让浏览器加载新的 JS 文件

在服务器上执行：

```bash
# 1. 进入项目目录
cd /data/ai-stock-web

# 2. 执行快速部署脚本
sudo ./deploy-config.sh
```

**或者手动执行**:

```bash
cd /data/ai-stock-web
git pull
rm -rf build/ node_modules/.vite
npm run build
sudo ./deploy-local.sh
sudo systemctl restart nginx
```

## 验证修复

1. 打开浏览器访问: `http://121.196.147.222`
2. 按 `Ctrl + Shift + R` 清除缓存
3. 打开开发者工具 (F12)，查看 Network 标签
4. 点击"文档管理"菜单

**✅ 成功标志**:
- 请求 URL: `http://121.196.147.222/api/collections`
- 状态码: `200 OK`
- 响应: `{"collections": [...]}`

**❌ 如果还有问题**:
- 完全关闭浏览器重新打开
- 或查看详细指南: `docs/FINAL_DEPLOYMENT_GUIDE.md`

## 已修复的问题

1. ✅ 删除了 Mock 数据拦截 (`fake/document.fake.ts`)
2. ✅ 修复了 GET 请求参数问题
3. ✅ 添加了完整的错误处理
4. ✅ 修复了上传接口参数格式
5. ✅ 配置了正确的环境变量

## 技术细节

- 开发环境 (npm run dev): 使用 Vite 代理，端口 3333
- 生产环境 (部署后): 使用 Nginx 代理，端口 80
- API 路径: `/api/*` → `http://121.196.147.222:8000/api/*`
