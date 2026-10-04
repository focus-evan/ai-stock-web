import type { DashboardData } from "../src/api/portfolio/dashboard";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboard } from "../src/api/portfolio";
import Home from "../src/pages/home";
import { dashboardFromResponse, filterStrategies, formatMetric, recommendationState } from "../src/pages/home/data";

vi.mock("#src/api/portfolio", () => ({ fetchDashboard: vi.fn() }));
function fixture(): DashboardData {
	return {
		overview: { total_asset: 102500, total_profit: 2500, total_profit_pct: 2.5, available_cash: 92500, portfolios_count: 1 },
		strategy_summary: [{ portfolio_id: 1, strategy_type: "dragon_head", name: "测试组合", total_asset: 102500, total_profit_pct: 2.5, auto_trade: 1, decision_status: "blocked", decision_reason: "等待数据恢复", positions_count: 1 }],
		positions: [{ portfolio_id: 1, strategy_type: "dragon_head", stock_code: "600001", stock_name: "测试股票", profit: 168, unrealized_pnl: 0 }],
		recent_trades: [{ id: 7, portfolio_id: 1, stock_code: "600001", strategy_type: "dragon_head", direction: "buy", price: 10, quantity: 100, trade_date: "2026-10-01" }],
		recommendations: {},
		data_quality: { quote_requested: 1, quote_received: 0, stored_price_positions: 1, recommendation_failures: [] },
	};
}
beforeEach(() => {
	vi.resetAllMocks();
});
afterEach(cleanup);
const open = () => render(<MemoryRouter initialEntries={["/home"]}><Home /></MemoryRouter>);

describe("workbench data semantics", () => {
	it("rejects application errors and malformed responses instead of inventing zero assets", () => {
		expect(() => dashboardFromResponse({ status: "error", data: fixture() })).toThrow();
		expect(() => dashboardFromResponse({ status: "success" })).toThrow();
		expect(formatMetric(null)).toBe("—");
		expect(formatMetric(Number.NaN)).toBe("—");
		expect(formatMetric(0)).toBe("0.00");
	});
	it("separates stale, missing, unavailable, unknown-time and current empty recommendations", () => {
		expect(recommendationState().label).toBe("尚未生成");
		expect(recommendationState({ availability: "missing" }).label).toBe("尚未生成");
		expect(recommendationState({ availability: "unavailable" }).label).toBe("数据待恢复");
		expect(recommendationState({ is_current_trading_date: false, stocks: [{ code: "600001" }] }).label).toBe("历史快照");
		expect(recommendationState([{ code: "600001" }]).label).toBe("时效待核验");
		expect(recommendationState({ is_current_trading_date: true, stocks: [] }).label).toBe("无合格信号");
	});
	it("searches portfolio names and strategy names within the selected status", () => {
		const rows = fixture().strategy_summary;
		expect(filterStrategies(rows, "测试", "attention")).toHaveLength(1);
		expect(filterStrategies(rows, "龙头", "holding")).toHaveLength(1);
		expect(filterStrategies(rows, "龙头", "paused")).toHaveLength(0);
	});
});

describe("workbench interactions", () => {
	it("shows a recoverable error without a fictitious zero-value account", async () => {
		vi.mocked(fetchDashboard).mockResolvedValue({ status: "error", data: fixture() });
		open();
		expect(await screen.findByText("工作台数据更新失败")).toBeVisible();
		expect(screen.queryByText("模拟总资产")).not.toBeInTheDocument();
		vi.mocked(fetchDashboard).mockResolvedValue({ status: "success", data: fixture() });
		fireEvent.click(screen.getByRole("button", { name: "重试" }));
		expect(await screen.findByText("模拟总资产")).toBeVisible();
	});
	it("preserves the last valid snapshot on refresh failure", async () => {
		vi.mocked(fetchDashboard).mockResolvedValueOnce({ status: "success", data: fixture() }).mockRejectedValueOnce(new Error("offline"));
		open();
		await screen.findByText("模拟总资产");
		fireEvent.click(screen.getByRole("button", { name: "刷新数据" }));
		expect(await screen.findByText(/当前保留上次成功读取/)).toBeVisible();
		expect(screen.getAllByText("102,500.00").length).toBeGreaterThan(0);
	});
	it("shows actual position profit and uses the API direction for a buy", async () => {
		vi.mocked(fetchDashboard).mockResolvedValue({ status: "success", data: fixture() });
		open();
		await screen.findByText("模拟总资产");
		fireEvent.click(screen.getByRole("tab", { name: /持仓明细/ }));
		expect(await screen.findByText("+168.00")).toBeVisible();
		fireEvent.click(screen.getByRole("tab", { name: "最近成交" }));
		await waitFor(() => expect(within(screen.getByRole("tabpanel", { name: "最近成交" })).getByText("买入")).toBeVisible());
	});
});
