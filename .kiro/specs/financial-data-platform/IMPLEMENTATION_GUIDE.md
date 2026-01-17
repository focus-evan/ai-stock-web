# Financial Data Platform - Implementation Guide

## 📊 Project Status

### ✅ Completed (Tasks 1-3)

1. **Project Setup and Configuration**
   - ✅ Updated Vite proxy to `http://121.196.147.222:8000`
   - ✅ Increased API timeout to 30 seconds
   - ✅ Configured error handling interceptors

2. **API Service Layer** 
   - ✅ Created 6 API modules with 42 endpoints
   - ✅ All TypeScript types defined
   - ✅ Request/response interfaces ready

3. **Router Configuration**
   - ✅ Added route order constants
   - ✅ Created AI Assistant routes
   - ✅ Created Stock Data routes  
   - ✅ Updated System Management routes
   - ✅ Updated fake routes for dynamic menu

### 📋 Remaining Tasks (4-20)

## 🎯 Next Steps

### Task 4: Create Localization Files

Add translations to existing locale files:

**File: `src/locales/zh-CN/common.json`**
Add these keys:
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

**File: `src/locales/en-US/common.json`**
Add these keys:
```json
{
  "menu": {
    "aiAssistant": "AI Assistant",
    "qa": "Q&A",
    "documents": "Documents",
    "sessions": "Sessions",
    "stockData": "Stock Data",
    "stocks": "Stocks",
    "shareholders": "Shareholders",
    "dataSync": "Data Sync",
    "cache": "Cache",
    "monitor": "Monitor"
  }
}
```

Create new locale files for each module (see examples in existing `src/locales/*/ipo.json`).

### Task 5: Implement Dashboard Page

**File: `src/pages/dashboard/index.tsx`**

```typescript
import { Card, Col, Row, Statistic } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getStockStatistics } from "#src/api/stock";
import { fetchIPOStatistics } from "#src/api/ipo";
import { checkHealth } from "#src/api/system";

export default function Dashboard() {
  // Fetch statistics from multiple APIs
  const { data: stockStats } = useQuery({
    queryKey: ["stock-statistics"],
    queryFn: getStockStatistics,
  });

  const { data: ipoStats } = useQuery({
    queryKey: ["ipo-statistics"],
    queryFn: fetchIPOStatistics,
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
  });

  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Stocks"
              value={stockStats?.total_stocks}
              loading={!stockStats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total IPOs"
              value={ipoStats?.total_ipo}
              loading={!ipoStats}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="System Status"
              value={health?.status}
              valueStyle={{ color: health?.status === "healthy" ? "#3f8600" : "#cf1322" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
```

### Task 6-8: Implement AI Assistant Pages

#### 6.1 Q&A Page
**File: `src/pages/ai-assistant/qa/index.tsx`**

Key features:
- Chat interface with message list
- Input field with send button
- Online/offline mode toggle
- Streaming response support
- Source citations display
- Session management

Use `ragQuery` or `ragQueryStream` from `#src/api/rag`.

#### 6.2 Documents Page
**File: `src/pages/ai-assistant/documents/index.tsx`**

Key features:
- File upload with drag-and-drop (use Ant Design Upload component)
- Collection selector
- Document list with pagination
- Upload progress tracking

Use `uploadDocument`, `getAllCollections`, `getCollectionDocuments` from `#src/api/document`.

#### 6.3 Sessions Page
**File: `src/pages/ai-assistant/sessions/index.tsx`**

Key features:
- Session list table
- Clear session button
- Delete session button

Use `getSessionList`, `clearSessionMemory` from `#src/api/rag`.

### Task 9: Implement Stock Query Page

**File: `src/pages/stock-data/stocks/index.tsx`**

Key features:
- Search input for keyword search
- Filter controls (status, exchange, industry)
- Results table with pagination
- Stock detail modal

Use `searchStocks`, `getStockList`, `getStockInfo` from `#src/api/stock`.

### Task 10: IPO Data Page

**Already implemented at `src/pages/ipo/index.tsx`**

Just need to move it to `src/pages/stock-data/ipo/index.tsx` or update routes to point to existing location.

### Task 11: Implement Shareholders Page

**File: `src/pages/stock-data/shareholders/index.tsx`**

Key features:
- Company name search input
- Shareholder table
- Controlling shareholder highlight
- Refresh button

Use `queryShareholders`, `getControllingShareholder`, `refreshShareholderInfo` from `#src/api/shareholder`.

### Task 12: Implement Data Sync Page

**File: `src/pages/system/data-sync/index.tsx`**

Key features:
- Stock sync controls (buttons for different sync types)
- IPO crawl controls (buttons for different exchanges)
- Sync status display
- Progress indicators

Use functions from `#src/api/stock` and `#src/api/ipo`:
- `syncStocks`, `syncStocksAsync`
- `crawlAllIPO`, `crawlExchangeIPO`
- `crawlAkShareAll`, etc.

### Task 13: Implement Cache Management Page

**File: `src/pages/system/cache/index.tsx`**

Key features:
- Cache statistics display (cards with numbers)
- Clear cache buttons (by type)
- Cache hit rate visualization

Use `getCacheStats`, `clearCache` from `#src/api/system`.

### Task 14: Implement System Monitor Page

**File: `src/pages/system/monitor/index.tsx`**

Key features:
- Health check status (green/red indicator)
- Database connection status
- Auto-refresh every 30 seconds

Use `checkHealth`, `checkDatabaseHealth` from `#src/api/system`.

## 🛠️ Development Tips

### 1. Use React Query for Data Fetching

```typescript
import { useQuery, useMutation } from "@tanstack/react-query";

const { data, isLoading, error } = useQuery({
  queryKey: ["key"],
  queryFn: apiFunction,
});

const mutation = useMutation({
  mutationFn: apiFunction,
  onSuccess: () => {
    // Handle success
  },
});
```

### 2. Use Ant Design Pro Components

The project already uses `@ant-design/pro-components`. Use:
- `ProTable` for tables with built-in search/filter
- `ProForm` for forms
- `ProCard` for cards

### 3. Error Handling Pattern

```typescript
try {
  const result = await apiFunction();
  message.success("Operation successful");
} catch (error) {
  message.error(error.message || "Operation failed");
}
```

### 4. Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  try {
    await apiFunction();
  } finally {
    setLoading(false);
  }
};
```

## 📁 File Structure Reference

```
src/
├── api/                      ✅ All API modules ready
│   ├── common/types.ts
│   ├── rag/
│   ├── document/
│   ├── stock/
│   ├── shareholder/
│   ├── system/
│   └── ipo/
├── pages/
│   ├── dashboard/           ⏳ To implement
│   ├── ai-assistant/        ⏳ To implement
│   │   ├── qa/
│   │   ├── documents/
│   │   └── sessions/
│   ├── stock-data/          ⏳ To implement
│   │   ├── stocks/
│   │   ├── ipo/            ✅ Already exists
│   │   └── shareholders/
│   └── system/
│       ├── data-sync/       ⏳ To implement
│       ├── cache/           ⏳ To implement
│       └── monitor/         ⏳ To implement
├── router/
│   └── routes/modules/      ✅ All routes configured
│       ├── ai-assistant.ts
│       ├── stock-data.ts
│       └── system.ts
└── locales/                 ⏳ Need to add translations
    ├── zh-CN/
    └── en-US/
```

## 🚀 Quick Start Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📝 Testing Checklist

After implementing each page:
- [ ] Page renders without errors
- [ ] API calls work correctly
- [ ] Loading states display
- [ ] Error messages show appropriately
- [ ] Pagination works (if applicable)
- [ ] Filters apply correctly (if applicable)
- [ ] Responsive design works
- [ ] Language switching works

## 🔗 API Endpoints Reference

All endpoints are documented in the original API documentation. Base URL is configured in Vite proxy.

### Quick Reference:
- RAG: `/agent/rag`, `/agent/rag/stream`
- Documents: `/agent/upload`, `/api/collections`
- Stocks: `/lixingren/stocks`, `/lixingren/search`
- IPO: `/lixingren/ipo/query`, `/lixingren/crawl/*`
- Shareholders: `/shareholder/query`, `/shareholder/controlling`
- System: `/health`, `/agent/cache/*`, `/agent/sessions`

## 💡 Implementation Priority

Recommended order:
1. ✅ Dashboard (Task 5) - Shows overall system status
2. Stock Query (Task 9) - Most commonly used
3. IPO Data (Task 10) - Already mostly done
4. Shareholders (Task 11) - Related to stocks
5. AI Q&A (Task 6) - Core AI feature
6. Documents (Task 7) - Supports AI Q&A
7. Sessions (Task 8) - AI management
8. Data Sync (Task 12) - Admin feature
9. Cache (Task 13) - Admin feature
10. Monitor (Task 14) - Admin feature

## 🎨 Design Guidelines

- Use consistent spacing (padding: 24px for pages)
- Use Ant Design color palette
- Keep tables clean with alternating row colors
- Use icons from `@ant-design/icons`
- Maintain consistent button styles
- Use cards for grouping related content

## 📞 Need Help?

Refer to:
- Existing IPO page implementation: `src/pages/ipo/index.tsx`
- Ant Design Pro documentation
- React Query documentation
- Existing system pages for patterns

---

**Good luck with the implementation! The foundation is solid and ready for you to build upon.** 🚀
