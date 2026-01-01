# Design Document

## Overview

The IPO Data Management feature will add a new section to the admin system that allows users to view, filter, and analyze Initial Public Offering (IPO) data. The feature integrates with an existing FastAPI backend that provides comprehensive IPO information including company details, listing status, IPO dates, and exchange information.

The implementation follows the existing architectural patterns in the codebase, utilizing React with TypeScript, Ant Design Pro components, React Query for data management, and the established routing structure. The feature will be accessible through a new menu item and will provide a table-based interface with advanced filtering capabilities.

## Architecture

### Component Hierarchy

```
IPO Route Module
├── IPO Page Component
│   ├── BasicContent (Layout wrapper)
│   ├── BasicTable (Data table)
│   │   ├── Filter Controls (ProTable search)
│   │   ├── Table Columns
│   │   └── Pagination Controls
│   └── API Integration Layer
│       ├── React Query hooks
│       └── API service functions
```

### Data Flow

1. **User Interaction → Filter State**: User interacts with filter controls, updating local filter state
2. **Filter State → API Request**: Filter state changes trigger React Query to fetch data with new parameters
3. **API Request → Backend**: Request is sent to FastAPI backend with filter parameters
4. **Backend → API Response**: Backend returns paginated IPO data with total count
5. **API Response → Table Rendering**: Data is transformed and rendered in the table component

### Integration Points

- **Router**: New route module registered in the system routes
- **API Layer**: New API service module for IPO endpoints
- **Localization**: New translation keys for IPO-related text
- **Navigation**: New menu item in the system navigation structure

## Components and Interfaces

### 1. Route Configuration

**File**: `src/router/routes/modules/ipo.ts`

```typescript
import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { lazy } from "react";

const IPO = lazy(() => import("#src/pages/ipo"));

const routes: AppRouteRecordRaw[] = [
  {
    path: "/ipo",
    Component: ContainerLayout,
    handle: {
      icon: "StockOutlined",
      title: "common.menu.ipo",
      order: 5,
      roles: ["admin", "user"],
    },
    children: [
      {
        path: "/ipo/list",
        Component: IPO,
        handle: {
          icon: "UnorderedListOutlined",
          title: "common.menu.ipoList",
          roles: ["admin", "user"],
        },
      },
    ],
  },
];

export default routes;
```

### 2. API Service Layer

**File**: `src/api/ipo/index.ts`

```typescript
import { request } from "#src/utils/request";
import type { IPOQueryParams, IPOListResponse, IPOStatisticsResponse } from "./types";

export * from "./types";

/* Query IPO data with filters */
export function fetchIPOList(params: IPOQueryParams) {
  return request
    .get<IPOListResponse>("api/lixingren/ipo/query", {
      searchParams: params,
      ignoreLoading: false,
    })
    .json();
}

/* Get IPO statistics */
export function fetchIPOStatistics() {
  return request
    .get<IPOStatisticsResponse>("api/lixingren/ipo/statistics", {
      ignoreLoading: true,
    })
    .json();
}
```

**File**: `src/api/ipo/types.ts`

```typescript
export interface IPORecord {
  id: number;
  stock_code: string;
  name: string;
  market: string;
  exchange: string;
  listing_status: ListingStatus;
  ipo_date: string;
  source: string;
  created_at?: string;
  updated_at?: string;
}

export type ListingStatus =
  | "accepted"
  | "in_review"
  | "approved"
  | "unauthorized"
  | "ipo_suspension"
  | "issued_but_not_listed"
  | "normally_listed";

export interface IPOQueryParams {
  listing_status?: ListingStatus;
  start_date?: string;
  end_date?: string;
  exchange?: string;
  market?: string;
  page?: number;
  page_size?: number;
}

export interface IPOListResponse {
  total: number;
  data: IPORecord[];
  page: number;
  page_size: number;
  filters: Partial<IPOQueryParams>;
}

export interface IPOStatisticsResponse {
  total: number;
  by_source: Record<string, number>;
  by_status: Record<string, number>;
  by_market: Record<string, number>;
  by_exchange: Record<string, number>;
}
```

### 3. IPO Page Component

**File**: `src/pages/ipo/index.tsx`

```typescript
import type { ActionType, ProColumns } from "@ant-design/pro-components";
import type { IPORecord, IPOQueryParams } from "#src/api/ipo";

import { fetchIPOList } from "#src/api/ipo";
import { BasicContent } from "#src/components/basic-content";
import { BasicTable } from "#src/components/basic-table";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export default function IPO() {
  const { t } = useTranslation();
  const actionRef = useRef<ActionType>(null);
  const [filters, setFilters] = useState<IPOQueryParams>({});

  const columns: ProColumns<IPORecord>[] = [
    {
      title: t("ipo.stockCode"),
      dataIndex: "stock_code",
      key: "stock_code",
      width: 120,
      fixed: "left",
    },
    {
      title: t("ipo.companyName"),
      dataIndex: "name",
      key: "name",
      width: 250,
      ellipsis: true,
    },
    {
      title: t("ipo.market"),
      dataIndex: "market",
      key: "market",
      width: 100,
      valueType: "select",
      valueEnum: {
        "A股": { text: "A股" },
        "港股": { text: "港股" },
      },
    },
    {
      title: t("ipo.exchange"),
      dataIndex: "exchange",
      key: "exchange",
      width: 120,
      valueType: "select",
      valueEnum: {
        "上交所": { text: "上交所" },
        "深交所": { text: "深交所" },
        "北交所": { text: "北交所" },
        "香港交易所": { text: "香港交易所" },
      },
    },
    {
      title: t("ipo.listingStatus"),
      dataIndex: "listing_status",
      key: "listing_status",
      width: 150,
      valueType: "select",
      valueEnum: {
        accepted: { text: t("ipo.status.accepted"), status: "Default" },
        in_review: { text: t("ipo.status.inReview"), status: "Processing" },
        approved: { text: t("ipo.status.approved"), status: "Success" },
        unauthorized: { text: t("ipo.status.unauthorized"), status: "Error" },
        ipo_suspension: { text: t("ipo.status.ipoSuspension"), status: "Warning" },
        issued_but_not_listed: { text: t("ipo.status.issuedButNotListed"), status: "Default" },
        normally_listed: { text: t("ipo.status.normallyListed"), status: "Success" },
      },
    },
    {
      title: t("ipo.ipoDate"),
      dataIndex: "ipo_date",
      key: "ipo_date",
      width: 120,
      valueType: "date",
      sorter: true,
    },
  ];

  return (
    <BasicContent className="h-full">
      <BasicTable<IPORecord>
        adaptive
        columns={columns}
        actionRef={actionRef}
        request={async (params, sort, filter) => {
          const queryParams: IPOQueryParams = {
            page: params.current || 1,
            page_size: params.pageSize || 20,
            listing_status: filter.listing_status?.[0] as any,
            market: filter.market?.[0] as string,
            exchange: filter.exchange?.[0] as string,
          };

          const responseData = await fetchIPOList(queryParams);
          
          return {
            data: responseData.data,
            total: responseData.total,
            success: true,
          };
        }}
        headerTitle={t("ipo.title")}
        search={{
          labelWidth: "auto",
        }}
      />
    </BasicContent>
  );
}
```

### 4. Constants and Utilities

**File**: `src/pages/ipo/constants.tsx`

```typescript
import type { ProColumns } from "@ant-design/pro-components";
import type { IPORecord } from "#src/api/ipo";
import type { TFunction } from "i18next";
import { Tag } from "antd";

export function getIPOColumns(t: TFunction): ProColumns<IPORecord>[] {
  return [
    {
      title: t("ipo.stockCode"),
      dataIndex: "stock_code",
      key: "stock_code",
      width: 120,
      fixed: "left",
      copyable: true,
    },
    {
      title: t("ipo.companyName"),
      dataIndex: "name",
      key: "name",
      width: 250,
      ellipsis: true,
      search: false,
    },
    {
      title: t("ipo.market"),
      dataIndex: "market",
      key: "market",
      width: 100,
      filters: true,
      valueType: "select",
      valueEnum: {
        "A股": { text: "A股" },
        "港股": { text: "港股" },
      },
    },
    {
      title: t("ipo.exchange"),
      dataIndex: "exchange",
      key: "exchange",
      width: 120,
      filters: true,
      valueType: "select",
      valueEnum: {
        "上交所": { text: t("ipo.exchanges.shanghai") },
        "深交所": { text: t("ipo.exchanges.shenzhen") },
        "北交所": { text: t("ipo.exchanges.beijing") },
        "香港交易所": { text: t("ipo.exchanges.hongkong") },
      },
    },
    {
      title: t("ipo.listingStatus"),
      dataIndex: "listing_status",
      key: "listing_status",
      width: 150,
      filters: true,
      valueType: "select",
      render: (_, record) => {
        const statusConfig = getStatusConfig(record.listing_status, t);
        return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>;
      },
      valueEnum: {
        accepted: { text: t("ipo.status.accepted") },
        in_review: { text: t("ipo.status.inReview") },
        approved: { text: t("ipo.status.approved") },
        unauthorized: { text: t("ipo.status.unauthorized") },
        ipo_suspension: { text: t("ipo.status.ipoSuspension") },
        issued_but_not_listed: { text: t("ipo.status.issuedButNotListed") },
        normally_listed: { text: t("ipo.status.normallyListed") },
      },
    },
    {
      title: t("ipo.ipoDate"),
      dataIndex: "ipo_date",
      key: "ipo_date",
      width: 120,
      valueType: "dateRange",
      search: {
        transform: (value) => ({
          start_date: value[0],
          end_date: value[1],
        }),
      },
    },
  ];
}

function getStatusConfig(status: string, t: TFunction) {
  const configs = {
    accepted: { color: "default", text: t("ipo.status.accepted") },
    in_review: { color: "processing", text: t("ipo.status.inReview") },
    approved: { color: "success", text: t("ipo.status.approved") },
    unauthorized: { color: "error", text: t("ipo.status.unauthorized") },
    ipo_suspension: { color: "warning", text: t("ipo.status.ipoSuspension") },
    issued_but_not_listed: { color: "default", text: t("ipo.status.issuedButNotListed") },
    normally_listed: { color: "success", text: t("ipo.status.normallyListed") },
  };
  return configs[status] || { color: "default", text: status };
}
```

## Data Models

### IPO Record Model

The core data model represents a single IPO record:

```typescript
interface IPORecord {
  id: number;                    // Unique identifier
  stock_code: string;            // Stock ticker symbol
  name: string;                  // Company name
  market: string;                // Market type (A股, 港股)
  exchange: string;              // Exchange name
  listing_status: ListingStatus; // Current listing status
  ipo_date: string;              // IPO date (YYYY-MM-DD)
  source: string;                // Data source identifier
  created_at?: string;           // Record creation timestamp
  updated_at?: string;           // Record update timestamp
}
```

### Query Parameters Model

Filter and pagination parameters for API requests:

```typescript
interface IPOQueryParams {
  listing_status?: ListingStatus; // Filter by listing status
  start_date?: string;            // Filter by IPO date >= start_date
  end_date?: string;              // Filter by IPO date <= end_date
  exchange?: string;              // Filter by exchange
  market?: string;                // Filter by market
  page?: number;                  // Page number (1-indexed)
  page_size?: number;             // Records per page
}
```

### Response Models

API response structure for list queries:

```typescript
interface IPOListResponse {
  total: number;                  // Total records matching filters
  data: IPORecord[];              // Array of IPO records for current page
  page: number;                   // Current page number
  page_size: number;              // Records per page
  filters: Partial<IPOQueryParams>; // Applied filters
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all testable properties from the prework analysis, several redundancies were identified:

1. **Filter parameter properties (3.2, 4.2, 4.3, 5.2, 5.3)** can be consolidated into a single comprehensive property about filter parameter transmission
2. **Filter result properties (3.3, 5.4)** are subsumed by the combined filter property (6.2) which tests that ALL filters work correctly
3. **Count update properties (7.2, 7.3)** are covered by the general count display property (7.1) since count correctness implies it updates properly
4. **Date formatting properties (4.2, 4.3)** can be combined into one property about date parameter formatting

The following properties provide unique validation value and will be implemented:

### Core Filtering and Data Display Properties

**Property 1: Column completeness**
*For any* set of IPO records returned by the API, the rendered table should display all required columns: stock_code, name, market, exchange, listing_status, and ipo_date
**Validates: Requirements 2.2**

**Property 2: Descending date sort**
*For any* set of IPO records displayed in the table, each record's ipo_date should be greater than or equal to the next record's ipo_date (descending order)
**Validates: Requirements 2.5**

**Property 3: Pagination offset calculation**
*For any* page number change, the API request should include the correct offset calculated as (page - 1) * page_size
**Validates: Requirements 2.4**

**Property 4: Filter parameter transmission**
*For any* filter value selected (listing_status, exchange, market, or date range), the API request should include that filter as the correctly named parameter
**Validates: Requirements 3.2, 4.2, 4.3, 5.2, 5.3**

**Property 5: Combined filter conjunction**
*For any* combination of active filters, all displayed IPO records should match ALL specified filter criteria (AND logic)
**Validates: Requirements 6.2**

**Property 6: Pagination reset on filter change**
*For any* filter modification, the pagination should reset to page 1 before fetching new results
**Validates: Requirements 6.3**

**Property 7: Total count accuracy**
*For any* filter state, the displayed total count should exactly match the total value returned in the API response
**Validates: Requirements 7.1**

### Error Handling and Performance Properties

**Property 8: Error message display**
*For any* API error response, the system should display an error message using the global message component
**Validates: Requirements 8.5**

**Property 9: Debounce effectiveness**
*For any* sequence of rapid filter changes (within debounce window), the number of API calls should be less than the number of filter changes
**Validates: Requirements 9.2**

**Property 10: Loading state visibility**
*For any* data fetch operation in progress, the table should display a loading indicator
**Validates: Requirements 9.3**

**Property 11: Error recovery**
*For any* failed data fetch, the system should provide a retry mechanism that re-attempts the same request
**Validates: Requirements 9.4**

**Property 12: Cache reuse**
*For any* identical query executed twice within the cache window, the second execution should not trigger a new API call
**Validates: Requirements 9.5**

**Property 13: Response type validation**
*For any* API response received, the response structure should conform to the IPOListResponse type definition (contains total, data array, page, page_size, filters)
**Validates: Requirements 10.3**

## Error Handling

### API Error Scenarios

1. **Network Errors**
   - Display user-friendly error message: "无法连接到服务器，请检查网络连接"
   - Provide retry button
   - Log error details to console for debugging

2. **Server Errors (5xx)**
   - Display message: "服务器错误，请稍后重试"
   - Automatically retry once after 2 seconds
   - If retry fails, show manual retry option

3. **Client Errors (4xx)**
   - 400 Bad Request: Display "请求参数错误" and log parameter details
   - 401 Unauthorized: Redirect to login page
   - 403 Forbidden: Display "您没有权限访问此数据"
   - 404 Not Found: Display "请求的资源不存在"

4. **Timeout Errors**
   - Display message: "请求超时，请重试"
   - Provide retry button
   - Consider increasing timeout for large datasets

### Data Validation Errors

1. **Invalid Date Format**
   - Validate date inputs match YYYY-MM-DD format
   - Display inline error message on date picker
   - Prevent API call until valid date is entered

2. **Invalid Filter Values**
   - Validate filter values against allowed enums
   - Disable invalid options in dropdowns
   - Clear invalid filters before API call

3. **Empty Response**
   - Display "暂无数据" message in table
   - Show filter summary to help user understand why no results
   - Suggest clearing filters

### Component Error Boundaries

1. **Table Rendering Errors**
   - Wrap table component in Error Boundary
   - Display fallback UI: "表格加载失败"
   - Provide "刷新页面" button

2. **Filter Component Errors**
   - Isolate filter errors to prevent full page crash
   - Log error and display simplified filter UI
   - Allow basic functionality to continue

## Testing Strategy

### Unit Testing

The IPO feature will use **Vitest** and **React Testing Library** for unit testing, following the patterns established in the existing codebase.

**Test Coverage Areas:**

1. **Component Rendering Tests**
   - Verify IPO page renders without crashing
   - Check that BasicContent and BasicTable components are present
   - Verify all table columns are rendered correctly
   - Test filter controls are displayed

2. **API Integration Tests**
   - Mock API responses and verify correct data display
   - Test error handling with mocked error responses
   - Verify loading states during API calls
   - Test retry functionality after errors

3. **Filter Logic Tests**
   - Test individual filter applications
   - Test filter combinations
   - Test filter clearing
   - Test pagination reset on filter change

4. **Edge Cases**
   - Empty dataset response
   - Single record response
   - Maximum page size
   - Invalid date ranges (end before start)
   - Special characters in company names

**Example Unit Test Structure:**

```typescript
describe('IPO Page', () => {
  it('should render table with correct columns', () => {
    // Test implementation
  });

  it('should fetch data on mount', async () => {
    // Test implementation
  });

  it('should apply filters and reset pagination', async () => {
    // Test implementation
  });

  it('should handle API errors gracefully', async () => {
    // Test implementation
  });
});
```

### Property-Based Testing

The IPO feature will use **fast-check** for property-based testing to verify universal properties across many randomly generated inputs.

**Configuration:**
- Minimum 100 iterations per property test
- Use custom generators for IPO-specific data types
- Tag each test with the property number from this design document

**Property Test Implementation Requirements:**

1. Each property-based test MUST be tagged with a comment in this format:
   ```typescript
   // Feature: ipo-data-management, Property 1: Column completeness
   ```

2. Each correctness property MUST be implemented by a SINGLE property-based test

3. Property tests should be placed close to implementation to catch errors early

**Test File Structure:**

```typescript
// src/pages/ipo/__tests__/ipo.property.test.ts

import fc from 'fast-check';
import { render } from '@testing-library/react';

// Feature: ipo-data-management, Property 1: Column completeness
describe('Property 1: Column completeness', () => {
  it('should display all required columns for any IPO record set', () => {
    fc.assert(
      fc.property(
        fc.array(ipoRecordArbitrary),
        (records) => {
          // Test that all columns are present
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ipo-data-management, Property 2: Descending date sort
describe('Property 2: Descending date sort', () => {
  it('should sort records by ipo_date in descending order', () => {
    fc.assert(
      fc.property(
        fc.array(ipoRecordArbitrary, { minLength: 2 }),
        (records) => {
          // Test sorting order
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Additional property tests...
```

**Custom Generators:**

```typescript
// Arbitrary generators for IPO data types
const listingStatusArbitrary = fc.constantFrom(
  'accepted',
  'in_review',
  'approved',
  'unauthorized',
  'ipo_suspension',
  'issued_but_not_listed',
  'normally_listed'
);

const exchangeArbitrary = fc.constantFrom(
  '上交所',
  '深交所',
  '北交所',
  '香港交易所'
);

const marketArbitrary = fc.constantFrom('A股', '港股');

const ipoRecordArbitrary = fc.record({
  id: fc.integer({ min: 1 }),
  stock_code: fc.string({ minLength: 3, maxLength: 10 }),
  name: fc.string({ minLength: 5, maxLength: 50 }),
  market: marketArbitrary,
  exchange: exchangeArbitrary,
  listing_status: listingStatusArbitrary,
  ipo_date: fc.date().map(d => d.toISOString().split('T')[0]),
  source: fc.constant('akshare_a_share'),
});
```

### Integration Testing

1. **End-to-End Filter Flow**
   - Test complete user journey from page load to filtered results
   - Verify filter combinations work correctly
   - Test pagination with filters applied

2. **API Integration**
   - Test against mock API server
   - Verify request parameters are correctly formatted
   - Test response parsing and error handling

3. **Performance Testing**
   - Test with large datasets (1000+ records)
   - Verify pagination performance
   - Test filter debouncing effectiveness

### Test Execution Strategy

1. **Development**: Run unit tests on file save
2. **Pre-commit**: Run all unit tests and fast property tests
3. **CI/CD**: Run full test suite including integration tests
4. **Property tests**: Run with 100 iterations minimum

## Localization

### Translation Keys

**File**: `src/locales/zh-CN/ipo.json`

```json
{
  "title": "IPO数据",
  "stockCode": "股票代码",
  "companyName": "公司名称",
  "market": "市场",
  "exchange": "交易所",
  "listingStatus": "上市状态",
  "ipoDate": "IPO日期",
  "exchanges": {
    "shanghai": "上交所",
    "shenzhen": "深交所",
    "beijing": "北交所",
    "hongkong": "香港交易所"
  },
  "status": {
    "accepted": "已受理",
    "inReview": "审核中",
    "approved": "已过会",
    "unauthorized": "未过会",
    "ipoSuspension": "暂缓发行",
    "issuedButNotListed": "已发行未上市",
    "normallyListed": "正常上市"
  },
  "filters": {
    "dateRange": "日期范围",
    "startDate": "开始日期",
    "endDate": "结束日期",
    "clearFilters": "清除筛选"
  },
  "errors": {
    "fetchFailed": "获取数据失败",
    "networkError": "无法连接到服务器，请检查网络连接",
    "serverError": "服务器错误，请稍后重试",
    "noPermission": "您没有权限访问此数据",
    "retry": "重试"
  },
  "noData": "暂无数据"
}
```

**File**: `src/locales/en-US/ipo.json`

```json
{
  "title": "IPO Data",
  "stockCode": "Stock Code",
  "companyName": "Company Name",
  "market": "Market",
  "exchange": "Exchange",
  "listingStatus": "Listing Status",
  "ipoDate": "IPO Date",
  "exchanges": {
    "shanghai": "Shanghai Stock Exchange",
    "shenzhen": "Shenzhen Stock Exchange",
    "beijing": "Beijing Stock Exchange",
    "hongkong": "Hong Kong Stock Exchange"
  },
  "status": {
    "accepted": "Accepted",
    "inReview": "In Review",
    "approved": "Approved",
    "unauthorized": "Unauthorized",
    "ipoSuspension": "IPO Suspension",
    "issuedButNotListed": "Issued But Not Listed",
    "normallyListed": "Normally Listed"
  },
  "filters": {
    "dateRange": "Date Range",
    "startDate": "Start Date",
    "endDate": "End Date",
    "clearFilters": "Clear Filters"
  },
  "errors": {
    "fetchFailed": "Failed to fetch data",
    "networkError": "Cannot connect to server, please check network connection",
    "serverError": "Server error, please try again later",
    "noPermission": "You don't have permission to access this data",
    "retry": "Retry"
  },
  "noData": "No data available"
}
```

**Menu Translation Keys** (add to existing common.json files):

```json
{
  "menu": {
    "ipo": "IPO",
    "ipoList": "IPO List"
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Data Fetching**
   - Use React Query for automatic caching
   - Set staleTime to 5 minutes for IPO data
   - Implement pagination to limit data transfer
   - Use keepPreviousData option to prevent loading flicker

2. **Rendering Optimization**
   - Virtualize table rows for large datasets (if needed)
   - Memoize column definitions
   - Use React.memo for filter components
   - Debounce filter inputs (300ms)

3. **Bundle Size**
   - Lazy load IPO page component
   - Code split IPO-related utilities
   - Tree-shake unused Ant Design components

4. **API Request Optimization**
   - Batch filter changes into single request
   - Cancel pending requests when filters change
   - Implement request deduplication

### Performance Metrics

- Initial page load: < 2 seconds
- Filter application: < 500ms
- Pagination navigation: < 300ms
- Table rendering (20 rows): < 100ms

## Security Considerations

1. **Authentication**
   - Verify user is authenticated before allowing access
   - Include auth token in all API requests
   - Handle 401 responses by redirecting to login

2. **Authorization**
   - Check user roles for IPO data access
   - Respect backend permission system
   - Hide/disable features based on user permissions

3. **Input Validation**
   - Sanitize all filter inputs before sending to API
   - Validate date formats client-side
   - Prevent XSS in company name display

4. **Data Protection**
   - Don't log sensitive IPO data to console in production
   - Use HTTPS for all API communications
   - Implement CSRF protection if needed

## Future Enhancements

1. **Export Functionality**
   - Export filtered data to CSV/Excel
   - Generate PDF reports
   - Email data exports

2. **Advanced Filtering**
   - Full-text search by company name
   - Filter by IPO price range
   - Filter by subscription rate

3. **Data Visualization**
   - IPO timeline chart
   - Status distribution pie chart
   - Exchange comparison bar chart

4. **Real-time Updates**
   - WebSocket connection for live data
   - Auto-refresh on data changes
   - Notification for new IPOs

5. **Detailed View**
   - Click row to view full IPO details
   - Modal or drawer with comprehensive information
   - Historical status changes timeline
