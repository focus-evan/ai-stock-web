import type { UnwindExecution } from "#src/api/strategy";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { beijingClock, executionSummary, executionTime, priceRangeNote, regularPriceBand } from "../src/components/UnwindTrackingPanel/execution-presentation";
import ExecutionStatus from "../src/components/UnwindTrackingPanel/ExecutionStatus";

const now = "2026-10-28T13:41:17.314410+08:00";
const waiting = {
	server_time: now,
	plan: {
		trading_date: "2026-10-28",
		basis_date: "2026-10-27",
		market: "a",
		is_special_treatment: false,
		sell_zone_low: 317.62,
		sell_zone_high: 323.66,
		buyback_price: 311.26,
		cancel_sell_above: 354.55,
		pause_buy_below: 224.01,
		sell_shares: 0,
		technical: { as_of: "2026-10-27", current_price: 237.59, ma3: 250.0933, ma16: 317.6131, support_10d: 236.1, resistance_10d: 348.5, atr14: 24.1621, bars: Array.from({ length: 30 }, () => ({})) },
	},
	signal: {
		action: "WAIT",
		label: "系统自动复核中，暂不操作",
		phase: "intraday",
		shares: 0,
		limit_price: null,
		reason: "当日跌幅达到8%，需要事件后复核。系统会自动生成触发后的最新基本面评估，无需手工补研报。",
		checked_at: now,
		valid_until: "2026-10-28T13:43:00+08:00",
		quote: { price: 250.45, prev_close: 237.59, as_of: "20261028134100", source: "tencent_qtimg" },
		review_v2: { pending: true, triggered_at: "2026-10-26 10:15:00", reasons: ["当日跌幅达到8%，需要事件后复核"] },
		market_emotion: { allowed: true, label: "当日情绪适合解套", reason: "当天情绪中性、风险中，允许按个股价格与趋势条件生成解套策略。" },
		invalid_conditions: ["突破354.55取消卖出", "跌破224.01暂停买回", "报价超过120秒、停牌/盘口缺失、持仓变化或收市后失效"],
	},
	events: [],
} as unknown as UnwindExecution;

afterEach(cleanup);

describe("focused unwind status", () => {
	it("shows one current conclusion and dates the old review event", () => {
		render(<ExecutionStatus data={waiting} currency="¥" stockCode="300502" stockName="新易盛" />);
		expect(screen.getByText("现在：暂不操作")).toBeInTheDocument();
		expect(screen.getByText("10月26日触发的跌幅复核尚未完成")).toBeInTheDocument();
		expect(screen.getByText(/报价 ¥250.45 · 13:41:00/)).toBeInTheDocument();
		expect(screen.queryByText("当前操作股数")).not.toBeInTheDocument();
		expect(screen.queryByText("当前下单价格")).not.toBeInTheDocument();
		expect(screen.queryByText(/354.55|224.01|tencent_qtimg/)).not.toBeInTheDocument();
		expect(screen.queryByText(/当日跌幅达到8%/)).not.toBeInTheDocument();
	});
	it("explains structural prices on request and distinguishes unreachable upper from reachable lower", () => {
		render(<ExecutionStatus data={waiting} currency="¥" stockCode="300502" stockName="新易盛" />);
		fireEvent.click(screen.getByText("复核与价位依据（卖出观察价超出今日常规范围）"));
		expect(screen.getByText(/结构取消卖出线 ¥354.55/)).toBeInTheDocument();
		expect(screen.getByText(/结构暂停买回线 ¥224.01/)).toBeInTheDocument();
		expect(screen.getByText(/10日最高价 ¥348.50.*0.25.*24.1621/)).toBeInTheDocument();
		expect(screen.getByText(/10日最低价 ¥236.10.*0.5.*24.1621/)).toBeInTheDocument();
		expect(screen.getByText(/今日范围为¥190.07—¥285.11/)).toBeInTheDocument();
		expect(screen.getByText(/在今日常规涨跌幅范围内；用于重新评估下行风险/)).toBeInTheDocument();
		expect(screen.getByText(/原始触发说明（2026-10-26 10:15:00）/)).toBeInTheDocument();
	});
	it("does not invent a daily band for HK, special listings, missing history or mismatched previous close", () => {
		const stamp = executionTime(now);
		expect(regularPriceBand(waiting, "300502", "新易盛", stamp)?.upper).toBe(285.11);
		for (const name of ["N新股", "C新股", "*ST样本"])
			expect(regularPriceBand(waiting, "300502", name, stamp)).toBeUndefined();
		expect(regularPriceBand({ ...waiting, plan: { ...waiting.plan!, market: "hk" } }, "00700", "腾讯控股", stamp)).toBeUndefined();
		expect(regularPriceBand({ ...waiting, signal: { ...waiting.signal, quote: { ...waiting.signal.quote, prev_close: 200 } } }, "300502", "新易盛", stamp)).toBeUndefined();
		expect(regularPriceBand(waiting, "300502", "新易盛", stamp + 86400000)).toBeUndefined();
		expect(priceRangeNote(224.01, regularPriceBand(waiting, "300502", "新易盛", stamp))).toBe("在今日常规涨跌幅范围内");
	});
	it("formats exchange timestamps and never presents an incomplete order as executable", () => {
		expect(beijingClock("20261028134100", true)).toBe("2026-10-28 13:41:00");
		expect(beijingClock("2026-10-28T05:41:00Z")).toBe("13:41:00");
		expect(beijingClock("invalid")).toBe("未取得");
		expect(executionSummary({ ...waiting.signal, action: "SELL", shares: 0, limit_price: 250 }, executionTime(now)).executable).toBe(false);
		expect(executionSummary({ ...waiting.signal, action: "SELL", shares: 100, limit_price: null }, executionTime(now)).executable).toBe(false);
	});
});
