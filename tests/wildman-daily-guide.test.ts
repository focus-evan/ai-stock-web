import type { UnwindPlan } from "../src/api/strategy";
import { describe, expect, it } from "vitest";
import { priceAlertForPlan } from "../src/components/UnwindTrackingPanel/price-alerts";
import { beijingClock, buildDailyGuide, guideText } from "../src/components/WildmanDailyPanel/daily-guide";

const midday = new Date("2026-10-14T10:00:00+08:00");
function plan(extra: Partial<UnwindPlan> = {}): UnwindPlan {
	const item: UnwindPlan = {
		id: 1,
		watchlist_id: 1,
		stock_code: "600000",
		stock_name: "测试股票",
		baseline_cost_price: 12,
		baseline_shares: 1000,
		current_shares: 1000,
		cash_pool: 0,
		open_sold_shares: 0,
		open_sell_amount: 0,
		cumulative_cost_reduction: 0,
		effective_cost: 12,
		status: "active",
		trades: [],
		analysis_history: [],
		latest_analysis: { method: "测试", capital_rule: "先卖后买", pnl_pct: -16.67, sell_shares: 200, buyback_shares: 200, min_spread_pct: 2, estimated_round_trip_cost_pct: 0.25, sell_zone_low: 10.5, sell_zone_high: 10.7, buyback_price: 10.1, pause_buy_below: 9.6, cancel_sell_above: 11.1, expected_net_reduction: 75, projected_effective_cost: 11.925, core_floor_shares: 700, lot_size: 100, decision: "SELL_SLICE", decision_label: "候选卖点", risk_level: "medium", reason: "进入压力区", invalid_condition: "破位暂停", next_check: "次日", deep_analysis: { trend: "", location: "", momentum: "", volume: "", position: "" }, execution_steps: [{ step: 1, action: "卖出候选", shares: 200, condition: "到价", reason: "" }], generated_at: "2026-10-14 09:55:00", technical: { as_of: "2026-10-14", current_price: 10.5, ma3: 10.7, ma16: 10.8, ma16_slope_pct: -0.1, deviation16_pct: -3, support_10d: 9.9, resistance_10d: 11, rsi14: 65, atr14: 0.4, volume_ratio_5d: 0.8, trend: "DOWN", trend_label: "趋势下行", bars: [] } },
		...extra,
	};
	item.execution = {
		plan: { ...item.latest_analysis!, trading_date: "2026-10-14", generated_at: "2026-10-14T09:00:00+08:00", valid_until: "2026-10-14T14:57:00+08:00", technical: { ...item.latest_analysis!.technical, as_of: "2026-10-13" } },
		signal: { action: "SELL", phase: "intraday", reason: "连续两次行情条件已满足", shares: 200, limit_price: 10.5, target_price: 10.5, planned_shares: 200, checked_at: "2026-10-14T10:00:00+08:00", valid_until: "2026-10-14T10:02:00+08:00", quote: { price: 10.5, as_of: "20261014100000" } },
	};
	item.latest_analysis = item.execution.plan;
	return item;
}
describe("wildman daily guide trade constraints", () => {
	it("uses Beijing dates and never relabels an expired plan as tomorrow's plan", () => {
		expect(beijingClock(new Date("2026-10-13T18:00:00Z")).date).toBe("2026-10-14");
		const guide = buildDailyGuide(plan(), new Date("2026-10-14T16:45:00+08:00"));
		expect(guide.live).toBe(false);
		expect(guide.needsRefresh).toBe(true);
		expect(guide.canAct).toBe(false);
		expect(guide.quantity).toBe(0);
	});
	it("preserves a morning plan while a stale intraday quote pauses the current action", () => {
		const guide = buildDailyGuide(plan(), new Date("2026-10-14T10:11:00+08:00"));
		expect(guide.needsRefresh).toBe(false);
		expect(guide.live).toBe(false);
		expect(guide.canAct).toBe(false);
		expect(guide.currentQuantity).toBe(0);
		expect(guide.quantity).toBe(200);
	});
	it("lets valid intraday data describe a conditional old-holding sale while preserving the core", () => {
		const guide = buildDailyGuide(plan(), midday);
		expect(guide.live).toBe(true);
		expect(guide.strategyDate).toBe("2026-10-14");
		expect(guide.dataDate).toBe("2026-10-13");
		expect(guide.generatedAt).toBe("2026-10-14 09:00:00");
		expect(guide.canAct).toBe(true);
		expect(guide.phase).toBe("sell");
		expect(guide.quantity).toBeLessThanOrEqual(300);
		expect(guide.steps[2].instruction).toContain("录入真实价格与费用");
	});
	it("budgets buyback fees, not just the quoted purchase value", () => {
		const p = plan({ current_shares: 800, open_sold_shares: 200, open_sell_amount: 2100, cash_pool: 2020 });
		p.execution!.signal.target_price = 10.1;
		const guide = buildDailyGuide(p, midday);
		expect(guide.phase).toBe("buyback");
		expect(guide.quantity).toBe(100);
		expect(guide.quantity * 10.1 * (1 + 0.25 / 200)).toBeLessThanOrEqual(2020);
	});
	it("blocks buyback for every ST position and for broken support", () => {
		const p = plan({ stock_name: "*ST测试", open_sold_shares: 200, cash_pool: 2100, open_sell_amount: 2200 });
		expect(buildDailyGuide(p, midday).phase).toBe("blocked");
		p.stock_name = "测试";
		p.execution!.signal.quote!.price = 9.5;
		expect(buildDailyGuide(p, midday).title).toBe("已经破位，本轮不接回");
	});
	it("stops mechanical morning sales when the trend repairs and splits an exit into whole lots", () => {
		const p = plan();
		p.latest_analysis!.technical.trend = "UP";
		expect(buildDailyGuide(p, midday).quantity).toBe(0);
		expect(buildDailyGuide(p, midday).phase).toBe("recovery");
		p.execution!.signal.quote!.price = 12.1;
		expect(buildDailyGuide(p, midday).quantity).toBe(500);
	});
	it("invalidates a snapshot after a newly recorded trade", () => {
		const p = plan({ trades: [{ id: 1, account_id: 1, side: "sell", shares: 200, price: 10.6, fees: 5, gross_amount: 2120, cash_change: 2115, cost_reduction: 0, trade_date: "2026-10-14", created_at: "2026-10-14 10:00:01" }] });
		expect(buildDailyGuide(p, midday).needsRefresh).toBe(true);
	});
	it("keeps the dated prerequisite conditions in a copied guide", () => {
		const p = plan();
		const text = guideText(p, buildDailyGuide(p, new Date("2026-10-14T16:45:00+08:00")));
		expect(text).toContain("策略适用日期 2026-10-14");
		expect(text).toContain("当前可复核 0 股");
		expect(text).toContain("未确认不执行");
		expect(text).toContain("系统规则");
	});
	it("keeps the stricter full-lot trigger and never allows an early one-lot liquidation", () => {
		const p = plan({ baseline_shares: 100, current_shares: 100 });
		p.latest_analysis!.position_mode = "ONE_LOT_FULL_ROTATION";
		p.latest_analysis!.core_floor_shares = 0;
		p.latest_analysis!.sell_shares = 100;
		p.latest_analysis!.decision = "WAIT_ONE_LOT";
		p.execution!.signal.action = "WAIT";
		p.execution!.signal.shares = 0;
		const guide = buildDailyGuide(p, midday);
		expect(guide.phase).toBe("wait");
		expect(guide.steps[0].instruction).toContain("RSI≥68");
		expect(guide.steps[0].instruction).toContain("不满足不得清仓");
	});
	it("does not treat a legacy analysis as today's execution plan", () => {
		const p = plan();
		p.execution = undefined;
		expect(buildDailyGuide(p, midday)).toMatchObject({ phase: "blocked", needsRefresh: true, currentQuantity: 0 });
	});
	it("keeps concrete prices and planned shares visible before the market opens", () => {
		const p = plan();
		p.execution!.signal.phase = "premarket";
		p.execution!.signal.action = "WAIT";
		p.execution!.signal.quote = {};
		p.execution!.signal.planned_shares = undefined;
		const guide = buildDailyGuide(p, new Date("2026-10-14T09:15:00+08:00"));
		expect(guide).toMatchObject({ needsRefresh: false, canAct: false, quantity: 200, currentQuantity: 0 });
		expect(guide.steps[1]).toMatchObject({ price: 10.5, shares: 200 });
	});
	it("uses the recalculated buyback target in the plan, copy and notification", () => {
		const p = plan({ current_shares: 800, open_sold_shares: 200, open_sell_amount: 2200, cash_pool: 2200 });
		p.execution!.signal = { ...p.execution!.signal, action: "BUY_BACK", target_price: 10, limit_price: 10, quote: { price: 9.99, as_of: "20261014100000" } };
		const guide = buildDailyGuide(p, midday);
		expect(guide).toMatchObject({ phase: "buyback", canAct: true, currentLimit: 10, currentQuantity: 200 });
		expect(guide.steps[1]).toMatchObject({ price: 10, shares: 200 });
		expect(priceAlertForPlan(p, midday)?.target).toBe(10);
		expect(guideText(p, guide)).toContain("限价 ¥10.00");
	});
	it("refuses a trigger whose quantity exceeds the permitted holding capacity", () => {
		const p = plan();
		p.execution!.signal.shares = 500;
		expect(buildDailyGuide(p, midday)).toMatchObject({ phase: "blocked", canAct: false, currentQuantity: 0, quantity: 0 });
	});
	it("blocks invalidated plans and changed holding baselines", () => {
		const p = plan();
		p.execution!.signal.invalidated = true;
		expect(buildDailyGuide(p, midday)).toMatchObject({ phase: "blocked", canAct: false, quantity: 0 });
		p.execution!.signal.invalidated = false;
		p.execution!.plan!.baseline_shares = 2000;
		expect(buildDailyGuide(p, midday).needsRefresh).toBe(true);
	});
});
