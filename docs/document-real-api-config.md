# 文档管理使用真实后端 API 配置说明

## 配置概述

当前配置允许：
- ✅ **文档管理模块**：使用真实后端 API
- ✅ **其他模块**（用户、权限、通知等）：继续使用 Mock 数据

## 配置详情

### 1. Vite 配置 (`vite.config.ts`)

```typescript
vitePluginFakeServer({
    basename: "/api",
    enableProd: true,  // 生产环境启用 Mock
    timeout: 1000,
}),
```

### 2. Fake 文件状态

| 模块 | Fake 文件 | 状态 | 说明 |
|------|-----------|------|------|
| 文档管理 | `fake/document.fake.ts` | ❌ 已删除 | 不拦截，使用真实 API |
| 用户信息 | `fake/user.fake.ts` | ✅ 存在 | 使用 Mock 数据 |
| 权限认证 | `fake/auth.fake.ts` | ✅ 存在 | 使用 Mock 数据 |
| 动态路由 | `fake/async-routes.fake.ts` | ✅ 存在 | 使用 Mock 数据 |
| 通知 | `fake/notification.fake.ts` | ✅ 存在 | 使用 Mock 数据 |
| 系统 | `fake/system.fake.ts` | ✅ 存在 | 使用 Mock 数据 |

### 3. 文档管理 API 路径

以下 API 路径**不会被 Mock 拦截**，直接请求后端：

- `GET /api/collections` - 获取所有集合
- `GET /api/agent/collection-info` - 获取集合信息
- `GET /api/agent/collection/documents` - 获取集合文档列表
- `POST /api/agent/collection/create` - 创建集合
- `POST /api/agent/upload` - 上传文档（同步）
- `POST /api/agent/upload/async` - 上传文档（异步）
- `GET /api/agent/task/:task_id` - 查询任务状态
- `DELETE /api/agent/document/:doc_id` - 删除文档

## 工作原理

1. **vite-plugin-fake-server** 只拦截在 `fake/*.fake.ts` 文件中定义的路由
2. 由于 `fake/document.fake.ts` 已被删除，文档管理的 API 不会被拦截
3. 未被拦截的请求会通过 Vite 代理（开发环境）或 Nginx 代理（生产环境）转发到真实后端

## 请求流程

### 开发环境 (npm run dev)

```
浏览器 → Vite Dev Server (端口 3333)
         ↓
    检查 fake/*.fake.ts
         ↓
    未找到匹配路由
         ↓
    Vite 代理转发
         ↓
    后端 API (http://121.196.147.222:8000)
```

### 生产环境 (部署后)

```
浏览器 → Nginx (端口 80)
         ↓
    /api/* 路径匹配
         ↓
    Nginx 代理转发
         ↓
    后端 API (http://121.196.147.222:8000/api/*)
```

## 验证配置

### 1. 检查 Fake 文件

```bash
# 确认 document.fake.ts 不存在
ls fake/document.fake.ts
# 应该显示: No such file or directory
```

### 2. 检查 API 请求

打开浏览器开发者工具 (F12)，Network 标签：

**✅ 正确的请求**:
```
Request URL: http://121.196.147.222/api/collections
Request Method: GET
Status Code: 200 OK
Response: {"status":"success","collections":[...]}
```

**❌ 被 Mock 拦截的请求**:
```
Request URL: http://121.196.147.222/api/collections
Request Method: GET
Status Code: 200 OK
Response: {"code":0,"data":[],"message":"success"}  // Mock 数据格式
```

### 3. 检查控制台

**✅ 正常情况**: 无错误

**❌ 如果看到以下错误**:
```
[vite-plugin-fake-server]: The plugin is applied in the production environment
TypeError: Request with GET/HEAD method cannot have body
```

说明浏览器缓存了旧的 JS 文件，需要：
1. 清除浏览器缓存 (`Ctrl + Shift + R`)
2. 或重新构建部署

## 部署步骤

当修改了 fake 文件配置后，需要重新构建部署：

```bash
# 在服务器上执行
cd /data/ai-stock-web

# 拉取最新代码
git pull

# 清理缓存
rm -rf build/ node_modules/.vite

# 重新构建
npm run build

# 部署
sudo ./deploy-local.sh

# 重启 Nginx
sudo systemctl restart nginx
```

## 添加新的 Mock API

如果需要为其他模块添加 Mock 数据：

1. 在 `fake/` 目录创建新文件，如 `fake/stock.fake.ts`
2. 定义路由：

```typescript
import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { resultSuccess } from "./utils";

export default defineFakeRoute([
    {
        url: "/stock/list",
        method: "get",
        response: () => resultSuccess({
            list: [/* mock data */],
        }),
    },
]);
```

3. 重启开发服务器或重新构建

## 让其他模块也使用真实 API

如果需要让某个模块使用真实 API：

1. 删除对应的 fake 文件，如 `rm fake/user.fake.ts`
2. 重新构建部署

## 常见问题

### Q1: 为什么开发环境正常，生产环境有问题？

**A**: 生产环境使用的是构建后的 JS 文件，需要重新构建才能应用代码更改。

### Q2: 如何确认请求没有被 Mock 拦截？

**A**: 查看 Network 标签中的响应数据格式。真实 API 返回的格式与 Mock 数据不同。

### Q3: 删除 fake 文件后还是被拦截？

**A**: 
1. 确认文件已删除：`ls fake/document.fake.ts`
2. 清理构建缓存：`rm -rf build/ node_modules/.vite`
3. 重新构建：`npm run build`
4. 清除浏览器缓存：`Ctrl + Shift + R`

### Q4: 能否在生产环境完全禁用 Mock？

**A**: 可以，将 `vite.config.ts` 中的 `enableProd` 改为 `false`：

```typescript
vitePluginFakeServer({
    basename: "/api",
    enableProd: false,  // 生产环境禁用 Mock
    timeout: 1000,
}),
```

## 总结

当前配置实现了：
- 文档管理模块使用真实后端 API（通过删除 `fake/document.fake.ts`）
- 其他模块继续使用 Mock 数据（保留其他 fake 文件）
- 开发和生产环境都能正常工作

这种配置方式灵活且易于维护，可以根据需要随时调整哪些模块使用真实 API，哪些使用 Mock 数据。
