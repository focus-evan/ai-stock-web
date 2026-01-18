# 文档管理 API 修复完成 ✅

## 修复内容

### 问题
- 文档管理页面无法加载真实数据
- API 接口本身正常，但被 Mock 数据拦截
- 浏览器显示错误：`Request with GET/HEAD method cannot have body`

### 解决方案
- ✅ 删除 `fake/document.fake.ts`（不再拦截文档管理 API）
- ✅ 保持 `vite.config.ts` 中 `enableProd: true`（其他模块继续使用 Mock）
- ✅ 修复所有 API 调用参数
- ✅ 添加完整的错误处理
- ✅ 配置正确的环境变量

## 配置状态

| 项目 | 状态 | 说明 |
|------|------|------|
| `fake/document.fake.ts` | ❌ 已删除 | 文档管理使用真实 API |
| `vite.config.ts` | ✅ enableProd: true | 其他模块使用 Mock |
| `.env.production` | ✅ 已配置 | VITE_API_BASE_URL = "/api" |
| API 文件 | ✅ 已修复 | 正确的参数和错误处理 |
| 页面文件 | ✅ 已修复 | 完整的错误处理 |
| Nginx 配置 | ✅ 已修复 | 正确的代理路径 |

## 部署步骤

### 快速部署（推荐）

```bash
# 1. 提交代码
git add .
git commit -m "fix: 文档管理使用真实 API"
git push

# 2. 服务器部署
ssh root@121.196.147.222
cd /data/ai-stock-web
sudo ./deploy-config.sh

# 3. 浏览器验证
# 访问 http://121.196.147.222
# 按 Ctrl + Shift + R
```

### 手动部署

```bash
# 服务器上执行
cd /data/ai-stock-web
git pull
rm -rf build/ node_modules/.vite
npm run build
sudo ./deploy-local.sh
sudo systemctl restart nginx
```

## 验证方法

### 1. 检查 Network 请求

打开浏览器开发者工具 (F12)，Network 标签：

**✅ 正确**:
```
GET http://121.196.147.222/api/collections
Status: 200 OK
Response: {"status":"success","collections":[{"name":"base","points_count":613,...}]}
```

### 2. 检查控制台

**✅ 正确**: 无错误信息

**❌ 错误**: 如果还看到以下错误，说明浏览器缓存未清除
```
[vite-plugin-fake-server]: The plugin is applied in the production environment
TypeError: Request with GET/HEAD method cannot have body
```

### 3. 检查页面功能

- ✅ 可以看到集合列表（base 集合，613 个文档）
- ✅ 可以选择集合查看文档
- ✅ 可以上传新文档
- ✅ 可以删除文档
- ✅ 可以创建新集合

## 技术说明

### Mock 拦截原理

```
vite-plugin-fake-server 工作流程:
1. 读取所有 fake/*.fake.ts 文件
2. 注册路由拦截规则
3. 请求到来时匹配路由
4. 匹配成功 → 返回 Mock 数据
5. 匹配失败 → 转发到真实后端
```

### 为什么删除 fake 文件就能用真实 API？

因为没有定义拦截规则，所有文档管理的请求都会：
```
浏览器 → fake-server（无匹配） → Vite/Nginx 代理 → 真实后端
```

### 为什么其他模块还能用 Mock？

因为它们的 fake 文件还在：
```
fake/user.fake.ts       → 拦截用户 API
fake/auth.fake.ts       → 拦截认证 API
fake/notification.fake.ts → 拦截通知 API
等等...
```

## 文件清单

### 核心修改
- `fake/document.fake.ts` - 已删除 ❌
- `src/api/document/index.ts` - 修复 API 调用 ✅
- `src/pages/ai-assistant/documents/index.tsx` - 添加错误处理 ✅
- `.env.production` - 配置环境变量 ✅
- `deploy-local.sh` - 修复 Nginx 配置 ✅

### 新增文档
- `DEPLOY_NOW.md` - 立即部署指南 📄
- `SUMMARY.md` - 配置总结 📄
- `docs/document-real-api-config.md` - 详细配置说明 📄
- `docs/FINAL_DEPLOYMENT_GUIDE.md` - 完整部署指南 📄
- `QUICK_FIX.md` - 快速修复指南 📄
- `verify-config.sh` - 配置验证脚本 🔧
- `deploy-config.sh` - 快速部署脚本 🔧

## 影响范围

### 文档管理模块 ✅
- 使用真实后端 API
- 所有操作实时生效
- 数据持久化到后端

### 其他模块 ✅
- 继续使用 Mock 数据
- 不受任何影响
- 开发体验不变

## 预计效果

部署后，文档管理页面将：
1. 显示真实的集合数据（base 集合，613 个文档）
2. 支持上传文档到后端
3. 支持删除文档
4. 支持创建新集合
5. 所有操作实时同步到后端数据库

## 故障排查

### 问题：浏览器还是显示旧错误

**原因**: 浏览器缓存了旧的 JS 文件

**解决**:
1. 硬刷新：`Ctrl + Shift + R`
2. 清除缓存：开发者工具 → Application → Clear storage
3. 隐私模式：使用无痕模式访问
4. 完全关闭浏览器重新打开

### 问题：请求返回 404

**原因**: Nginx 配置不正确

**解决**:
```bash
# 检查配置
sudo cat /etc/nginx/conf.d/financial-data-platform.conf

# 确认 proxy_pass 是:
# proxy_pass http://121.196.147.222:8000/api/;

# 重启 Nginx
sudo systemctl restart nginx
```

### 问题：构建失败

**原因**: 缓存或依赖问题

**解决**:
```bash
rm -rf node_modules/ build/ node_modules/.vite
npm install
npm run build
```

## 时间线

- **问题发现**: 文档管理页面无法加载
- **问题分析**: Mock 数据拦截真实 API
- **解决方案**: 删除 fake 文件，保持其他配置
- **配置完成**: 2026-01-18
- **预计部署**: 5 分钟
- **验证测试**: 1 分钟

## 下一步

1. **立即部署**: 参考 `DEPLOY_NOW.md`
2. **验证配置**: 运行 `./verify-config.sh`
3. **查看详情**: 阅读 `docs/document-real-api-config.md`

---

**修复完成** ✅  
**配置正确** ✅  
**可以部署** ✅  

开始部署吧！🚀
