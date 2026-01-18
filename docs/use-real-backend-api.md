# 使用真实后端 API（已配置）

## 当前状态

✅ **文档管理模块已配置为使用真实后端 API**

- ❌ 没有 `fake/document.fake.ts` mock 文件
- ✅ 所有请求直接调用后端接口
- ✅ API 路径：`http://121.196.147.222:8000/api/`

## 配置说明

### 1. Mock 文件状态

```bash
# 检查 mock 文件
ls fake/document.fake.ts
# 结果：文件不存在 ✅
```

**说明**：没有 mock 文件，所有请求会通过 Vite 代理（开发环境）或 Nginx 代理（生产环境）转发到真实后端。

### 2. 环境变量配置

#### 开发环境（`.env`）
```env
VITE_API_BASE_URL = "/api"
```

#### 生产环境（`.env.production`）
```env
VITE_API_BASE_URL = "/api"
```

### 3. 代理配置

#### 开发环境（Vite 代理）
```typescript
// vite.config.ts
server: {
  proxy: {
    "/api": {
      target: "http://121.196.147.222:8000",
      changeOrigin: true,
    },
  },
}
```

**工作流程**：
```
前端请求: /api/collections
↓
Vite 代理转发: http://121.196.147.222:8000/api/collections
↓
后端响应
```

#### 生产环境（Nginx 代理）
```nginx
location /api/ {
    proxy_pass http://121.196.147.222:8000/api/;
}
```

**工作流程**：
```
前端请求: /api/collections
↓
Nginx 代理转发: http://121.196.147.222:8000/api/collections
↓
后端响应
```

## 文档管理接口列表

所有接口都会调用真实后端：

### 1. 获取 Collections 列表
```
GET /api/collections
→ http://121.196.147.222:8000/api/collections
```

### 2. 获取 Collection 信息
```
GET /api/agent/collection-info?collection_name=base
→ http://121.196.147.222:8000/api/agent/collection-info?collection_name=base
```

### 3. 获取文档列表
```
GET /api/agent/collection/documents?collection_name=base
→ http://121.196.147.222:8000/api/agent/collection/documents?collection_name=base
```

### 4. 上传文档
```
POST /api/agent/upload
→ http://121.196.147.222:8000/api/agent/upload
```

### 5. 删除文档
```
DELETE /api/agent/document/{docId}
→ http://121.196.147.222:8000/api/agent/document/{docId}
```

### 6. 创建 Collection
```
POST /api/agent/collection/create
→ http://121.196.147.222:8000/api/agent/collection/create
```

## 验证真实后端

### 方法 1: 检查 Network 请求

1. 打开开发者工具（F12）
2. 切换到 Network 标签
3. 访问文档管理页面
4. 查看请求：

**真实后端的特征**：
```
✅ Request URL: http://121.196.147.222/api/collections
✅ 或: http://121.196.147.222:3333/api/collections (开发环境)
✅ Response 时间: 取决于网络和后端处理（通常 > 100ms）
✅ Response 数据: 真实的数据库数据
```

**Mock 数据的特征**：
```
❌ Response 时间: 很短（< 50ms）
❌ Response 数据: 固定的测试数据
❌ Console 有 Mock 相关消息
```

### 方法 2: 检查响应数据

真实后端返回的数据：
```json
{
  "status": "success",
  "total_collections": 1,
  "collections": [
    {
      "name": "base",
      "points_count": 613,
      "vectors_count": null,
      "config": {
        "vector_size": 1024,
        "distance_metric": "Cosine"
      }
    }
  ]
}
```

Mock 数据返回的数据（如果有）：
```json
{
  "status": "success",
  "total_collections": 2,
  "collections": [
    {
      "name": "base",
      "points_count": 613,
      ...
    },
    {
      "name": "test-collection",  // ← Mock 数据特征
      "points_count": 50,
      ...
    }
  ]
}
```

### 方法 3: 直接测试后端

```bash
# 在服务器或本地执行
curl http://121.196.147.222:8000/api/collections

# 应该返回真实的数据
```

## 部署流程

### 开发环境

```bash
# 1. 启动开发服务器
npm run dev

# 2. 访问
http://121.196.147.222:3333/#/ai-assistant/documents

# 3. 所有请求通过 Vite 代理转发到后端
```

### 生产环境

```bash
# 1. 确保 .env.production 配置正确
cat .env.production | grep VITE_API_BASE_URL
# 应该输出: VITE_API_BASE_URL = "/api"

# 2. 构建
npm run build

# 3. 部署
sudo ./deploy-local.sh

# 4. 访问
http://121.196.147.222/#/ai-assistant/documents

# 5. 所有请求通过 Nginx 代理转发到后端
```

## 如果需要添加 Mock（不推荐）

如果将来需要添加 Mock 数据用于开发测试：

```bash
# 创建 mock 文件
cat > fake/document.fake.ts << 'EOF'
import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { resultSuccess } from "./utils";

export default defineFakeRoute([
  {
    url: "/api/collections",
    method: "get",
    response: () => {
      return resultSuccess({
        total_collections: 1,
        collections: [
          {
            name: "base",
            points_count: 613,
            vectors_count: null,
            config: {
              vector_size: 1024,
              distance_metric: "Cosine",
            },
          },
        ],
      });
    },
  },
]);
EOF

# 重启开发服务器
npm run dev
```

**注意**：
- Mock 只在开发环境有效
- 生产环境不会使用 Mock（`enableProd: false`）
- 建议使用真实后端进行开发和测试

## 故障排查

### 问题 1: 请求失败

**检查**：
```bash
# 1. 后端服务是否运行
curl http://121.196.147.222:8000/api/collections

# 2. Nginx 代理是否配置正确
sudo nginx -t
sudo systemctl status nginx

# 3. 防火墙是否开放端口
sudo firewall-cmd --list-ports
```

### 问题 2: CORS 错误

**现象**：
```
Access to fetch at 'http://...' has been blocked by CORS policy
```

**解决**：
- 开发环境：Vite 代理自动处理 CORS
- 生产环境：Nginx 代理自动处理 CORS
- 如果仍有问题，检查后端 CORS 配置

### 问题 3: 请求超时

**检查**：
```typescript
// src/utils/request/index.ts
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 180000;
```

**调整**：
```env
# .env 或 .env.production
VITE_API_TIMEOUT = 300000  # 5分钟
```

## 监控和日志

### 开发环境

```bash
# Vite 开发服务器会显示代理日志
npm run dev

# 输出示例：
# [vite] http proxy: /api/collections -> http://121.196.147.222:8000/api/collections
```

### 生产环境

```bash
# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 查看特定接口的请求
sudo tail -f /var/log/nginx/access.log | grep "/api/collections"
```

## 总结

✅ **当前配置**：
- 没有 mock 文件
- 所有请求直接调用后端 API
- 开发环境通过 Vite 代理
- 生产环境通过 Nginx 代理

✅ **验证方法**：
- Network 标签查看请求 URL
- 检查响应数据是否是真实数据
- 直接测试后端接口

✅ **部署流程**：
1. 确保 `.env.production` 配置正确
2. 构建：`npm run build`
3. 部署：`sudo ./deploy-local.sh`
4. 验证：访问页面并检查 Network 请求

现在文档管理模块已经完全使用真实后端 API！
