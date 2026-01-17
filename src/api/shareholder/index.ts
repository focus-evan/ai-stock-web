import type {
	ControllingShareholderResponse,
	ShareholderQueryParams,
	ShareholderQueryResponse,
	ShareholderRefreshResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 查询股东信息（POST）
 */
export function queryShareholdersPost(params: ShareholderQueryParams) {
	return request
		.post("shareholder/query", {
			json: params,
		})
		.json<ShareholderQueryResponse>();
}

/**
 * 查询股东信息（GET）
 */
export function queryShareholders(params: ShareholderQueryParams) {
	return request
		.get("shareholder/query", {
			searchParams: params,
		})
		.json<ShareholderQueryResponse>();
}

/**
 * 查询控股股东（POST）
 */
export function getControllingShareholderPost(company_name: string) {
	return request
		.post("shareholder/controlling", {
			json: { company_name },
		})
		.json<ControllingShareholderResponse>();
}

/**
 * 查询控股股东（GET）
 */
export function getControllingShareholder(company_name: string) {
	return request
		.get("shareholder/controlling", {
			searchParams: { company_name },
		})
		.json<ControllingShareholderResponse>();
}

/**
 * 刷新股东信息
 */
export function refreshShareholderInfo(company_name: string) {
	return request
		.post("shareholder/refresh", {
			json: { company_name },
			timeout: 30000,
		})
		.json<ShareholderRefreshResponse>();
}
