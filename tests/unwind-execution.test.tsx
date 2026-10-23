import type { UnwindExecution, UnwindPlan } from "#src/api/strategy";
import { fetchUnwindPlans, recordUnwindTrade, refreshUnwindPlans } from "#src/api/strategy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import UnwindTrackingPanel from "../src/components/UnwindTrackingPanel";
import { effectiveSignal } from "../src/components/UnwindTrackingPanel/execution-signal";
import ExecutionStatus from "../src/components/UnwindTrackingPanel/ExecutionStatus";

const at = "2026-10-15T10:10:00+08:00";
vi.mock("#src/api/strategy", () => ({ fetchUnwindPlans: vi.fn(), recordUnwindTrade: vi.fn(), refreshUnwindPlans: vi.fn(), refreshUnwindExecution: vi.fn() }));
const fixture: UnwindExecution = {
	server_time: at,
	signal: { action: "SELL", label: "卖出", reason: "两次行情已确认", phase: "intraday", shares: 200, limit_price: 11, checked_at: at, valid_until: "2026-10-15T10:12:00+08:00", quote: { price: 11.1, as_of: at, source: "fixture" }, invalid_conditions: ["突破11.5取消卖出"] },
	events: [],
};
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("unwind execution status", () => {
	it("uses the frozen plan lot and core floor in the actual-fill form", async () => {
		const analysis = { lot_size: 100, core_floor_shares: 300, sell_shares: 100, decision: "WAIT", technical: { current_price: 10 }, deep_analysis: { trend: "震荡", location: "测试压力区", momentum: "测试动能", volume: "测试量能", position: "保留底仓" }, execution_steps: [] };
		const item = { id: 1, watchlist_id: 1, stock_code: "688017", stock_name: "测试科创", baseline_cost_price: 20, effective_cost: 20, baseline_shares: 1000, current_shares: 1000, cash_pool: 0, cumulative_cost_reduction: 0, open_sold_shares: 0, latest_analysis: analysis, trades: [], analysis_history: [], execution: { ...fixture, plan: { ...analysis, trading_date: "2026-10-15", basis_date: "2026-10-14", lot_size: 200, core_floor_shares: 800, sell_shares: 200, position_mode: "TWO_LOT_HALF_ROTATION" } } } as unknown as UnwindPlan;
		vi.mocked(fetchUnwindPlans).mockResolvedValue({ status: "success", data: { items: [item], total: 1, method: { name: "测试规则", capital_rule: "", position_rule: "", trend_rule: "", risk_notice: "", schedule: "" } } });
		vi.mocked(refreshUnwindPlans).mockResolvedValue({ status: "success", data: { generated: [], errors: [], total: 0 }, message: "已读取" });
		render(<UnwindTrackingPanel />);
		fireEvent.click(await screen.findByRole("button", { name: "记录卖出" }));
		fireEvent.click(screen.getByRole("radio", { name: "做T卖出，准备接回" }));
		expect(screen.getByText("只记录已经实际成交的卖单；系统将至少保留800股。")).toBeInTheDocument();
		expect(screen.getByRole("spinbutton", { name: /实际成交股数/ })).toHaveValue("200");
		expect(recordUnwindTrade).not.toHaveBeenCalled();
	});
	it("shows executable price and shares, then withdraws an expired instruction", () => {
		expect(effectiveSignal(fixture, Date.parse(at)).action).toBe("SELL");
		const stale = effectiveSignal(fixture, Date.parse(at) + 121000);
		expect(stale.action).toBe("WAIT");
		expect(stale.shares).toBe(0);
		expect(stale.limit_price).toBeNull();
	});
	it("never displays a buyback action in a closed session or without a result", () => {
		expect(effectiveSignal({ ...fixture, signal: { ...fixture.signal, action: "BUY_BACK", phase: "closed" } }, Date.parse(at)).action).toBe("WAIT");
		expect(effectiveSignal(undefined, Date.parse(at)).action).toBe("WAIT");
	});
	it("renders current instruction separately from the historical review", () => {
		render(<ExecutionStatus data={fixture} currency="¥" />);
		expect(screen.getByText("现在：卖出")).toBeInTheDocument();
		expect(screen.getByText("卖出限价（不低于）")).toBeInTheDocument();
		expect(screen.getByText("¥11.000")).toBeInTheDocument();
		expect(screen.getByText(/突破11.5取消卖出/)).toBeInTheDocument();
		expect(screen.getByText("盘后实际成交复盘")).toBeInTheDocument();
	});
	it("expires on screen even when polling stops, using server time despite client clock skew", async () => {
		vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance", "Date"] });
		vi.setSystemTime(new Date("2030-01-01"));
		render(<ExecutionStatus data={fixture} currency="¥" />);
		expect(screen.getByText("现在：卖出")).toBeInTheDocument();
		await act(async () => vi.advanceTimersByTime(121000));
		expect(screen.getByText("现在：等待")).toBeInTheDocument();
		expect(screen.queryByText("¥11.000")).not.toBeInTheDocument();
	});
});
