import type {
	ControllingShareholderResponse,
	ShareholderQueryParams,
	ShareholderQueryResponse,
	ShareholderRefreshResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 查询股东信息（通过股票代码）
 */
export function getShareholders(stock_code: string) {
	return request
		.get("/api/shareholder/query", {
			searchParams: { stock_code } as any,
		})
		.json<ShareholderQueryResponse>();
}

/**
 * 查询股东信息（POST）
 */
export function queryShareholdersPost(params: ShareholderQueryParams) {
	return request
		.post("/api/shareholder/query", {
			json: params,
		})
		.json<ShareholderQueryResponse>();
}

/**
 * 查询股东信息（GET）
 */
export function queryShareholders(params: ShareholderQueryParams) {
	return request
		.get("/api/shareholder/query", {
			searchParams: params as any,
		})
		.json<ShareholderQueryResponse>();
}

/**
 * 查询控股股东（POST）
 */
export function getControllingShareholderPost(company_name: string) {
	return request
		.post("/api/shareholder/controlling", {
			json: { company_name },
		})
		.json<ControllingShareholderResponse>();
}

/**
 * 查询控股股东（GET）
 */
export function getControllingShareholder(company_name: string) {
	return request
		.get("/api/shareholder/controlling", {
			searchParams: { company_name } as any,
		})
		.json<ControllingShareholderResponse>();
}

/**
 * 刷新股东信息
 */
export function refreshShareholderInfo(company_name: string) {
	return request
		.post("/api/shareholder/refresh", {
			json: { company_name },
			timeout: 30000,
		})
		.json<ShareholderRefreshResponse>();
}
