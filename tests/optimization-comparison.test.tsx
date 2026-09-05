import type { OptimizationBatch, OptimizationComparison, OptimizationMetrics, OptimizationSide } from "../src/api/portfolio/optimization";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOptimizationBatch, fetchOptimizationBatches, fetchOptimizationComparison } from "../src/api/portfolio/optimization";
import OptimizationComparisonPanel from "../src/components/optimization-comparison";

vi.mock("#src/api/portfolio/optimization", () => ({
	createOptimizationBatch: vi.fn(),
	fetchOptimizationBatches: vi.fn(),
	fetchOptimizationComparison: vi.fn(),
}));

const batch: OptimizationBatch = {
	id: 1,
	release_key: "quality-20260905",
	name: "交易质量优化",
	description: "修复成交和费用证据",
	effective_at: "2026-09-05 12:00:00",
	strategies: ["northbound"],
	backend_revision: "backend-sha",
	frontend_revision: "frontend-sha",
	created_at: "2026-09-05 12:00:00",
	rule_snapshot: { cost_pct: 0.25 },
};
const beforeMetrics: OptimizationMetrics = {
	sample_count: 4,
	win_count: 1,
	loss_count: 2,
	flat_count: 1,
	win_rate_pct: 25,
	avg_return_pct: -1.5,
	total_profit: -1200,
	profit_factor: 0.4,
	win_rate_ci95_pct: [4.5, 69.9],
};
const emptyMetrics: OptimizationMetrics = {
	sample_count: 0,
	win_count: 0,
	loss_count: 0,
	flat_count: 0,
	// Deliberately malformed zero metrics must never present a 0% win rate.
	win_rate_pct: 0,
	avg_return_pct: 0,
	total_profit: 0,
	profit_factor: 0,
	win_rate_ci95_pct: null,
};
function side(metrics: OptimizationMetrics, sessions: number): OptimizationSide {
	return {
		window: { start: sessions ? "2026-08-10" : null, end: sessions ? "2026-09-04" : null, session_count: sessions },
		trades: { closed_cycles: metrics.sample_count, excluded_cycles: 1, transition_cycles: 1, open_cycles: 1, recorded: metrics, normalized: metrics, verified: { ...emptyMetrics, win_rate_pct: null } },
		signals: { total_count: metrics.sample_count, mature_count: metrics.sample_count, forward_count: 0, excluded_reasons: { historical_reconstruction: 1 }, metrics },
	};
}
function comparison(name = "北向资金"): OptimizationComparison {
	return {
		batch,
		as_of: "2026-09-05 12:05:00",
		window_days: 20,
		methodology: ["仅作描述性比较，不能推断因果。"],
		rows: [{
			strategy_type: "northbound",
			strategy_name: name,
			before: side(beforeMetrics, 20),
			after: side(emptyMetrics, 0),
			deltas: { recorded_win_rate_pp: 0, normalized_win_rate_pp: 0, normalized_avg_return_pp: 0, verified_win_rate_pp: 0, signal_win_rate_pp: 0, signal_avg_return_pp: 0 },
			comparison_status: "collecting",
			notices: ["优化后尚无完整交易日"],
			account_periods: [],
			trade_details: { before: [], after: [], transition: [{
				cohort: "before",
				portfolio_id: 22,
				stock_code: "600001",
				stock_name: "跨版本持仓示例",
				entry_at: "2026-09-04 14:00:00",
				exit_at: null,
				status: "open",
				buy_count: 1,
				sell_count: 0,
				gross_profit: 0,
				normalized_profit: null,
				net_profit: null,
				return_pct: null,
				verified: false,
				issues: ["入场早于优化分界，未平仓"],
			}] },
		}],
	};
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchOptimizationBatches).mockResolvedValue({ status: "success", data: { batches: [batch], schema_ready: true, strategy_options: [{ value: "northbound", label: "北向资金" }] } });
	vi.mocked(fetchOptimizationComparison).mockResolvedValue({ status: "success", data: comparison() });
});
afterEach(cleanup);

async function chooseWindow(label: string) {
	fireEvent.mouseDown(screen.getByRole("combobox", { name: "对比交易日窗口" }));
	const option = await screen.findByText(label);
	await act(async () => {
		fireEvent.click(option);
	});
}

describe("major optimization comparison", () => {
	it("retains the losing baseline, guards empty rates, and separates transitional holdings", async () => {
		render(<OptimizationComparisonPanel />);
		expect(await screen.findByText("北向资金")).toBeInTheDocument();
		expect(screen.getByText("样本积累中")).toBeInTheDocument();
		expect(screen.queryByText(/0\.00%/)).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Expand row" }));
		expect(await screen.findByText("样本仍在积累，暂不判断优化效果")).toBeInTheDocument();
		expect(screen.getAllByText("1胜 / 2负 / 1平 · 4轮次").length).toBe(2);
		expect(screen.getAllByText("-1.50% → 未验证").length).toBeGreaterThan(0);
		fireEvent.click(screen.getByRole("tab", { name: "跨版本 / 过渡（1）" }));
		expect(await screen.findByText("跨版本持仓示例 600001")).toBeInTheDocument();
		expect(screen.getByText("未平仓 · 不计胜率")).toBeInTheDocument();
		expect(screen.getByText("优化前版本")).toBeInTheDocument();
		expect(screen.getByText(/按入场版本保留归属/)).toBeInTheDocument();
	});

	it("ignores a late comparison response after the window changes", async () => {
		let finishOld!: (value: Awaited<ReturnType<typeof fetchOptimizationComparison>>) => void;
		vi.mocked(fetchOptimizationComparison).mockImplementationOnce(() => new Promise((resolve) => {
			finishOld = resolve;
		}));
		vi.mocked(fetchOptimizationComparison).mockResolvedValueOnce({ status: "success", data: { ...comparison("最新40日结果"), window_days: 40 } });
		render(<OptimizationComparisonPanel />);
		await waitFor(() => expect(fetchOptimizationComparison).toHaveBeenCalledTimes(1));
		const oldSignal = vi.mocked(fetchOptimizationComparison).mock.calls[0][3];
		await chooseWindow("40个交易日窗口");
		expect(await screen.findByText("最新40日结果")).toBeInTheDocument();
		expect(oldSignal?.aborted).toBe(true);
		await act(async () => {
			finishOld({ status: "success", data: comparison("已过期20日结果") });
		});
		expect(screen.queryByText("已过期20日结果")).not.toBeInTheDocument();
		expect(fetchOptimizationComparison).toHaveBeenLastCalledWith(1, 40, undefined, expect.any(AbortSignal));
	});

	it("clears stale performance after a failed filter request", async () => {
		vi.mocked(fetchOptimizationComparison).mockResolvedValueOnce({ status: "success", data: comparison("旧筛选结果") }).mockRejectedValueOnce(new Error("request failed"));
		render(<OptimizationComparisonPanel />);
		expect(await screen.findByText("旧筛选结果")).toBeInTheDocument();
		await chooseWindow("60个交易日窗口");
		expect(await screen.findByText(/前后对比加载失败/)).toBeInTheDocument();
		expect(screen.queryByText("旧筛选结果")).not.toBeInTheDocument();
	});

	it("preserves the registration form when the immutable batch key conflicts", async () => {
		vi.mocked(createOptimizationBatch).mockRejectedValue({ response: { status: 409 } });
		render(<OptimizationComparisonPanel />);
		await screen.findByText("北向资金");
		fireEvent.click(screen.getByRole("button", { name: "登记重大优化" }));
		const dialog = await screen.findByRole("dialog");
		fireEvent.change(within(dialog).getByLabelText("批次名称"), { target: { value: "重大修订" } });
		fireEvent.change(within(dialog).getByLabelText("唯一批次标识"), { target: { value: "quality-20260905" } });
		fireEvent.click(within(dialog).getByRole("button", { name: "登记并开始跟踪" }));
		expect(await screen.findByText(/该批次标识已存在且内容不同/)).toBeInTheDocument();
		expect(within(dialog).getByLabelText("批次名称")).toHaveValue("重大修订");
		expect(createOptimizationBatch).toHaveBeenCalledWith({ name: "重大修订", release_key: "quality-20260905" });
	});

	it("selects the registered batch even if the following list refresh fails", async () => {
		const nextBatch = { ...batch, id: 2, name: "第二次优化", release_key: "quality-next" };
		vi.mocked(fetchOptimizationBatches)
			.mockResolvedValueOnce({ status: "success", data: { batches: [batch], schema_ready: true, strategy_options: [] } })
			.mockRejectedValue(new Error("list refresh failed"));
		vi.mocked(fetchOptimizationComparison).mockImplementation(async batchId => ({ status: "success", data: { ...comparison(), batch: batchId === 2 ? nextBatch : batch } }));
		vi.mocked(createOptimizationBatch).mockResolvedValue({ status: "success", data: { batch: nextBatch, created: true } });
		render(<OptimizationComparisonPanel />);
		await screen.findByText("北向资金");
		fireEvent.click(screen.getByRole("button", { name: "登记重大优化" }));
		const dialog = await screen.findByRole("dialog");
		fireEvent.change(within(dialog).getByLabelText("批次名称"), { target: { value: "第二次优化" } });
		fireEvent.change(within(dialog).getByLabelText("唯一批次标识"), { target: { value: "quality-next" } });
		fireEvent.click(within(dialog).getByRole("button", { name: "登记并开始跟踪" }));
		expect(await screen.findByText(/重大优化批次已登记，后续按此批次/)).toBeInTheDocument();
		await waitFor(() => expect(fetchOptimizationComparison).toHaveBeenLastCalledWith(2, 20, undefined, expect.any(AbortSignal)));
		expect(screen.getByText("第二次优化")).toBeInTheDocument();
	});
});
