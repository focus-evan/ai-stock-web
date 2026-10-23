import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfigProvider, message } from "antd";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUnwindPlans, refreshUnwindPlans } from "../src/api/strategy";
import { recordUnwindTradeExt } from "../src/api/strategy/unwind-extra";
import UnwindTrackingPanel from "../src/components/UnwindTrackingPanel";

vi.mock("#src/api/strategy", () => ({ fetchUnwindPlans: vi.fn(), refreshUnwindPlans: vi.fn(), refreshUnwindExecution: vi.fn() }));
vi.mock("#src/api/strategy/unwind-extra", () => ({ recordUnwindTradeExt: vi.fn() }));
vi.mock("../src/components/UnwindTrackingPanel/PriceMonitor", () => ({ default: () => null }));
let currentPlan: any;

beforeEach(() => {
	vi.spyOn(message, "success").mockImplementation(() => (() => {}) as any);
	const analysis = { lot_size: 100, sell_shares: 0, decision: "WAIT", technical: { current_price: 268 }, deep_analysis: { trend: "震荡", location: "测试压力区", momentum: "测试动能", volume: "测试量能", position: "保留底仓" }, execution_steps: [] };
	const item = { id: 37, watchlist_id: 52, stock_code: "300502", stock_name: "新易盛", baseline_cost_price: 520, effective_cost: 520, baseline_shares: 1060, current_shares: 1060, cash_pool: 0, cumulative_cost_reduction: 0, open_sold_shares: 0, latest_analysis: analysis, trades: [], analysis_history: [], settings: { add_budget: 0 }, add_summary: { add_remaining: 0 } };
	currentPlan = item;
	vi.mocked(fetchUnwindPlans).mockResolvedValue({ status: "success", data: { items: [item], total: 1, method: { name: "测试规则", capital_rule: "", position_rule: "", trend_rule: "", risk_notice: "", schedule: "" } } } as any);
	vi.mocked(refreshUnwindPlans).mockResolvedValue({ status: "success", data: { generated: [], errors: [], total: 0 }, message: "已读取" });
});

describe("one sell entry and reconciled costs", () => {
	it("uses one sell button and defaults to a reduction without a buyback", async () => {
		vi.mocked(recordUnwindTradeExt).mockResolvedValue({ status: "success", data: { trade_id: 99, account: {} }, message: "已记录" } as any);
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录卖出" }));
		expect(screen.queryByRole("button", { name: "记录减仓" })).toBeNull();
		expect(screen.queryByRole("button", { name: "录入已成交卖出" })).toBeNull();
		expect(screen.getByRole("radio", { name: "减仓，不接回" })).toBeChecked();
		fireEvent.click(screen.getByRole("button", { name: "确认记录" }));
		await waitFor(() => expect(recordUnwindTradeExt).toHaveBeenCalledWith(52, expect.objectContaining({ side: "reduce", shares: 100, expected_last_trade_id: 0, confirm_duplicate: false })));
	}, 15000);

	it("requires an explicit choice for a sell intended for a later buyback", async () => {
		vi.mocked(recordUnwindTradeExt).mockResolvedValue({ status: "success", data: { trade_id: 99, account: {} } } as any);
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录卖出" }));
		fireEvent.click(screen.getByRole("radio", { name: "做T卖出，准备接回" }));
		fireEvent.click(screen.getByRole("button", { name: "确认记录" }));
		await waitFor(() => expect(recordUnwindTradeExt).toHaveBeenCalledWith(52, expect.objectContaining({ side: "sell", expected_last_trade_id: 0 })));
	}, 15000);

	it("blocks a duplicate until the user confirms a separate broker fill", async () => {
		currentPlan.trades = [{ id: 8, side: "reduce", shares: 100, price: 12, fees: 0, trade_date: dayjs().format("YYYY-MM-DD") }];
		vi.mocked(recordUnwindTradeExt).mockRejectedValueOnce({ response: new Response(JSON.stringify({ code: "duplicate_trade", detail: "这笔卖出已登记", message: "这笔卖出已登记" }), { status: 409 }) }).mockResolvedValue({ status: "success", data: { trade_id: 9, account: {} } } as any);
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录卖出" }));
		fireEvent.click(screen.getByRole("button", { name: "确认记录" }));
		const confirmation = await screen.findByRole("checkbox", { name: /这是另一笔独立成交/ });
		expect(screen.getByRole("button", { name: "确认记录" })).toBeDisabled();
		expect(recordUnwindTradeExt).toHaveBeenCalledTimes(1);
		fireEvent.click(confirmation);
		fireEvent.click(screen.getByRole("button", { name: "确认登记另一笔" }));
		await waitFor(() => expect(recordUnwindTradeExt).toHaveBeenLastCalledWith(52, expect.objectContaining({ confirm_duplicate: true, expected_last_trade_id: 8 })));
	}, 15000);

	it("prevents a fast double click from submitting two fills", async () => {
		let finish!: (value: any) => void;
		vi.mocked(recordUnwindTradeExt).mockReturnValue(new Promise((resolve) => {
			finish = resolve;
		}));
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录卖出" }));
		const submit = screen.getByRole("button", { name: "确认记录" });
		fireEvent.click(submit);
		fireEvent.click(submit);
		await waitFor(() => expect(recordUnwindTradeExt).toHaveBeenCalledTimes(1));
		finish({ status: "success", data: { trade_id: 99, account: {} } });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	}, 15000);

	it("shows total breakeven separately and recalculates the cost percentage after fills", async () => {
		Object.assign(currentPlan, { baseline_cost_price: 10, effective_cost: 10, recovery: { available: true, remaining_breakeven_price: 14.0123 } });
		currentPlan.latest_analysis.technical.current_price = 8;
		currentPlan.latest_analysis.pnl_pct = -90;
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		const cost = await screen.findByText("整体回本价（含已实现盈亏）");
		expect(cost.closest(".ant-statistic")).toHaveTextContent("14.01");
		expect(screen.getByText("剩余持仓均价").closest(".ant-statistic")).toHaveTextContent("10.00");
		expect(screen.getByText("较策略参考成本").closest(".ant-statistic")).toHaveTextContent("-20.00");
		expect(screen.getByText("较策略参考成本").closest(".ant-statistic")).not.toHaveTextContent("-90");
	}, 15000);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.clearAllMocks();
});

describe("actual add trade recording", () => {
	it("records yesterday's fill without opening budget or funding settings", async () => {
		vi.mocked(recordUnwindTradeExt).mockResolvedValue({ status: "success", data: { trade_id: 99, account: {} }, message: "补仓成交已记录" } as any);
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录补仓" }));
		expect(screen.getByText(/无需先配置预算或确认今日资金/)).toBeInTheDocument();
		expect(screen.queryByText(/该股补仓预算剩余/)).toBeNull();
		const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
		fireEvent.change(screen.getByRole("textbox", { name: /成交日期/ }), { target: { value: yesterday } });
		fireEvent.click(screen.getByRole("button", { name: "确认记录" }));
		await waitFor(() => expect(recordUnwindTradeExt).toHaveBeenCalledWith(52, expect.objectContaining({ side: "add", shares: 100, price: 268, fees: 0, trade_date: yesterday })));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	}, 15000);

	it("keeps the form and displays the backend reason when the ledger rejects a fill", async () => {
		const showError = vi.spyOn(message, "error").mockImplementation(() => (() => {}) as any);
		const reason = "请按成交日期顺序登记，早于现有成交的历史补录需先核对账本";
		vi.mocked(recordUnwindTradeExt).mockRejectedValue({ response: new Response(JSON.stringify({ detail: reason }), { status: 400 }) });
		render(<ConfigProvider theme={{ token: { motion: false } }}><UnwindTrackingPanel /></ConfigProvider>);
		fireEvent.click(await screen.findByRole("button", { name: "记录补仓" }));
		fireEvent.click(screen.getByRole("button", { name: "确认记录" }));
		await waitFor(() => expect(showError).toHaveBeenCalledWith(reason));
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	}, 15000);
});
