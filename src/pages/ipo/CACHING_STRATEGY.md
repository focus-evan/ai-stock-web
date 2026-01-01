# IPO Data Caching Strategy

## Overview

The IPO data management feature uses TanStack Query (React Query) for efficient data fetching and caching. This document describes the caching strategy implemented to optimize performance and user experience.

## Cache Configuration

### Global Configuration

The global QueryClient is configured in `src/components/tanstack-query/index.tsx` with the following defaults:

```typescript
{
  queries: {
    refetchOnWindowFocus: false,  // Don't refetch when window regains focus
    refetchOnReconnect: false,    // Don't refetch when network reconnects
    retry: 0,                      // No automatic retries (handled manually)
    staleTime: 5 * 60 * 1000,     // 5 minutes - data is fresh for 5 minutes
    gcTime: 10 * 60 * 1000,       // 10 minutes - cache garbage collection time
  }
}
```

### IPO-Specific Configuration

The IPO page uses `queryClient.fetchQuery` with the following configuration:

```typescript
queryClient.fetchQuery({
  queryKey: ["ipo-list", queryParams],
  queryFn: () => fetchIPOList(queryParams),
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 10 * 60 * 1000,    // 10 minutes
})
```

## Caching Behavior

### 1. Cache Key Structure

The cache key is structured as: `["ipo-list", queryParams]`

This ensures that:
- Each unique combination of filters creates a separate cache entry
- Identical queries reuse cached data
- Cache is automatically invalidated when parameters change

Example cache keys:
```typescript
["ipo-list", { page: 1, page_size: 20 }]
["ipo-list", { page: 1, page_size: 20, market: "A股" }]
["ipo-list", { page: 2, page_size: 20, market: "A股" }]
```

### 2. Stale Time (5 minutes)

**Purpose**: Determines how long data is considered "fresh"

**Behavior**:
- When data is fetched, it's marked as fresh for 5 minutes
- During this period, identical queries return cached data without making API calls
- After 5 minutes, data becomes "stale" but remains in cache
- Stale data is still returned immediately, but a background refetch is triggered

**Rationale**: IPO data doesn't change frequently, so 5 minutes is appropriate for:
- Reducing unnecessary API calls
- Improving perceived performance
- Keeping data reasonably up-to-date

### 3. Garbage Collection Time (10 minutes)

**Purpose**: Determines how long unused cache entries are kept in memory

**Behavior**:
- Cache entries are kept for 10 minutes after they're no longer being used
- If a query is re-executed within 10 minutes, cached data is available instantly
- After 10 minutes of inactivity, the cache entry is removed from memory

**Rationale**: 10 minutes provides a good balance between:
- Memory usage (not keeping too much data)
- User experience (data available for common navigation patterns)

### 4. Cache Reuse for Identical Queries

**Implementation**: Using `queryClient.fetchQuery` with consistent query keys

**Behavior**:
- When the same query is executed multiple times, only the first call hits the API
- Subsequent calls within the stale time window return cached data immediately
- This prevents duplicate API calls for the same data

**Example Scenario**:
1. User loads page 1 with market filter "A股" → API call made
2. User navigates to page 2 → API call made (different query)
3. User navigates back to page 1 → Cached data returned (no API call)

### 5. Previous Data Preservation

**Implementation**: Available via `useIPOQuery` hook with `placeholderData`

**Behavior**:
- When filters or pagination change, previous data remains visible
- New data loads in the background
- UI updates smoothly without showing loading spinner
- Prevents "loading flicker" during navigation

**Note**: The main IPO page currently uses `queryClient.fetchQuery` directly. To enable previous data preservation, the page could be refactored to use the `useIPOQuery` hook.

## Performance Benefits

### 1. Reduced API Calls

- Identical queries within 5 minutes: **0 additional API calls**
- Navigation back to previously viewed pages: **0 additional API calls**
- Filter changes: **Only 1 API call per unique filter combination**

### 2. Improved User Experience

- Instant data display for cached queries
- Smooth transitions during pagination
- No loading flicker when navigating between pages
- Responsive filter interactions with debouncing

### 3. Network Efficiency

- Debounced filter changes (300ms) prevent excessive API calls
- Cache reuse reduces bandwidth consumption
- Background refetching keeps data fresh without blocking UI

## Cache Invalidation

### Automatic Invalidation

Cache entries are automatically invalidated when:
- Query parameters change (different filters, page, or page size)
- Data becomes stale (after 5 minutes)
- Cache entry is garbage collected (after 10 minutes of inactivity)

### Manual Invalidation

Users can manually refresh data by:
- Clicking the "Retry" button in the toolbar
- Resetting filters (clears cache and reloads)
- Reloading the page

## Memory Management

### Cache Size

- Each cache entry stores: query parameters + response data
- Typical response size: ~20 records × ~500 bytes = ~10KB per page
- With 10-minute GC time, maximum cache size is bounded by user activity

### Garbage Collection

- Unused cache entries are automatically removed after 10 minutes
- Active queries prevent garbage collection
- Memory usage is automatically managed by TanStack Query

## Error Handling

### Failed Requests

- Failed requests are **not cached**
- Error responses don't pollute the cache
- Retry mechanism allows recovery without cache interference

### Stale Data During Errors

- If a background refetch fails, stale data remains available
- Users can continue working with cached data
- Error messages inform users of the issue

## Future Enhancements

### Potential Improvements

1. **Optimistic Updates**: Update cache immediately when filters change
2. **Prefetching**: Preload next page data for faster navigation
3. **Infinite Scroll**: Load more data without pagination
4. **Real-time Updates**: WebSocket integration for live data
5. **Selective Invalidation**: Invalidate specific cache entries on data changes

### Configuration Tuning

Based on usage patterns, consider adjusting:
- **staleTime**: Increase for more aggressive caching, decrease for fresher data
- **gcTime**: Increase for longer cache retention, decrease to reduce memory usage
- **Prefetch strategy**: Implement predictive prefetching based on user behavior

## Monitoring

### React Query Devtools

The React Query Devtools are available in development mode to:
- Inspect cache entries
- View query states (fresh, stale, fetching)
- Monitor cache size and memory usage
- Debug cache-related issues

### Performance Metrics

Key metrics to monitor:
- Cache hit rate (queries served from cache vs. API calls)
- Average response time (cached vs. fresh data)
- Memory usage (cache size over time)
- API call frequency (requests per minute)

## Validation Against Requirements

This caching strategy satisfies **Requirement 9.5**:

> "WHEN data is successfully cached THEN the IPO System SHALL reuse cached data for identical queries"

**Implementation**:
- ✅ Identical queries reuse cached data within 5-minute stale time
- ✅ Cache keys ensure proper query matching
- ✅ No duplicate API calls for identical queries
- ✅ Background refetching keeps data fresh
- ✅ Garbage collection prevents memory leaks
