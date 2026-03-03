import type { DragonHeadResponse } from "./types";
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
