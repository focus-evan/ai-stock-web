import type { TaskResponse } from "../common/types";
import type {
	StockInfo,
	StockListResponse,
	StockQueryParams,
	StockSearchParams,
	StockStatistics,
	StockSyncParams,
	StockSyncResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 获取单个股票信息
 */
export function getStockInfo(stock_code: string) {
	return request.get(`/api/lixingren/stock/${stock_code}`).json<StockInfo>();
}

/**
 * 查询股票列表
 */
export function getStockList(params: StockQueryParams) {
	return request
		.get("/api/lixingren/stocks", {
			searchParams: params as any,
		})
		.json<StockListResponse>();
}

/**
 * 搜索股票
 */
export function searchStocks(params: StockSearchParams) {
	return request
		.get("/api/lixingren/search", {
			searchParams: params,
		})
		.json<StockInfo[]>();
}

/**
 * 同步股票信息
 */
export function syncStocks(params: StockSyncParams) {
	return request
		.post("/api/lixingren/sync", {
			json: params,
			timeout: 60000,
		})
		.json<StockSyncResponse>();
}

/**
 * 异步同步股票信息
 */
export function syncStocksAsync(params: StockSyncParams) {
	return request
		.post("/api/lixingren/sync/async", {
			json: params,
		})
		.json<TaskResponse>();
}

/**
 * 同步预披露股票
 */
export function syncPreDisclosure() {
	return request
		.post("/api/lixingren/sync/pre-disclosure", {
			timeout: 60000,
		})
		.json<StockSyncResponse>();
}

/**
 * 同步所有未上市公司
 */
export function syncAllUnlisted() {
	return request
		.post("/api/lixingren/sync/all-unlisted", {
			timeout: 60000,
		})
		.json<StockSyncResponse>();
}

/**
 * 删除股票信息
 */
export function deleteStock(stock_code: string) {
	return request
		.delete(`/api/lixingren/stock/${stock_code}`)
		.json<{ status: string, message: string, stock_code: string }>();
}

/**
 * 获取统计信息
 */
export function getStockStatistics() {
	return request.get("/api/lixingren/statistics").json<StockStatistics>();
}
