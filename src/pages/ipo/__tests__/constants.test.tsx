import { describe, it, expect, vi } from "vitest";
import { getIPOColumns, getStatusConfig, LISTING_STATUS_OPTIONS, MARKET_OPTIONS, EXCHANGE_OPTIONS } from "../constants";
import type { ListingStatus } from "#src/api/ipo";
import type { TFunction } from "i18next";

describe("IPO Constants", () => {
    // Mock translation function
    const mockT = vi.fn((key: string) => key) as unknown as TFunction;

    describe("getStatusConfig", () => {
        it("should return correct config for all listing statuses", () => {
            const statuses: ListingStatus[] = [
                "accepted",
                "in_review",
                "approved",
                "unauthorized",
                "ipo_suspension",
                "issued_but_not_listed",
                "normally_listed",
            ];

            statuses.forEach((status) => {
                const config = getStatusConfig(status, mockT);
                expect(config).toHaveProperty("color");
                expect(config).toHaveProperty("text");
                expect(typeof config.color).toBe("string");
                expect(typeof config.text).toBe("string");
            });
        });

        it("should return correct colors for different statuses", () => {
            expect(getStatusConfig("approved", mockT).color).toBe("success");
            expect(getStatusConfig("unauthorized", mockT).color).toBe("error");
            expect(getStatusConfig("ipo_suspension", mockT).color).toBe("warning");
            expect(getStatusConfig("in_review", mockT).color).toBe("processing");
        });
    });

    describe("getIPOColumns", () => {
        it("should return an array of column definitions", () => {
            const columns = getIPOColumns(mockT);
            expect(Array.isArray(columns)).toBe(true);
            expect(columns.length).toBeGreaterThan(0);
        });

        it("should include all required columns", () => {
            const columns = getIPOColumns(mockT);
            const dataIndexes = columns.map((col) => col.dataIndex);

            expect(dataIndexes).toContain("stock_code");
            expect(dataIndexes).toContain("name");
            expect(dataIndexes).toContain("market");
            expect(dataIndexes).toContain("exchange");
            expect(dataIndexes).toContain("listing_status");
            expect(dataIndexes).toContain("ipo_date");
        });

        it("should have proper typing for all columns", () => {
            const columns = getIPOColumns(mockT);
            columns.forEach((column) => {
                expect(column).toHaveProperty("title");
                expect(column).toHaveProperty("dataIndex");
                expect(column).toHaveProperty("key");
            });
        });

        it("should configure stock_code column as copyable and fixed", () => {
            const columns = getIPOColumns(mockT);
            const stockCodeColumn = columns.find((col) => col.dataIndex === "stock_code");

            expect(stockCodeColumn).toBeDefined();
            expect(stockCodeColumn?.copyable).toBe(true);
            expect(stockCodeColumn?.fixed).toBe("left");
        });

        it("should configure listing_status column with render function", () => {
            const columns = getIPOColumns(mockT);
            const statusColumn = columns.find((col) => col.dataIndex === "listing_status");

            expect(statusColumn).toBeDefined();
            expect(statusColumn?.render).toBeDefined();
            expect(typeof statusColumn?.render).toBe("function");
        });
    });

    describe("Constants", () => {
        it("should export LISTING_STATUS_OPTIONS with all statuses", () => {
            expect(Array.isArray(LISTING_STATUS_OPTIONS)).toBe(true);
            expect(LISTING_STATUS_OPTIONS).toContain("accepted");
            expect(LISTING_STATUS_OPTIONS).toContain("in_review");
            expect(LISTING_STATUS_OPTIONS).toContain("approved");
            expect(LISTING_STATUS_OPTIONS).toContain("unauthorized");
            expect(LISTING_STATUS_OPTIONS).toContain("ipo_suspension");
            expect(LISTING_STATUS_OPTIONS).toContain("issued_but_not_listed");
            expect(LISTING_STATUS_OPTIONS).toContain("normally_listed");
        });

        it("should export MARKET_OPTIONS with correct structure", () => {
            expect(MARKET_OPTIONS).toHaveProperty("A股");
            expect(MARKET_OPTIONS).toHaveProperty("港股");
            expect(MARKET_OPTIONS["A股"]).toEqual({ text: "A股" });
            expect(MARKET_OPTIONS["港股"]).toEqual({ text: "港股" });
        });

        it("should export EXCHANGE_OPTIONS with all exchanges", () => {
            expect(EXCHANGE_OPTIONS).toHaveProperty("上交所");
            expect(EXCHANGE_OPTIONS).toHaveProperty("深交所");
            expect(EXCHANGE_OPTIONS).toHaveProperty("北交所");
            expect(EXCHANGE_OPTIONS).toHaveProperty("香港交易所");
        });
    });
});
