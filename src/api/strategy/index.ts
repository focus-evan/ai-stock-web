import type { DragonHeadResponse, SentimentResponse } from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/**
 * 获取龙头战法推荐列表
 * @param limit - 返回推荐数量，默认20
 */
export function fetchDragonHeadRecommendations(limit: number = 20) {
	return request
		.get("strategy/dragon-head", {
			searchParams: { limit },
			timeout: 60000, // 60秒超时（策略计算可能较慢）
		})
		.json<DragonHeadResponse>();
}

/**
 * 获取情绪战法数据
 * @param days - 返回历史天数，默认30
 */
export function fetchSentimentData(days: number = 30) {
	return request
		.get("strategy/sentiment", {
			searchParams: { days },
			timeout: 120000, // 120秒超时（首次计算较慢）
		})
		.json<SentimentResponse>();
}
