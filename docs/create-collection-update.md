# 创建集合接口更新说明

## 更新概述

创建集合接口已更新为支持完整的向量数据库配置参数。

## 新的请求格式

### API 请求

```http
POST /api/agent/collection/create
Content-Type: application/json

{
  "collection_name": "company",
  "vector_size": 1024,
  "distance": "Cosine",
  "on_disk": false
}
```

### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `collection_name` | string | ✅ | - | 集合名称 |
| `vector_size` | number | ❌ | 1024 | 向量维度 |
| `distance` | string | ❌ | "Cosine" | 距离度量方式 |
| `on_disk` | boolean | ❌ | false | 是否存储在磁盘 |

### 向量维度选项

| 值 | 说明 | 适用场景 |
|----|------|----------|
| 384 | 小型模型 | 轻量级应用，资源受限 |
| 768 | BERT-base | 标准 BERT 模型 |
| 1024 | 推荐值 | 通用场景（默认） |
| 1536 | OpenAI ada-002 | OpenAI 嵌入模型 |
| 3072 | 大型模型 | 高精度要求 |

### 距离度量方式

| 值 | 说明 | 特点 |
|----|------|------|
| Cosine | 余弦相似度 | 推荐，适用于大多数场景 |
| Euclid | 欧几里得距离 | 适用于空间距离计算 |
| Dot | 点积 | 适用于归一化向量 |

### 存储模式

| 值 | 说明 | 优点 | 缺点 |
|----|------|------|------|
| false | 内存存储 | 速度快 | 内存占用大 |
| true | 磁盘存储 | 可扩展性好 | 速度较慢 |

## 代码更新

### API 函数

#### 方式 1: 使用函数参数

```typescript
import { createCollection } from '#src/api/document';

// 使用默认配置
await createCollection('my_collection');

// 自定义配置
await createCollection('my_collection', {
  description: 'My document collection',
  vector_size: 1536,
  distance: 'Cosine',
  on_disk: false,
});
```

#### 方式 2: 使用参数对象

```typescript
import { createCollectionWithParams } from '#src/api/document';

await createCollectionWithParams({
  collection_name: 'company',
  vector_size: 1024,
  distance: 'Cosine',
  on_disk: false,
});
```

### 类型定义

```typescript
interface CreateCollectionParams {
  collection_name: string
  vector_size?: number
  distance?: "Cosine" | "Euclid" | "Dot"
  on_disk?: boolean
}

interface CreateCollectionResponse {
  status: string
  message: string
  collection_name: string
  config: {
    vector_size: number
    distance_metric: string
  }
}
```

## UI 更新

创建集合的表单现在包含以下字段：

1. **集合名称** (必填)
   - 输入框

2. **描述** (可选)
   - 文本域

3. **向量维度** (可选，默认 1024)
   - 下拉选择：384 / 768 / 1024 / 1536 / 3072

4. **距离度量** (可选，默认 Cosine)
   - 下拉选择：Cosine / Euclidean / Dot Product

5. **存储模式** (可选，默认 In Memory)
   - 下拉选择：In Memory / On Disk

### 表单示例

```tsx
<Form
  form={form}
  layout="vertical"
  onFinish={handleCreateCollection}
  initialValues={{
    vector_size: 1024,
    distance: "Cosine",
    on_disk: false,
  }}
>
  <Form.Item name="name" label="Collection Name" required>
    <Input />
  </Form.Item>

  <Form.Item name="description" label="Description">
    <Input.TextArea rows={3} />
  </Form.Item>

  <Form.Item name="vector_size" label="Vector Size">
    <Select>
      <Select.Option value={384}>384 (Small models)</Select.Option>
      <Select.Option value={768}>768 (BERT-base)</Select.Option>
      <Select.Option value={1024}>1024 (Recommended)</Select.Option>
      <Select.Option value={1536}>1536 (OpenAI ada-002)</Select.Option>
      <Select.Option value={3072}>3072 (Large models)</Select.Option>
    </Select>
  </Form.Item>

  <Form.Item name="distance" label="Distance Metric">
    <Select>
      <Select.Option value="Cosine">Cosine (Recommended)</Select.Option>
      <Select.Option value="Euclid">Euclidean</Select.Option>
      <Select.Option value="Dot">Dot Product</Select.Option>
    </Select>
  </Form.Item>

  <Form.Item name="on_disk" label="Storage Mode">
    <Select>
      <Select.Option value={false}>In Memory (Faster)</Select.Option>
      <Select.Option value={true}>On Disk (More Scalable)</Select.Option>
    </Select>
  </Form.Item>
</Form>
```

## 响应示例

### 成功响应

```json
{
  "status": "success",
  "message": "Collection created successfully",
  "collection_name": "company",
  "config": {
    "vector_size": 1024,
    "distance_metric": "Cosine"
  }
}
```

### 错误响应

```json
{
  "status": "error",
  "message": "Collection already exists",
  "collection_name": "company"
}
```

## 兼容性说明

### 向后兼容

旧的调用方式仍然支持，但会使用默认值：

```typescript
// 旧方式（仍然有效）
await createCollection('my_collection', 'My description');

// 等同于新方式
await createCollection('my_collection', {
  description: 'My description',
  vector_size: 1024,      // 默认值
  distance: 'Cosine',     // 默认值
  on_disk: false,         // 默认值
});
```

### 迁移建议

如果你的代码使用了旧的 API，建议更新为新格式以获得更好的类型支持和配置灵活性：

**旧代码**:
```typescript
await createCollection('my_collection', 'My description');
```

**新代码**:
```typescript
await createCollection('my_collection', {
  description: 'My description',
  vector_size: 1024,
  distance: 'Cosine',
  on_disk: false,
});
```

## 测试建议

### 测试用例

1. **默认配置**
   ```typescript
   await createCollection('test_default');
   // 应使用: vector_size=1024, distance=Cosine, on_disk=false
   ```

2. **自定义配置**
   ```typescript
   await createCollection('test_custom', {
     vector_size: 1536,
     distance: 'Euclid',
     on_disk: true,
   });
   ```

3. **部分配置**
   ```typescript
   await createCollection('test_partial', {
     vector_size: 768,
     // 其他使用默认值
   });
   ```

### 验证步骤

1. 创建集合后，调用 `getCollectionInfo` 验证配置
2. 检查返回的 `config.vector_size` 和 `config.distance_metric`
3. 上传文档测试向量存储是否正常

## 常见问题

### Q1: 如何选择合适的 vector_size？

**A**: 取决于你使用的嵌入模型：
- 使用 OpenAI ada-002: 选择 1536
- 使用 BERT-base: 选择 768
- 使用 BGE-large: 选择 1024
- 不确定: 选择 1024（推荐默认值）

### Q2: Cosine 和 Euclid 有什么区别？

**A**: 
- **Cosine**: 计算向量夹角，适用于文本相似度（推荐）
- **Euclid**: 计算空间距离，适用于坐标数据
- **Dot**: 点积，适用于归一化向量

### Q3: 什么时候使用 on_disk=true？

**A**: 
- 数据量大（>100万向量）
- 内存资源有限
- 可以接受稍慢的查询速度
- 需要更好的可扩展性

### Q4: 创建后可以修改配置吗？

**A**: 不可以。向量维度和距离度量在创建后无法修改。如需更改，需要：
1. 创建新集合
2. 重新上传文档
3. 删除旧集合

## 更新文件清单

- ✅ `src/api/document/types.ts` - 更新类型定义
- ✅ `src/api/document/index.ts` - 更新 API 函数
- ✅ `src/pages/ai-assistant/documents/index.tsx` - 更新 UI 表单
- ✅ `docs/document-api-reference.md` - 更新 API 文档

## 总结

新的创建集合接口提供了更灵活的配置选项，允许用户根据实际需求调整向量数据库的行为。所有参数都有合理的默认值，确保向后兼容性的同时提供了更强大的功能。
