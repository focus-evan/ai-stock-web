# Quick Reference - Financial Data Platform

## 🎯 What's Done

### ✅ Infrastructure (100% Complete)
- API Service Layer: 6 modules, 42 endpoints
- Router Configuration: 3 new route modules
- Type Definitions: All TypeScript interfaces
- Proxy Configuration: Points to http://121.196.147.222:8000

### ✅ API Modules Ready to Use

```typescript
// RAG - Intelligent Q&A
import { ragQuery, ragQueryStream, getSessionList, clearSessionMemory } from "#src/api/rag";

// Documents
import { uploadDocument, getAllCollections, getCollectionDocuments, createCollection } from "#src/api/document";

// Stocks
import { searchStocks, getStockList, getStockInfo, syncStocks, getStockStatistics } from "#src/api/stock";

// IPO
import { fetchIPOList, fetchIPOStatistics, crawlAllIPO, crawlExchangeIPO } from "#src/api/ipo";

// Shareholders
import { queryShareholders, getControllingShareholder, refreshShareholderInfo } from "#src/api/shareholder";

// System
import { checkHealth, getCacheStats, clearCache, getAllSessions } from "#src/api/system";
```

## 📋 What's Next

### Pages to Implement (17 tasks remaining)

| Priority | Page | File Path | Key APIs |
|----------|------|-----------|----------|
| 🔥 High | Dashboard | `src/pages/dashboard/index.tsx` | `getStockStatistics`, `fetchIPOStatistics`, `checkHealth` |
| 🔥 High | Stock Query | `src/pages/stock-data/stocks/index.tsx` | `searchStocks`, `getStockList` |
| 🔥 High | Shareholders | `src/pages/stock-data/shareholders/index.tsx` | `queryShareholders`, `getControllingShareholder` |
| 🟡 Medium | AI Q&A | `src/pages/ai-assistant/qa/index.tsx` | `ragQuery`, `ragQueryStream` |
| 🟡 Medium | Documents | `src/pages/ai-assistant/documents/index.tsx` | `uploadDocument`, `getAllCollections` |
| 🟡 Medium | Sessions | `src/pages/ai-assistant/sessions/index.tsx` | `getSessionList`, `clearSessionMemory` |
| 🟢 Low | Data Sync | `src/pages/system/data-sync/index.tsx` | `syncStocks`, `crawlAllIPO` |
| 🟢 Low | Cache | `src/pages/system/cache/index.tsx` | `getCacheStats`, `clearCache` |
| 🟢 Low | Monitor | `src/pages/system/monitor/index.tsx` | `checkHealth`, `checkDatabaseHealth` |

## 🚀 Quick Start Template

### Basic Page Template

```typescript
import { useQuery } from "@tanstack/react-query";
import { BasicContent } from "#src/components/basic-content";
import { BasicTable } from "#src/components/basic-table";
import { useTranslation } from "react-i18next";
import { apiFunction } from "#src/api/module";

export default function PageName() {
  const { t } = useTranslation();
  
  const { data, isLoading } = useQuery({
    queryKey: ["key"],
    queryFn: apiFunction,
  });

  return (
    <BasicContent>
      {/* Your content here */}
    </BasicContent>
  );
}
```

### Table Page Template

```typescript
import type { ProColumns } from "@ant-design/pro-components";
import { BasicContent } from "#src/components/basic-content";
import { BasicTable } from "#src/components/basic-table";
import { useTranslation } from "react-i18next";
import { apiFunction } from "#src/api/module";

export default function TablePage() {
  const { t } = useTranslation();

  const columns: ProColumns<DataType>[] = [
    {
      title: t("field.name"),
      dataIndex: "name",
      key: "name",
    },
    // More columns...
  ];

  return (
    <BasicContent>
      <BasicTable
        columns={columns}
        request={async (params) => {
          const data = await apiFunction(params);
          return {
            data: data.data,
            total: data.total,
            success: true,
          };
        }}
      />
    </BasicContent>
  );
}
```

## 📦 Available Components

From existing codebase:
- `BasicContent` - Page wrapper
- `BasicTable` - Table with ProTable features
- `BasicButton` - Styled button
- All Ant Design components
- All Ant Design Pro components

## 🎨 Menu Structure

```
📊 首页 (Home) - order: 1
🤖 智能助手 (AI Assistant) - order: 3
   ├─ 智能问答 (Q&A)
   ├─ 文档管理 (Documents)
   └─ 会话管理 (Sessions)
📈 股票数据 (Stock Data) - order: 6
   ├─ 股票查询 (Stocks)
   ├─ IPO数据 (IPO)
   └─ 股东信息 (Shareholders)
🔧 系统管理 (System) - order: 100
   ├─ 用户管理 (User)
   ├─ 角色管理 (Role)
   ├─ 菜单管理 (Menu)
   ├─ 部门管理 (Dept)
   ├─ 数据同步 (Data Sync) ⭐ NEW
   ├─ 缓存管理 (Cache) ⭐ NEW
   └─ 系统监控 (Monitor) ⭐ NEW
```

## 🔧 Common Patterns

### 1. Fetch Data with React Query
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ["stocks", filters],
  queryFn: () => getStockList(filters),
});
```

### 2. Mutation (POST/PUT/DELETE)
```typescript
const mutation = useMutation({
  mutationFn: syncStocks,
  onSuccess: () => {
    message.success("Sync completed");
    queryClient.invalidateQueries(["stocks"]);
  },
  onError: (error) => {
    message.error(error.message);
  },
});
```

### 3. Handle Loading
```typescript
if (isLoading) return <Spin />;
if (error) return <Alert message="Error" type="error" />;
```

### 4. Pagination
```typescript
const [pagination, setPagination] = useState({ page: 1, page_size: 20 });

// In request
const data = await apiFunction({
  ...filters,
  ...pagination,
});
```

## 📝 Localization Keys to Add

### common.json
```json
{
  "menu": {
    "aiAssistant": "智能助手",
    "qa": "智能问答",
    "documents": "文档管理",
    "sessions": "会话管理",
    "stockData": "股票数据",
    "stocks": "股票查询",
    "shareholders": "股东信息",
    "dataSync": "数据同步",
    "cache": "缓存管理",
    "monitor": "系统监控"
  }
}
```

Create separate files for each module:
- `ai.json` - AI Assistant translations
- `stock.json` - Stock Data translations  
- `system.json` - System Management translations (extend existing)

## 🐛 Debugging Tips

1. **API not working?**
   - Check Vite proxy in `vite.config.ts`
   - Verify API base URL: `http://121.196.147.222:8000`
   - Check browser Network tab

2. **Route not showing?**
   - Check `fake/async-routes.fake.ts`
   - Verify route order in `src/router/extra-info/order.ts`
   - Clear browser cache and refresh

3. **Type errors?**
   - All types are in `src/api/*/types.ts`
   - Import from module: `import type { Type } from "#src/api/module"`

## 📞 Next Session Prompt

When you start a new session, use this prompt:

```
I'm continuing the Financial Data Platform implementation. 
The spec is at .kiro/specs/financial-data-platform/

Current status:
- ✅ Tasks 1-3 completed (API layer, routes, config)
- ⏳ Need to implement Tasks 4-20 (pages and features)

Please help me implement [specific task/page name].
Refer to IMPLEMENTATION_GUIDE.md for details.
```

## 🎯 Success Criteria

Each page should:
- ✅ Render without errors
- ✅ Make correct API calls
- ✅ Show loading states
- ✅ Handle errors gracefully
- ✅ Support pagination (if applicable)
- ✅ Apply filters correctly (if applicable)
- ✅ Be responsive
- ✅ Support i18n

---

**You're 15% done! Keep going!** 💪
