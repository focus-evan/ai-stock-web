# Design Document

## Overview

The Financial Data Platform is a comprehensive React-based admin system that integrates with a FastAPI backend to provide intelligent Q&A, document management, stock data analysis, and system management capabilities. The platform follows a clean, professional design with a well-organized menu structure.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │ AI Assistant │  │  Stock Data  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  API Layer  │                          │
│                    └──────┬──────┘                          │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Backend API   │
                    │ 121.196.147.222│
                    └────────────────┘
```

### Menu Structure

```
📊 首页 (Home)
🤖 智能助手 (AI Assistant)
   ├─ 智能问答 (Q&A)
   ├─ 文档管理 (Documents)
   └─ 会话管理 (Sessions)
📈 股票数据 (Stock Data)
   ├─ 股票查询 (Stock Query)
   ├─ IPO数据 (IPO Data)
   └─ 股东信息 (Shareholders)
🔧 系统管理 (System)
   ├─ 数据同步 (Data Sync)
   ├─ 缓存管理 (Cache)
   └─ 系统监控 (Monitor)
```

## Components and Interfaces

### API Service Layer

**Base Configuration:**
- Base URL: `http://121.196.147.222:8000`
- Timeout: 30000ms (for long-running operations)
- Error handling: Centralized error interceptor

### Module 1: Dashboard

**File:** `src/pages/dashboard/index.tsx`

Displays overview statistics and quick access cards.

### Module 2: AI Assistant

#### 2.1 Q&A Page
**File:** `src/pages/ai-assistant/qa/index.tsx`

Features:
- Chat interface with message history
- Support for online/offline modes
- Streaming responses
- Source citations

#### 2.2 Document Management
**File:** `src/pages/ai-assistant/documents/index.tsx`

Features:
- File upload with drag-and-drop
- Collection management
- Document list with pagination
- Upload progress tracking

#### 2.3 Session Management
**File:** `src/pages/ai-assistant/sessions/index.tsx`

Features:
- Session list with activity timestamps
- Clear session memory
- Delete sessions

### Module 3: Stock Data

#### 3.1 Stock Query
**File:** `src/pages/stock-data/stocks/index.tsx`

Features:
- Search by keyword
- Filter by status, exchange, industry
- Detailed stock information modal
- Pagination

#### 3.2 IPO Data
**File:** `src/pages/stock-data/ipo/index.tsx`

Features:
- IPO records table
- Date range filtering
- Statistics dashboard
- Export functionality

#### 3.3 Shareholder Information
**File:** `src/pages/stock-data/shareholders/index.tsx`

Features:
- Company search
- Shareholder list
- Controlling shareholder highlight
- Refresh data

### Module 4: System Management

#### 4.1 Data Sync
**File:** `src/pages/system/sync/index.tsx`

Features:
- Stock sync controls
- IPO crawl triggers
- Sync status monitoring
- Task history

#### 4.2 Cache Management
**File:** `src/pages/system/cache/index.tsx`

Features:
- Cache statistics
- Clear cache by type
- Cache hit rate visualization

#### 4.3 System Monitor
**File:** `src/pages/system/monitor/index.tsx`

Features:
- Health check status
- Database connection status
- API response time metrics

## Data Models

### Common Types

```typescript
// API Response wrapper
interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  detail?: string;
}

// Pagination
interface PaginationParams {
  page: number;
  page_size: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
```

### RAG Module Types

```typescript
interface RAGQuery {
  query: string;
  session_id?: string;
  collection_name?: string;
  top_k?: number;
  similarity_threshold?: number;
}

interface RAGResponse {
  answer: string;
  sources: Source[];
  session_id: string;
  request_id: string;
  tool_calls?: any[];
  thinking_process?: string;
}

interface Source {
  content: string;
  metadata: {
    file_name: string;
    page?: number;
  };
  score: number;
}
```

### Stock Module Types

```typescript
interface StockInfo {
  stock_code: string;
  stock_name: string;
  listing_status: string;
  exchange: string;
  listing_date: string;
  industry?: string;
  company_name?: string;
  registered_capital?: string;
  legal_representative?: string;
  business_scope?: string;
}

interface ShareholderInfo {
  shareholder_name: string;
  shareholding_ratio: number;
  shareholding_number: number;
  shareholder_type: string;
  rank?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

Since this is primarily a UI integration project with external APIs, correctness properties focus on data handling and user interactions:

**Property 1: API Error Handling**
*For any* API request that fails, the system should display an appropriate error message and not crash

**Property 2: Data Consistency**
*For any* paginated data fetch, the total count should remain consistent across page navigations within the same filter context

**Property 3: Session Persistence**
*For any* RAG conversation, messages should persist within the session until explicitly cleared

**Property 4: Filter Application**
*For any* combination of filters applied, the API request should include all active filter parameters

**Property 5: Upload Progress**
*For any* file upload operation, progress should monotonically increase from 0% to 100%

## Error Handling

### HTTP Status Code Mapping

- 200: Success - Show success message
- 400: Bad Request - Show validation errors
- 401: Unauthorized - Redirect to login
- 404: Not Found - Show "Resource not found"
- 500: Server Error - Show "Server error, please try again"
- 503: Service Unavailable - Show "Service temporarily unavailable"

### Error Display Strategy

1. **Toast Notifications**: For transient errors
2. **Inline Messages**: For form validation errors
3. **Error Boundaries**: For component-level errors
4. **Retry Mechanisms**: For network errors

## Testing Strategy

### Unit Testing

Focus on:
- API service functions
- Data transformation utilities
- Form validation logic
- Error handling functions

### Integration Testing

Focus on:
- API integration flows
- Multi-step user workflows
- Session management
- File upload processes

### Manual Testing Checklist

- [ ] All menu items navigate correctly
- [ ] All API endpoints return expected data
- [ ] Error messages display appropriately
- [ ] Loading states show during API calls
- [ ] Pagination works correctly
- [ ] Filters apply correctly
- [ ] File uploads complete successfully
- [ ] Session management works
- [ ] Language switching works
- [ ] Responsive design adapts to screen sizes

## Performance Considerations

1. **Code Splitting**: Lazy load route components
2. **API Caching**: Cache static data (collections, statistics)
3. **Debouncing**: Debounce search inputs (300ms)
4. **Virtual Scrolling**: For large data tables
5. **Image Optimization**: Compress and lazy load images
6. **Bundle Size**: Keep initial bundle < 500KB

## Security Considerations

1. **API Authentication**: Include auth tokens in requests
2. **Input Validation**: Validate all user inputs
3. **XSS Prevention**: Sanitize displayed content
4. **HTTPS**: Use HTTPS for all API calls
5. **Sensitive Data**: Don't log sensitive information

## Internationalization

### Supported Languages

- Chinese (zh-CN) - Primary
- English (en-US) - Secondary

### Translation Keys Structure

```
common.* - Common UI elements
dashboard.* - Dashboard specific
ai.* - AI Assistant module
stock.* - Stock Data module
system.* - System Management module
errors.* - Error messages
```

## Future Enhancements

1. Real-time data updates via WebSocket
2. Advanced data visualization charts
3. Export to Excel/PDF
4. Batch operations
5. User preferences and customization
6. Mobile app version
7. Advanced search with filters
8. Data comparison tools

