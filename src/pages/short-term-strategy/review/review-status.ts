export interface ReviewStatusInput {
	strategy_type: string
	overall_score?: number | null
	overall_comment?: string
	strategy_effectiveness?: { status?: string, scored?: boolean } | null
}

export function reviewRatingLabel(review: ReviewStatusInput): string | null {
	const status = review.strategy_effectiveness?.status;
	if (status === "data_quality_blocked" || review.overall_comment?.includes("本次不评价战法"))
		return "数据待核验 · 未评级";
	if (status === "no_activity")
		return "无成交无持仓 · 未评级";
	if (status === "forward_validation" || review.strategy_effectiveness?.scored === false || ["adaptive_confluence", "industry_ai"].includes(review.strategy_type))
		return "前向验证 · 未评级";
	return null;
}

export function meanReviewScore(reviews: ReviewStatusInput[]): number | null {
	const scored = reviews.filter(review => !reviewRatingLabel(review) && review.overall_score != null);
	return scored.length ? Math.round(scored.reduce((sum, review) => sum + (review.overall_score ?? 0), 0) / scored.length) : null;
}
