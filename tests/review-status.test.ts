import { describe, expect, it } from "vitest";
import { meanReviewScore, reviewRatingLabel } from "../src/pages/short-term-strategy/review/review-status";

describe("review rating evidence", () => {
	it("does not turn blocked or idle reviews into zero-score performance", () => {
		const blocked = { strategy_type: "dragon_head", overall_score: 0, strategy_effectiveness: { status: "data_quality_blocked" } };
		const idle = { strategy_type: "moving_average", overall_score: 0, strategy_effectiveness: { status: "no_activity" } };
		expect(reviewRatingLabel(blocked)).toContain("待核验");
		expect(meanReviewScore([blocked, idle])).toBeNull();
		expect(meanReviewScore([blocked, idle, { strategy_type: "dragon_head", overall_score: 70 }])).toBe(70);
	});
	it("recognizes older blocked records and retains an actual zero score", () => {
		expect(reviewRatingLabel({ strategy_type: "dragon_head", overall_comment: "本次不评价战法优劣" })).toContain("未评级");
		expect(meanReviewScore([{ strategy_type: "dragon_head", overall_score: 0 }])).toBe(0);
	});
});
