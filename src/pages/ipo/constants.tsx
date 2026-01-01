import type { ProColumns } from "@ant-design/pro-components";
import type { IPORecord, ListingStatus } from "#src/api/ipo";
import type { TFunction } from "i18next";
import { Tag } from "antd";

/**
 * Status configuration mapping for IPO listing statuses
 * Maps each status to its display color and translated text
 */
export interface StatusConfig {
    color: string;
    text: string;
}

/**
 * Get status configuration for a given listing status
 * @param status - The listing status
 * @param t - Translation function
 * @returns Status configuration with color and text
 */
export function getStatusConfig(status: ListingStatus, t: TFunction): StatusConfig {
    const configs: Record<ListingStatus, { color: string; text: string }> = {
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

/**
 * Get IPO table column definitions
 * @param t - Translation function
 * @returns Array of ProColumns for the IPO table
 */
export function getIPOColumns(t: TFunction): ProColumns<IPORecord>[] {
    return [
        {
            title: t("ipo.stockCode"),
            dataIndex: "stock_code",
            key: "stock_code",
            width: 120,
            fixed: "left",
            copyable: true,
            search: false,
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
            valueType: "date",
            sorter: true,
            search: false,
        },
        {
            title: t("ipo.filters.dateRange"),
            dataIndex: "dateRange",
            key: "dateRange",
            valueType: "dateRange",
            hideInTable: true,
            search: {
                transform: (value) => {
                    if (!value || !Array.isArray(value)) {
                        return {};
                    }
                    return {
                        start_date: value[0],
                        end_date: value[1],
                    };
                },
            },
        },
    ];
}

/**
 * Market options for filtering
 */
export const MARKET_OPTIONS = {
    "A股": { text: "A股" },
    "港股": { text: "港股" },
} as const;

/**
 * Exchange options for filtering
 */
export const EXCHANGE_OPTIONS = {
    "上交所": "shanghai",
    "深交所": "shenzhen",
    "北交所": "beijing",
    "香港交易所": "hongkong",
} as const;

/**
 * Listing status options
 */
export const LISTING_STATUS_OPTIONS: ListingStatus[] = [
    "accepted",
    "in_review",
    "approved",
    "unauthorized",
    "ipo_suspension",
    "issued_but_not_listed",
    "normally_listed",
];
