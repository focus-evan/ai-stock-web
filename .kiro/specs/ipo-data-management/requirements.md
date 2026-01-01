# Requirements Document

## Introduction

This document specifies the requirements for implementing an IPO (Initial Public Offering) data management feature in the admin system. The feature will provide users with the ability to view, filter, and analyze IPO company data through a dedicated menu and page interface. The system will integrate with an existing backend API that provides comprehensive IPO data including company information, listing status, IPO dates, and exchange details.

## Glossary

- **IPO System**: The frontend application component responsible for displaying and managing IPO data
- **Backend API**: The existing FastAPI service that provides IPO data endpoints at `/api/lixingren/ipo/`
- **IPO Record**: A single data entry representing one company's IPO information
- **Listing Status**: The current state of an IPO application (accepted, in_review, approved, unauthorized, ipo_suspension, issued_but_not_listed, normally_listed)
- **Exchange**: The stock exchange where the IPO is listed (上交所, 深交所, 北交所, 香港交易所)
- **Market**: The market category (A股, 港股)
- **User**: An authenticated admin user with access to the system

## Requirements

### Requirement 1

**User Story:** As a user, I want to access an IPO menu item in the navigation, so that I can view IPO data in a dedicated page.

#### Acceptance Criteria

1. WHEN the system loads THEN the IPO System SHALL display a menu item labeled "IPO数据" in the navigation structure
2. WHEN a user clicks the IPO menu item THEN the IPO System SHALL navigate to the IPO data page
3. WHEN the IPO page loads THEN the IPO System SHALL display a table layout consistent with existing system pages

### Requirement 2

**User Story:** As a user, I want to view a paginated list of IPO records, so that I can browse through all available IPO data efficiently.

#### Acceptance Criteria

1. WHEN the IPO page loads THEN the IPO System SHALL fetch IPO records from the Backend API endpoint `/api/lixingren/ipo/query`
2. WHEN IPO records are received THEN the IPO System SHALL display them in a table with columns for stock code, company name, market, exchange, listing status, and IPO date
3. WHEN displaying IPO records THEN the IPO System SHALL show pagination controls with configurable page size
4. WHEN a user changes the page number THEN the IPO System SHALL fetch and display the corresponding page of data
5. WHEN IPO records are displayed THEN the IPO System SHALL sort them by IPO date in descending order (newest first)

### Requirement 3

**User Story:** As a user, I want to filter IPO records by listing status, so that I can focus on IPOs in specific stages of the listing process.

#### Acceptance Criteria

1. WHEN the IPO page loads THEN the IPO System SHALL display a filter control for listing status
2. WHEN a user selects a listing status filter THEN the IPO System SHALL send the selected status to the Backend API as the `listing_status` parameter
3. WHEN filtered results are received THEN the IPO System SHALL display only IPO records matching the selected status
4. WHEN a user clears the status filter THEN the IPO System SHALL display all IPO records regardless of status

### Requirement 4

**User Story:** As a user, I want to filter IPO records by date range, so that I can analyze IPOs within specific time periods.

#### Acceptance Criteria

1. WHEN the IPO page loads THEN the IPO System SHALL display date range filter controls for start date and end date
2. WHEN a user selects a start date THEN the IPO System SHALL send the date to the Backend API as the `start_date` parameter in YYYY-MM-DD format
3. WHEN a user selects an end date THEN the IPO System SHALL send the date to the Backend API as the `end_date` parameter in YYYY-MM-DD format
4. WHEN date filters are applied THEN the IPO System SHALL display only IPO records with IPO dates within the specified range
5. WHEN a user clears the date filters THEN the IPO System SHALL display all IPO records regardless of date

### Requirement 5

**User Story:** As a user, I want to filter IPO records by exchange and market, so that I can focus on specific trading venues and market segments.

#### Acceptance Criteria

1. WHEN the IPO page loads THEN the IPO System SHALL display filter controls for exchange and market
2. WHEN a user selects an exchange filter THEN the IPO System SHALL send the selected exchange to the Backend API as the `exchange` parameter
3. WHEN a user selects a market filter THEN the IPO System SHALL send the selected market to the Backend API as the `market` parameter
4. WHEN exchange or market filters are applied THEN the IPO System SHALL display only IPO records matching the selected criteria
5. WHEN a user clears exchange or market filters THEN the IPO System SHALL display all IPO records regardless of exchange or market

### Requirement 6

**User Story:** As a user, I want to combine multiple filters simultaneously, so that I can perform complex queries on IPO data.

#### Acceptance Criteria

1. WHEN a user applies multiple filters THEN the IPO System SHALL send all active filter parameters to the Backend API in a single request
2. WHEN combined filters are applied THEN the IPO System SHALL display only IPO records matching all specified criteria
3. WHEN any filter is changed THEN the IPO System SHALL reset pagination to page 1 and fetch new results
4. WHEN all filters are cleared THEN the IPO System SHALL display the complete unfiltered dataset

### Requirement 7

**User Story:** As a user, I want to see the total count of filtered results, so that I understand the scope of my query results.

#### Acceptance Criteria

1. WHEN IPO records are displayed THEN the IPO System SHALL show the total count of records matching the current filters
2. WHEN filters are applied or changed THEN the IPO System SHALL update the total count to reflect the new filter criteria
3. WHEN pagination is used THEN the IPO System SHALL maintain the total count across all pages

### Requirement 8

**User Story:** As a user, I want the IPO page to follow the existing system design patterns, so that I have a consistent user experience.

#### Acceptance Criteria

1. WHEN the IPO page is rendered THEN the IPO System SHALL use the BasicContent component for page layout
2. WHEN the IPO table is rendered THEN the IPO System SHALL use the BasicTable component with ProTable features
3. WHEN filters are rendered THEN the IPO System SHALL use Ant Design form components consistent with other system pages
4. WHEN the page displays loading states THEN the IPO System SHALL use the same loading indicators as other system pages
5. WHEN API errors occur THEN the IPO System SHALL display error messages using the global message component

### Requirement 9

**User Story:** As a user, I want the IPO data to be fetched efficiently, so that the page loads quickly and responds smoothly to interactions.

#### Acceptance Criteria

1. WHEN the IPO page loads THEN the IPO System SHALL use React Query for data fetching and caching
2. WHEN filters are changed THEN the IPO System SHALL debounce filter changes to avoid excessive API calls
3. WHEN data is being fetched THEN the IPO System SHALL display a loading state in the table
4. WHEN data fetching fails THEN the IPO System SHALL display an error message and provide a retry option
5. WHEN data is successfully cached THEN the IPO System SHALL reuse cached data for identical queries

### Requirement 10

**User Story:** As a developer, I want the IPO feature to have proper TypeScript types, so that the code is type-safe and maintainable.

#### Acceptance Criteria

1. WHEN API functions are defined THEN the IPO System SHALL include TypeScript interfaces for all request and response types
2. WHEN components are created THEN the IPO System SHALL define proper prop types using TypeScript interfaces
3. WHEN API responses are received THEN the IPO System SHALL validate response structure matches defined types
4. WHEN filter parameters are constructed THEN the IPO System SHALL use typed objects to ensure parameter correctness
