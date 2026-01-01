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
