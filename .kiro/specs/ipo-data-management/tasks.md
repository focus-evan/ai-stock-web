# Implementation Plan

- [x] 1. Set up API service layer for IPO data





  - Create `src/api/ipo/types.ts` with TypeScript interfaces for IPORecord, IPOQueryParams, IPOListResponse, and IPOStatisticsResponse
  - Create `src/api/ipo/index.ts` with fetchIPOList and fetchIPOStatistics functions
  - Configure request utility to call the correct backend endpoint `/api/lixingren/ipo/query`
  - _Requirements: 2.1, 10.1_

- [ ]* 1.1 Write property test for API response validation
  - **Property 13: Response type validation**
  - **Validates: Requirements 10.3**

- [x] 2. Create localization files for IPO feature





  - Add `src/locales/zh-CN/ipo.json` with Chinese translations for all IPO-related text
  - Add `src/locales/en-US/ipo.json` with English translations
  - Update `src/locales/zh-CN/common.json` and `src/locales/en-US/common.json` to add IPO menu items
  - _Requirements: 1.1_

- [x] 3. Implement IPO page component with table structure





  - Create `src/pages/ipo/index.tsx` with basic page layout using BasicContent and BasicTable
  - Define table columns for stock_code, name, market, exchange, listing_status, and ipo_date
  - Integrate React Query for data fetching with proper loading and error states
  - Implement pagination controls with configurable page size
  - _Requirements: 1.3, 2.2, 2.3, 8.1, 8.2, 9.1_

- [ ]* 3.1 Write property test for column completeness
  - **Property 1: Column completeness**
  - **Validates: Requirements 2.2**

- [ ]* 3.2 Write property test for loading state visibility
  - **Property 10: Loading state visibility**
  - **Validates: Requirements 9.3**

- [x] 4. Implement table sorting functionality




  - Configure table to sort IPO records by ipo_date in descending order
  - Ensure sorting is applied to data received from API
  - _Requirements: 2.5_

- [ ]* 4.1 Write property test for descending date sort
  - **Property 2: Descending date sort**
  - **Validates: Requirements 2.5**

- [x] 5. Implement pagination logic




  - Handle page number changes and calculate correct offset
  - Update API request with page and page_size parameters
  - Display total count from API response
  - _Requirements: 2.4, 7.1_

- [ ]* 5.1 Write property test for pagination offset calculation
  - **Property 3: Pagination offset calculation**
  - **Validates: Requirements 2.4**

- [ ]* 5.2 Write property test for total count accuracy
  - **Property 7: Total count accuracy**
  - **Validates: Requirements 7.1**

- [x] 6. Implement filter controls for listing status, market, and exchange




  - Add filter controls using ProTable's built-in filter features
  - Configure valueEnum for listing_status, market, and exchange filters
  - Implement filter state management
  - _Requirements: 3.1, 5.1_

- [x] 7. Implement date range filter





  - Add date range picker for start_date and end_date filters
  - Configure date format transformation to YYYY-MM-DD
  - Integrate date filters with API request parameters
  - _Requirements: 4.1_

- [ ]* 7.1 Write property test for filter parameter transmission
  - **Property 4: Filter parameter transmission**
  - **Validates: Requirements 3.2, 4.2, 4.3, 5.2, 5.3**

- [x] 8. Implement combined filter logic





  - Ensure all active filters are sent to API in single request
  - Implement filter combination with AND logic
  - Reset pagination to page 1 when any filter changes
  - Handle filter clearing to show unfiltered data
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 8.1 Write property test for combined filter conjunction
  - **Property 5: Combined filter conjunction**
  - **Validates: Requirements 6.2**

- [ ]* 8.2 Write property test for pagination reset on filter change
  - **Property 6: Pagination reset on filter change**
  - **Validates: Requirements 6.3**

- [x] 9. Implement filter debouncing for performance





  - Add debounce logic to filter changes (300ms delay)
  - Prevent excessive API calls during rapid filter changes
  - _Requirements: 9.2_

- [ ]* 9.1 Write property test for debounce effectiveness
  - **Property 9: Debounce effectiveness**
  - **Validates: Requirements 9.2**

- [x] 10. Implement error handling and retry logic





  - Add error boundary for table component
  - Display user-friendly error messages using global message component
  - Implement retry functionality for failed requests
  - Handle different error types (network, server, client errors)
  - _Requirements: 8.5, 9.4_

- [ ]* 10.1 Write property test for error message display
  - **Property 8: Error message display**
  - **Validates: Requirements 8.5**

- [ ]* 10.2 Write property test for error recovery
  - **Property 11: Error recovery**
  - **Validates: Requirements 9.4**

- [x] 11. Configure React Query caching strategy








  - Set appropriate staleTime and cacheTime for IPO data
  - Implement cache reuse for identical queries
  - Configure keepPreviousData option to prevent loading flicker
  - _Requirements: 9.5_

- [ ]* 11.1 Write property test for cache reuse
  - **Property 12: Cache reuse**
  - **Validates: Requirements 9.5**

- [x] 12. Create IPO constants and utilities





  - Create `src/pages/ipo/constants.tsx` with column definitions and status configurations
  - Implement getIPOColumns function with proper typing
  - Add status color mapping for Tag components
  - _Requirements: 2.2_

- [x] 13. Add IPO route to router configuration





  - Create `src/router/routes/modules/ipo.ts` with route definitions
  - Configure lazy loading for IPO page component
  - Set appropriate route metadata (icon, title, roles)
  - Register IPO routes in main router configuration
  - _Requirements: 1.1, 1.2_

- [ ]* 13.1 Write unit test for menu navigation
  - Test that clicking IPO menu item navigates to correct route
  - Verify menu item is rendered in navigation
  - _Requirements: 1.1, 1.2_

- [x] 14. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 15. Write integration tests for complete filter flow
  - Test end-to-end user journey from page load to filtered results
  - Verify filter combinations work correctly
  - Test pagination with filters applied
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 16. Write unit tests for edge cases
  - Test empty dataset response handling
  - Test single record response
  - Test maximum page size
  - Test invalid date ranges
  - Test special characters in company names
  - _Requirements: 3.4, 4.5, 5.5, 6.4_
