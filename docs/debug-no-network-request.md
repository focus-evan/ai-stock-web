# 调试：Network 中看不到请求

## 问题现象

- 点击"文档管理"菜单
- Network 标签中看不到 `/api/collections` 请求
- 但智能问答功能的 `/api/agent/rag/offline` 请求正常

## 可能的原因

### 1. Mock 数据拦截（最可能）

**检查方法**：
1. 打开浏览器 Console
2. 查看是否有这条消息：
   ```
   [vite-plugin-fake-server]: The plugin is applied in the production environment
   ```

**如果有**，说明 Mock 数据在拦截请求。

**解决方案**：
```bash
# 在服务器上
cd /data/ai-stock-web

# 检查是否有 document mock 文件
ls -la fake/document.fake.ts

# 如果存在，重命名或删除
mv fake/document.fake.ts fake/document.fake.ts.bak

# 重新构建和部署
npm run build
sudo ./deploy-local.sh
```

### 2. JavaScript 错误

**检查方法**：
1. 打开浏览器 Console 标签
2. 查看是否有红色错误信息
3. 特别注意 TypeScript 类型错误或运行时错误

**常见错误**：
```
TypeError: Cannot read property 'xxx' of undefined
SyntaxError: Unexpected token
```

**解决方案**：
- 查看具体错误信息
- 修复代码中的错误
- 重新构建和部署

### 3. 请求太快（被缓存）

**检查方法**：
1. 打开 Network 标签
2. 勾选 "Disable cache"
3. 刷新页面
4. 查看是否出现请求

**如果仍然看不到**：
- 请求可能被 Mock 拦截
- 或者请求根本没有发出

### 4. useRequest 配置问题

**检查代码**：
```typescript
// 如果有 ready: false，请求不会发出
useRequest(getCollections, {
  ready: false,  // ❌ 这会阻止请求
});

// 正确的配置
useRequest(getCollections);  // ✅ 立即发出请求
```

## 调试步骤

### 步骤 1: 检查 Console 错误

打开开发者工具 → Console 标签：

**查找**：
- 红色错误信息
- Mock 数据相关的消息
- "Failed to fetch" 错误

### 步骤 2: 检查 Network 设置

1. 打开 Network 标签
2. 确保没有过滤器（All 选项）
3. 勾选 "Disable cache"
4. 清空列表（垃圾桶图标）
5. 刷新页面

### 步骤 3: 手动触发请求

在 Console 中执行：

```javascript
// 测试 collections 接口
fetch('/api/collections')
  .then(r => r.json())
  .then(data => console.log('Collections:', data))
  .catch(err => console.error('Error:', err));
```

**期望结果**：
```
Collections: {status: "success", total_collections: 1, ...}
```

**如果看到 Mock 数据**：
```
Collections: {status: "success", total_collections: 2, collections: [{name: "base"}, {name: "test-collection"}]}
```
说明 Mock 数据在拦截请求。

### 步骤 4: 检查 Mock 文件

在服务器上：

```bash
cd /data/ai-stock-web

# 列出所有 fake 文件
ls -la fake/

# 查看 document mock 文件
cat fake/document.fake.ts 2>/dev/null || echo "文件不存在"
```

**如果文件存在**：
```bash
# 重命名（保留备份）
mv fake/document.fake.ts fake/document.fake.ts.bak

# 重新构建
npm run build

# 部署
sudo ./deploy-local.sh
```

### 步骤 5: 检查构建产物

```bash
# 检查构建中是否包含 Mock 代码
grep -r "vite-plugin-fake-server" build/assets/*.js

# 如果找到，说明 Mock 被打包进去了
# 需要禁用生产环境的 Mock
```

## 解决方案

### 方案 1: 删除 Mock 文件（推荐）

```bash
cd /data/ai-stock-web

# 删除或重命名 document mock 文件
mv fake/document.fake.ts fake/document.fake.ts.bak

# 重新构建
rm -rf build/
npm run build

# 部署
sudo ./deploy-local.sh

# 清除浏览器缓存
# Ctrl + Shift + R
```

### 方案 2: 禁用生产环境 Mock

编辑 `vite.config.ts`：

```typescript
vitePluginFakeServer({
  basename: "/api",
  enableProd: false,  // 改为 false
  timeout: 1000,
}),
```

然后重新构建和部署。

### 方案 3: 使用开发环境测试

```bash
# 在服务器上启动开发服务器
cd /data/ai-stock-web
npm run dev

# 访问
http://121.196.147.222:3333/#/ai-assistant/documents
```

开发环境中可以更容易看到请求和调试。

## 验证修复

### 1. 检查 Network

打开 Network 标签，应该看到：

```
✅ Request URL: http://121.196.147.222/api/collections
✅ Request Method: GET
✅ Status Code: 200 OK
✅ Response: {"status":"success","total_collections":1,...}
```

### 2. 检查 Console

应该没有错误，或者至少没有阻止请求的错误。

### 3. 检查页面功能

- Collections 下拉框应该有数据
- 选择 Collection 后，文档列表应该加载

## 对比：智能问答 vs 文档管理

### 智能问答（正常）

```
✅ Request URL: http://121.196.147.222/api/agent/rag/offline
✅ Request Method: POST
✅ Status Code: 200 OK
```

**说明**：
- API 路径配置正确
- Nginx 代理工作正常
- 后端连接正常

### 文档管理（异常）

```
❌ Network 中看不到请求
```

**可能原因**：
1. Mock 数据拦截（请求被 Mock 处理，不经过网络）
2. JavaScript 错误（请求没有发出）
3. useRequest 配置问题（请求被阻止）

## 快速诊断命令

在浏览器 Console 中执行：

```javascript
// 1. 检查是否有 Mock
console.log('Mock enabled:', window.__FAKE_SERVER_ENABLED__);

// 2. 手动测试 API
fetch('/api/collections')
  .then(r => {
    console.log('Status:', r.status);
    console.log('URL:', r.url);
    return r.json();
  })
  .then(data => {
    console.log('Data:', data);
    // 检查数据是否是 Mock 数据
    if (data.collections && data.collections.length === 2) {
      console.warn('⚠️  这可能是 Mock 数据');
    }
  });

// 3. 检查 useRequest
// 在页面组件中添加日志
console.log('Collections loading:', collectionsLoading);
console.log('Collections data:', collectionsResponse);
console.log('Collections error:', collectionsError);
```

## 总结

**最可能的原因**：Mock 数据拦截了请求

**解决方案**：
1. 删除 `fake/document.fake.ts`
2. 重新构建：`npm run build`
3. 部署：`sudo ./deploy-local.sh`
4. 清除浏览器缓存

**验证**：
- Network 中应该看到 `/api/collections` 请求
- 状态码应该是 200
- 响应应该是真实的后端数据
