# 文档明细查看功能

## 功能概述

在文档管理页面添加了查看文档明细的功能，用户可以点击"查看"按钮查看文档的完整信息和所有分块内容。

## 功能特性

### 1. 查看按钮

在文档列表的操作列中添加了"查看"按钮：

- 图标：👁️ (EyeOutlined)
- 位置：每行文档的操作列
- 功能：点击后打开文档详情抽屉

### 2. 文档详情抽屉

使用 Ant Design 的 Drawer 组件展示文档详情：

**基本信息卡片**:
- 文件名
- 文档 ID
- Collection 名称
- 分块数量
- 文件大小
- 文件类型
- 创建日期

**向量配置卡片** (新增):
- 向量维度 (vector_size)
- 距离度量 (distance)
- 嵌入模型 (embedding_model_hint)

**分块列表**:
- 分块编号（#1, #2, ...）
- 分块 ID（前 8 位）
- 分块文本内容
- 分页显示（每页 5 个）

## UI 设计

### 布局

```
┌─────────────────────────────────────────┐
│  Document Detail                    [×] │
├─────────────────────────────────────────┤
│  ┌─ Basic Information ──────────────┐  │
│  │ File Name: xxx.txt               │  │
│  │ Document ID: 3d1c3782...         │  │
│  │ Collection: company              │  │
│  │ Chunks: 18                       │  │
│  │ File Size: 36.02 KB              │  │
│  │ File Type: text/plain            │  │
│  │ Creation Date: 2026-01-18        │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─ Vector Configuration ───────────┐  │
│  │ Vector Size: 1024                │  │
│  │ Distance Metric: Cosine          │  │
│  │ Embedding Model: BAAI/bge-large-zh│ │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─ Chunks (18) ────────────────────┐  │
│  │ #1  ID: 0ba1ff84...              │  │
│  │ ┌────────────────────────────┐   │  │
│  │ │ 文档内容片段...             │   │  │
│  │ └────────────────────────────┘   │  │
│  │                                   │  │
│  │ #2  ID: 4aaa2ba8...              │  │
│  │ ┌────────────────────────────┐   │  │
│  │ │ 另一个文档内容片段...       │   │  │
│  │ └────────────────────────────┘   │  │
│  │                                   │  │
│  │ [1] 2 3 4 >                      │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 样式特点

1. **抽屉宽度**: 800px
2. **加载状态**: 显示 loading 动画
3. **分块内容**:
   - 背景色: #f5f5f5
   - 圆角: 4px
   - 内边距: 12px
   - 最大高度: 200px（超出滚动）
   - 保留换行和空格

4. **标签颜色**:
   - Collection: 蓝色
   - 分块数量: 绿色
   - 分块编号: 紫色
   - 向量维度: 紫色
   - 距离度量: 青色
   - 嵌入模型: 橙色

## 使用流程

### 用户操作

1. 进入文档管理页面
2. 选择一个 Collection
3. 在文档列表中找到目标文档
4. 点击"查看"按钮
5. 查看文档详情和分块内容
6. 关闭抽屉

### 数据流

```
用户点击"查看"
    ↓
设置 selectedDocId
    ↓
打开 Drawer (isDetailDrawerOpen = true)
    ↓
调用 fetchDocumentDetail(docId)
    ↓
请求 API: GET /api/agent/document/{docId}?collection_name={collection}
    ↓
显示 loading 状态
    ↓
接收响应数据
    ↓
渲染文档详情和分块列表
```

## 代码实现

### 状态管理

```typescript
const [selectedDocId, setSelectedDocId] = useState<string>("");
const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
```

### API 调用

```typescript
const {
  data: documentDetail,
  loading: detailLoading,
  run: fetchDocumentDetail,
} = useRequest(
  (docId: string) => getDocumentDetail(docId, selectedCollection),
  {
    manual: true,
    onError: (error) => {
      message.error("Failed to load document detail");
      console.error("Fetch detail error:", error);
    },
  }
);
```

### 事件处理

```typescript
const handleViewDetail = (docId: string) => {
  setSelectedDocId(docId);
  setIsDetailDrawerOpen(true);
  fetchDocumentDetail(docId);
};
```

### 表格列配置

```typescript
{
  title: "Action",
  key: "action",
  render: (_: any, record: any) => (
    <Space>
      <Button
        type="link"
        icon={<EyeOutlined />}
        onClick={() => handleViewDetail(record.doc_id)}
      >
        View
      </Button>
      <Popconfirm
        title="Are you sure to delete this document?"
        onConfirm={() => handleDelete(record.doc_id)}
      >
        <Button type="link" danger icon={<DeleteOutlined />}>
          Delete
        </Button>
      </Popconfirm>
    </Space>
  ),
}
```

## 组件结构

```tsx
<Drawer
  title="Document Detail"
  open={isDetailDrawerOpen}
  onClose={() => setIsDetailDrawerOpen(false)}
  width={800}
  loading={detailLoading}
>
  {documentDetail && (
    <Space direction="vertical" size="large">
      {/* Basic Information Card */}
      <Card title="Basic Information">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="File Name">
            {documentDetail.file_name}
          </Descriptions.Item>
          {/* ... more fields */}
        </Descriptions>
      </Card>

      {/* Chunks List Card */}
      <Card title="Chunks">
        <List
          dataSource={documentDetail.chunks}
          renderItem={(chunk, index) => (
            <List.Item>
              <List.Item.Meta
                title={`#${index + 1} ID: ${chunk.point_id}`}
                description={chunk.text}
              />
            </List.Item>
          )}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </Space>
  )}
</Drawer>
```

## 国际化支持

### 新增翻译键

需要在 `src/locales/*/ai.json` 中添加以下键：

```json
{
  "ai.documentDetail": "Document Detail",
  "ai.basicInfo": "Basic Information",
  "ai.collection": "Collection",
  "ai.fileSize": "File Size",
  "ai.fileType": "File Type",
  "ai.creationDate": "Creation Date",
  "ai.chunks": "Chunks",
  "ai.noContent": "No content",
  "ai.fetchDetailFailed": "Failed to load document detail",
  "ai.vectorConfig": "Vector Configuration",
  "ai.vectorSize": "Vector Size",
  "ai.distanceMetric": "Distance Metric",
  "ai.embeddingModel": "Embedding Model",
  "common.view": "View"
}
```

### 中文翻译

```json
{
  "ai.documentDetail": "文档详情",
  "ai.basicInfo": "基本信息",
  "ai.collection": "集合",
  "ai.fileSize": "文件大小",
  "ai.fileType": "文件类型",
  "ai.creationDate": "创建日期",
  "ai.chunks": "分块",
  "ai.noContent": "无内容",
  "ai.fetchDetailFailed": "加载文档详情失败",
  "ai.vectorConfig": "向量配置",
  "ai.vectorSize": "向量维度",
  "ai.distanceMetric": "距离度量",
  "ai.embeddingModel": "嵌入模型",
  "common.view": "查看"
}
```

## 错误处理

### 1. API 请求失败

```typescript
onError: (error) => {
  message.error("Failed to load document detail");
  console.error("Fetch detail error:", error);
}
```

### 2. 空内容处理

```typescript
{chunk.text ? (
  <div>{chunk.text}</div>
) : (
  <div style={{ color: "#999", fontStyle: "italic" }}>
    No content
  </div>
)}
```

### 3. 元数据缺失

```typescript
{documentDetail.chunks[0]?.metadata && (
  <>
    <Descriptions.Item label="File Size">
      {(documentDetail.chunks[0].metadata.file_size / 1024).toFixed(2)} KB
    </Descriptions.Item>
  </>
)}
```

## 性能优化

### 1. 分页加载

```typescript
<List
  pagination={{
    pageSize: 5,
    size: "small",
    showSizeChanger: true,
  }}
/>
```

### 2. 内容滚动

```typescript
style={{
  maxHeight: 200,
  overflow: "auto",
}}
```

### 3. 懒加载

使用 `manual: true` 只在用户点击时才加载数据：

```typescript
const { run: fetchDocumentDetail } = useRequest(
  (docId: string) => getDocumentDetail(docId, selectedCollection),
  { manual: true }
);
```

## 用户体验优化

### 1. 加载状态

- Drawer 显示 loading 属性
- 数据加载时显示加载动画

### 2. 空状态

- 无内容时显示提示文字
- 使用斜体和灰色样式

### 3. 长文本处理

- 文档 ID 显示前 20 位 + "..."
- 分块 ID 显示前 8 位 + "..."
- 分块内容最大高度 200px，超出滚动

### 4. 视觉反馈

- 使用不同颜色的 Tag 区分信息
- 分块内容使用浅灰色背景
- 保持良好的间距和对齐

## 测试建议

### 功能测试

1. **正常流程**
   - 点击查看按钮
   - 验证抽屉打开
   - 验证数据正确显示

2. **边界情况**
   - 文档无分块
   - 分块无内容
   - 元数据缺失

3. **错误情况**
   - API 请求失败
   - 网络超时
   - 无效的文档 ID

### 性能测试

1. **大文档**
   - 100+ 分块
   - 验证分页正常
   - 验证滚动流畅

2. **长文本**
   - 超长分块内容
   - 验证滚动条显示
   - 验证文本换行

## 未来改进

### 1. 导出功能

添加导出按钮，支持导出文档内容：

```typescript
const handleExport = () => {
  const fullText = documentDetail.chunks
    .map(chunk => chunk.text)
    .join('\n\n');
  
  const blob = new Blob([fullText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = documentDetail.file_name;
  a.click();
};
```

### 2. 搜索功能

在分块中搜索关键词：

```typescript
const [searchKeyword, setSearchKeyword] = useState('');

const filteredChunks = documentDetail.chunks.filter(chunk =>
  chunk.text.includes(searchKeyword)
);
```

### 3. 高亮显示

高亮显示搜索关键词：

```typescript
const highlightText = (text: string, keyword: string) => {
  if (!keyword) return text;
  const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      part
    )
  );
};
```

### 4. 复制功能

添加复制分块内容的按钮：

```typescript
const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text);
  message.success('Copied to clipboard');
};
```

## 总结

文档明细查看功能提供了：

- ✅ 直观的文档信息展示
- ✅ 完整的分块内容查看
- ✅ 良好的用户体验
- ✅ 完善的错误处理
- ✅ 性能优化（分页、滚动）

这个功能让用户可以方便地查看文档的详细内容，了解文档的分块情况，为后续的文档管理和分析提供了基础。
