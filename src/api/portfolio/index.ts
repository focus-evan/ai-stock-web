import type {
	CreatePortfolioRequest,
	PerformanceResponse,
	PortfolioDetailResponse,
	PortfolioListResponse,
	PortfolioResponse,
	ReviewDetailResponse,
	ReviewListResponse,
	TradesResponse,
} from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 列出所有模拟交易组合
 */
export function fetchPortfolioList(strategyType?: string) {
	const searchParams: Record<string, string> = { status: "active" };
	if (strategyType) {
		searchParams.strategy_type = strategyType;
	}
	return request
		.get("portfolio/list", { searchParams, timeout: 15000 })
		.json<PortfolioListResponse>();
}

/**
 * 获取组合详情
 */
export function fetchPortfolioDetail(portfolioId: number) {
	return request
		.get(`portfolio/${portfolioId}`, { timeout: 15000 })
		.json<PortfolioDetailResponse>();
}

/**
 * 获取收益曲线
 */
export function fetchPortfolioPerformance(portfolioId: number, days: number = 30) {
	return request
		.get(`portfolio/${portfolioId}/performance`, {
			searchParams: { days },
			timeout: 15000,
		})
		.json<PerformanceResponse>();
}

/**
 * 获取交易记录
 */
export function fetchPortfolioTrades(portfolioId: number, limit: number = 50) {
	return request
		.get(`portfolio/${portfolioId}/trades`, {
			searchParams: { limit },
			timeout: 15000,
		})
		.json<TradesResponse>();
}

/**
 * 创建模拟交易组合
 */
export function createPortfolio(data: CreatePortfolioRequest) {
	return request
		.post("portfolio/create", { json: data, timeout: 120000 })
		.json<PortfolioResponse>();
}

/**
 * 手动触发调仓
 */
export function triggerRebalance(portfolioId: number) {
	return request
		.post(`portfolio/${portfolioId}/trigger`, { timeout: 120000 })
		.json<PortfolioResponse>();
}

/**
 * 开启/暂停自动交易
 */
export function toggleAutoTrade(portfolioId: number, autoTrade: boolean) {
	return request
		.put(`portfolio/${portfolioId}/toggle`, {
			searchParams: { auto_trade: String(autoTrade) },
			timeout: 10000,
		})
		.json<PortfolioResponse>();
}

/**
 * 获取复盘列表
 */
export function fetchReviews(params?: {
	portfolio_id?: number
	strategy_type?: string
	limit?: number
}) {
	return request
		.get("portfolio/reviews/list", {
			searchParams: params as Record<string, string>,
			timeout: 15000,
		})
		.json<ReviewListResponse>();
}

/**
 * 获取某日复盘详情
 */
export function fetchReviewDetail(portfolioId: number, tradingDate?: string) {
	const searchParams: Record<string, string> = {};
	if (tradingDate)
		searchParams.trading_date = tradingDate;
	return request
		.get(`portfolio/${portfolioId}/review`, {
			searchParams,
			timeout: 15000,
		})
		.json<ReviewDetailResponse>();
}

/**
 * 手动触发复盘
 */
export function triggerReview(portfolioId: number) {
	return request
		.post(`portfolio/${portfolioId}/review/trigger`, { timeout: 120000 })
		.json<PortfolioResponse>();
}
