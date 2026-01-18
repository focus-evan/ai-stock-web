# 文档明细查询接口

## 接口概述

新增文档明细查询接口，用于获取单个文档的完整信息，包括所有分块（chunks）的详细内容和元数据。

## API 规格

### 请求

```http
GET /api/agent/document/{docId}?collection_name={collectionName}
```

### 参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `docId` | Path | string | ✅ | 文档 ID |
| `collection_name` | Query | string | ✅ | Collection 名称 |

### 响应

```typescript
{
  status: string                    // 状态: "success"
  doc_id: string                    // 文档 ID
  file_name: string                 // 文件名
  chunk_count: number               // 分块数量
  chunks: DocumentChunk[]           // 分块列表
  collection_name: string           // Collection 名称
}
```

### 分块结构

```typescript
{
  point_id: string                  // 向量点 ID
  text: string                      // 文本内容
  metadata: {
    _node_type: string              // 节点类型: "TextNode"
    creation_date: string           // 创建日期
    doc_id: string                  // 文档 ID
    document_id: string             // 文档 ID（同 doc_id）
    file_name: string               // 文件名
    file_path: string               // 文件路径
    file_size: number               // 文件大小（字节）
    file_type: string               // 文件类型: "text/plain"
    last_modified_date: string      // 最后修改日期
    ref_doc_id: string              // 引用文档 ID
    [key: string]: any              // 其他元数据
  }
}
```

## 请求示例

### cURL

```bash
curl --location 'http://121.196.147.222:8000/api/agent/document/3d1c3782-d4e1-448e-a423-1c1d7cffa6db?collection_name=company'
```

### TypeScript

```typescript
import { getDocumentDetail } from '@/api/document';

const detail = await getDocumentDetail(
  '3d1c3782-d4e1-448e-a423-1c1d7cffa6db',
  'company'
);
```

### JavaScript (Fetch)

```javascript
const response = await fetch(
  'http://121.196.147.222:8000/api/agent/document/3d1c3782-d4e1-448e-a423-1c1d7cffa6db?collection_name=company'
);
const data = await response.json();
```

## 响应示例

```json
{
  "status": "success",
  "doc_id": "3d1c3782-d4e1-448e-a423-1c1d7cffa6db",
  "file_name": "2022.08.10公司-阿里反垄断如何应对.txt",
  "chunk_count": 18,
  "chunks": [
    {
      "point_id": "0ba1ff84-d86c-4ec5-a8f4-a7876d4a46f7",
      "text": "文档内容片段...",
      "metadata": {
        "_node_type": "TextNode",
        "creation_date": "2026-01-18",
        "doc_id": "3d1c3782-d4e1-448e-a423-1c1d7cffa6db",
        "document_id": "3d1c3782-d4e1-448e-a423-1c1d7cffa6db",
        "file_name": "2022.08.10公司-阿里反垄断如何应对.txt",
        "file_path": "/tmp/tmpgu8rjil2/2022.08.10公司-阿里反垄断如何应对.txt",
        "file_size": 36888,
        "file_type": "text/plain",
        "last_modified_date": "2026-01-18",
        "ref_doc_id": "3d1c3782-d4e1-448e-a423-1c1d7cffa6db"
      }
    },
    {
      "point_id": "4aaa2ba8-d650-497d-bbd8-229fe779bb66",
      "text": "另一个文档内容片段...",
      "metadata": {
        // ... 同上
      }
    }
    // ... 更多分块
  ],
  "collection_name": "company"
}
```

## 使用场景

### 1. 查看文档内容

```typescript
const detail = await getDocumentDetail(docId, collectionName);

console.log(`文档名称: ${detail.file_name}`);
console.log(`分块数量: ${detail.chunk_count}`);

// 遍历所有分块
detail.chunks.forEach((chunk, index) => {
  console.log(`分块 ${index + 1}:`);
  console.log(`  ID: ${chunk.point_id}`);
  console.log(`  内容: ${chunk.text}`);
  console.log(`  文件大小: ${chunk.metadata.file_size} 字节`);
});
```

### 2. 导出文档内容

```typescript
const detail = await getDocumentDetail(docId, collectionName);

// 合并所有分块的文本
const fullText = detail.chunks
  .map(chunk => chunk.text)
  .join('\n\n');

// 下载为文件
const blob = new Blob([fullText], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = detail.file_name;
a.click();
```

### 3. 分析文档元数据

```typescript
const detail = await getDocumentDetail(docId, collectionName);

// 获取文档信息
const firstChunk = detail.chunks[0];
const metadata = firstChunk.metadata;

console.log('文档信息:');
console.log(`  文件名: ${metadata.file_name}`);
console.log(`  文件大小: ${metadata.file_size} 字节`);
console.log(`  文件类型: ${metadata.file_type}`);
console.log(`  创建日期: ${metadata.creation_date}`);
console.log(`  最后修改: ${metadata.last_modified_date}`);
```

### 4. 搜索特定内容

```typescript
const detail = await getDocumentDetail(docId, collectionName);

// 搜索包含特定关键词的分块
const keyword = '反垄断';
const matchingChunks = detail.chunks.filter(chunk =>
  chunk.text.includes(keyword)
);

console.log(`找到 ${matchingChunks.length} 个包含"${keyword}"的分块`);
matchingChunks.forEach((chunk, index) => {
  console.log(`匹配 ${index + 1}: ${chunk.text.substring(0, 100)}...`);
});
```

## 类型定义

### TypeScript 接口

```typescript
// 文档分块
interface DocumentChunk {
  point_id: string
  text: string
  metadata: {
    _node_type: string
    creation_date: string
    doc_id: string
    document_id: string
    file_name: string
    file_path: string
    file_size: number
    file_type: string
    last_modified_date: string
    ref_doc_id: string
    [key: string]: any
  }
}

// 文档详情响应
interface DocumentDetailResponse {
  status: string
  doc_id: string
  file_name: string
  chunk_count: number
  chunks: DocumentChunk[]
  collection_name: string
}

// API 函数
function getDocumentDetail(
  docId: string,
  collectionName: string
): Promise<DocumentDetailResponse>
```

## 错误处理

### 文档不存在

```json
{
  "status": "error",
  "message": "Document not found",
  "doc_id": "invalid-id"
}
```

### Collection 不存在

```json
{
  "status": "error",
  "message": "Collection not found",
  "collection_name": "invalid-collection"
}
```

### 参数缺失

```json
{
  "status": "error",
  "message": "Missing required parameter: collection_name"
}
```

## 性能考虑

### 响应大小

- 每个分块包含完整的文本和元数据
- 对于大文档（>100 个分块），响应可能较大
- 建议在前端实现分页或虚拟滚动

### 缓存策略

```typescript
// 使用 React Query 缓存
import { useQuery } from '@tanstack/react-query';

function useDocumentDetail(docId: string, collectionName: string) {
  return useQuery({
    queryKey: ['document-detail', docId, collectionName],
    queryFn: () => getDocumentDetail(docId, collectionName),
    staleTime: 5 * 60 * 1000, // 5 分钟
    cacheTime: 10 * 60 * 1000, // 10 分钟
  });
}
```

## 与其他接口的关系

### 文档列表 → 文档详情

```typescript
// 1. 获取文档列表
const list = await getDocuments({ collection_name: 'company' });

// 2. 选择一个文档
const doc = list.documents[0];

// 3. 获取详情
const detail = await getDocumentDetail(doc.doc_id, 'company');
```

### 上传 → 查询详情

```typescript
// 1. 上传文档
const uploadResult = await uploadDocument(file, 'company');

// 2. 获取文档列表（找到新上传的文档）
const list = await getDocuments({ collection_name: 'company' });
const newDoc = list.documents.find(d => 
  d.file_name === file.name
);

// 3. 查看详情
if (newDoc) {
  const detail = await getDocumentDetail(newDoc.doc_id, 'company');
}
```

## 最佳实践

### 1. 错误处理

```typescript
try {
  const detail = await getDocumentDetail(docId, collectionName);
  // 处理成功响应
} catch (error) {
  if (error.response?.status === 404) {
    console.error('文档不存在');
  } else {
    console.error('查询失败:', error);
  }
}
```

### 2. 加载状态

```typescript
const [loading, setLoading] = useState(false);
const [detail, setDetail] = useState(null);

async function loadDetail() {
  setLoading(true);
  try {
    const data = await getDocumentDetail(docId, collectionName);
    setDetail(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}
```

### 3. 数据验证

```typescript
const detail = await getDocumentDetail(docId, collectionName);

// 验证响应
if (detail.status !== 'success') {
  throw new Error('查询失败');
}

if (detail.chunk_count !== detail.chunks.length) {
  console.warn('分块数量不匹配');
}

// 验证每个分块
detail.chunks.forEach((chunk, index) => {
  if (!chunk.point_id || !chunk.metadata) {
    console.error(`分块 ${index} 数据不完整`);
  }
});
```

## 总结

文档明细查询接口提供了查看单个文档完整内容的能力，包括：

- ✅ 文档基本信息（ID、文件名、分块数）
- ✅ 所有分块的文本内容
- ✅ 详细的元数据（文件大小、类型、日期等）
- ✅ 向量点 ID（用于高级查询）

这个接口适用于文档预览、内容导出、元数据分析等场景。
