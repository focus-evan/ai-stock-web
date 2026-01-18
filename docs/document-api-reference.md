# 文档管理模块 API 接口整理

## 概述
文档管理模块提供了文档上传、Collection 管理、文档查询和删除等功能的后端接口。

---

## 1. 文档上传接口

### 1.1 上传文档（同步）
**函数**: `uploadDocument(file, collectionName, options?)`

**接口**: `POST /api/agent/upload`

**查询参数**:
- `collection_name`: string - Collection 名称（必填）
- `chunking_strategy_code`: string - 分块策略代码（可选，如 "chunking_smart"）
- `chunking_strategy_params`: string - 分块策略参数 JSON 字符串（可选）
- `embedding_strategy_code`: string - 嵌入策略代码（可选，如 "bge_large_zh"）
- `embedding_strategy_params`: string - 嵌入策略参数 JSON 字符串（可选）

**请求体**: FormData
- `files`: File - 要上传的文件

**函数参数**:
```typescript
{
  file: File
  collectionName: string
  options?: {
    onProgress?: (progress: number) => void
    chunkingStrategyCode?: string
    chunkingStrategyParams?: {
      chunk_size?: number
      chunk_overlap?: number
    }
    embeddingStrategyCode?: string
    embeddingStrategyParams?: {
      model_name?: string
    }
  }
}
```

**响应类型**: `UploadResponse`
```typescript
{
  status: string
  message: string
  uploaded_files: string[]
  documents_ingested: number
  collection_name: string
}
```

**请求示例**:
```
POST /api/agent/upload?collection_name=s-kd&chunking_strategy_code=chunking_smart&chunking_strategy_params={"chunk_size":512,"chunk_overlap":100}&embedding_strategy_code=bge_large_zh&embedding_strategy_params={"model_name":"BAAI/bge-large-zh"}
Content-Type: multipart/form-data

files: [文件内容]
```

**超时时间**: 60秒

---

### 1.2 上传文档（FormData 方式）
**函数**: `uploadDocumentWithFormData(formData)`

**接口**: `POST /api/agent/upload`

**参数**:
- `formData`: FormData - 包含文件和 collection_name 的表单数据

**响应类型**: `UploadResponse`

**超时时间**: 60秒

---

### 1.3 上传文档（异步）
**函数**: `uploadDocumentAsync(formData)`

**接口**: `POST /api/agent/upload/async`

**参数**:
- `formData`: FormData - 包含文件和 collection_name 的表单数据

**响应类型**: `UploadTaskResponse`
```typescript
{
  status: string
  task_id: string
  message: string
}
```

---

### 1.4 查询上传任务状态
**函数**: `getTaskStatus(task_id)`

**接口**: `GET /api/agent/task/{task_id}`

**参数**:
- `task_id`: string - 任务 ID

**响应类型**: `TaskResponse`
```typescript
{
  status: string
  task_id: string
  state: string
  result?: any
  error?: string
}
```

---

## 2. Collection 管理接口

### 2.1 创建 Collection
**函数**: `createCollection(name, description?)`

**接口**: `POST /api/agent/collection/create`

**参数**:
- `name`: string - Collection 名称
- `description`: string - 可选的描述

**请求体**:
```json
{
  "name": "string",
  "description": "string"
}
```

**响应类型**: `CreateCollectionResponse`
```typescript
{
  status: string
  message: string
  collection_name: string
  config: {
    vector_size: number
    distance_metric: string
  }
}
```

---

### 2.2 创建 Collection（参数对象方式）
**函数**: `createCollectionWithParams(params)`

**接口**: `POST /api/agent/collection/create`

**参数**: `CreateCollectionParams`
```typescript
{
  collection_name: string
  vector_size?: number
  distance?: "Cosine" | "Euclid" | "Dot"
  on_disk?: boolean
}
```

**响应类型**: `CreateCollectionResponse`

---

### 2.3 查询 Collection 信息
**函数**: `getCollectionInfo(collection_name?)`

**接口**: `GET /api/agent/collection-info`

**查询参数**:
- `collection_name`: string - Collection 名称（默认: "base"）

**响应类型**: `CollectionInfo`
```typescript
{
  status: string
  collection_name: string
  points_count: number
  vectors_count: number | null
  config: {
    vector_size: number
    distance_metric: string
  }
}
```

**实际返回示例**:
```json
{
  "status": "success",
  "collection_name": "base",
  "points_count": 613,
  "vectors_count": null,
  "config": {
    "vector_size": 1024,
    "distance_metric": "Cosine"
  }
}
```

---

### 2.4 查询所有 Collections
**函数**: `getAllCollections()` / `getCollections()`

**接口**: `GET /api/collections`

**响应类型**: `CollectionListResponse`
```typescript
{
  status: string
  total_collections: number
  collections: Array<{
    name: string
    points_count: number
    vectors_count: number | null
    config: {
      vector_size: number
      distance_metric: string
    }
  }>
}
```

**实际返回示例**:
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

---

## 3. 文档查询接口

### 3.1 查询 Collection 文档列表
**函数**: `getCollectionDocuments(params)` / `getDocuments(params)`

**接口**: `GET /api/agent/collection/documents`

**查询参数**:
```typescript
{
  collection_name?: string
  limit?: number
  offset?: number
}
```

**响应类型**: `DocumentListResponse`
```typescript
{
  status: string
  collection_name: string
  total_points: number
  total_documents: number
  scanned_points: number
  documents: Array<{
    doc_id: string
    file_name: string
    chunk_count: number
  }>
}
```

**实际返回示例**:
```json
{
  "status": "success",
  "collection_name": "base",
  "total_points": 613,
  "total_documents": 134,
  "scanned_points": 613,
  "documents": [
    {
      "doc_id": "8f1087cd-718d-4152-905b-ed050ee7c8d0",
      "file_name": "《人生第一个1000万》股票中级课程.txt",
      "chunk_count": 103
    },
    {
      "doc_id": "15e0a050-e153-4dde-8249-c743edf022b5",
      "file_name": "2023.06.11产业-马斯克中国行，点燃2大【万亿赛道】.txt",
      "chunk_count": 32
    }
  ]
}
```

---

## 4. 文档删除接口

### 4.1 删除文档
**函数**: `deleteDocument(docId)`

**接口**: `DELETE /api/agent/document/{docId}`

**参数**:
- `docId`: string - 文档 ID

**响应**: JSON 响应（具体格式未定义）

---

## 接口使用示例

### 上传文档示例（基础）
```typescript
import { uploadDocument } from '@/api/document';

const file = new File(['content'], 'example.pdf');
const result = await uploadDocument(file, 'my-collection', {
  onProgress: (progress) => console.log(`上传进度: ${progress}%`)
});
```

### 上传文档示例（带策略参数）
```typescript
import { uploadDocument } from '@/api/document';

const file = new File(['content'], 'example.pdf');
const result = await uploadDocument(file, 's-kd', {
  chunkingStrategyCode: 'chunking_smart',
  chunkingStrategyParams: {
    chunk_size: 512,
    chunk_overlap: 100
  },
  embeddingStrategyCode: 'bge_large_zh',
  embeddingStrategyParams: {
    model_name: 'BAAI/bge-large-zh'
  },
  onProgress: (progress) => console.log(`上传进度: ${progress}%`)
});
```

### 创建 Collection 示例
```typescript
import { createCollection } from '@/api/document';

const result = await createCollection('my-collection', '我的文档集合');
```

### 查询文档列表示例
```typescript
import { getDocuments } from '@/api/document';

const result = await getDocuments({
  collection_name: 'my-collection',
  limit: 20,
  offset: 0
});
```

### 删除文档示例
```typescript
import { deleteDocument } from '@/api/document';

await deleteDocument('doc-id-123');
```

---

## 注意事项

1. **API 路径统一**: 
   - 所有文档管理接口现在统一使用 `/api/` 前缀
   - Collection 列表: `/api/collections`
   - 其他接口: `/api/agent/` 前缀

2. **超时设置**: 文档上传接口设置了 60 秒超时时间，适用于大文件上传

3. **异步上传**: 对于大文件，建议使用 `uploadDocumentAsync` 异步上传，然后通过 `getTaskStatus` 轮询任务状态

4. **进度回调**: 同步上传支持进度回调，但目前是模拟进度（因为 ky 不直接支持上传进度）

5. **默认 Collection**: 查询 Collection 信息时，默认使用 "base" 作为 Collection 名称

6. **FormData 格式**: 上传接口需要使用 FormData 格式，字段名为 `files`（注意是复数）

7. **上传策略参数**: 
   - 分块策略和嵌入策略参数通过 URL 查询参数传递
   - 策略参数需要 JSON 序列化后作为字符串传递
   - 常用分块策略: `chunking_smart`，参数包括 `chunk_size` 和 `chunk_overlap`
   - 常用嵌入策略: `bge_large_zh`，参数包括 `model_name`

8. **Collection 配置**: 
   - 默认向量维度: 1024
   - 默认距离度量: Cosine
   - `vectors_count` 字段可能为 null

9. **GET 请求参数过滤**: 
   - GET 请求会自动过滤掉 undefined 值，避免请求错误
   - 只传递有效的查询参数

---

## 相关文件
- API 实现: `src/api/document/index.ts`
- 类型定义: `src/api/document/types.ts`
- 页面组件: `src/pages/ai-assistant/documents/index.tsx`
