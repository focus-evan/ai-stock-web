import type { StrategyBuyAlert, TodayStrategyBuys } from "#src/api/strategy";
import { fetchStrategyBuysByDate, fetchTodayStrategyBuys } from "#src/api/strategy";
import { useUserStore } from "#src/store/user";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ShortTermTradeAlerts from "../src/components/short-term-trade-alerts";

vi.mock("#src/api/strategy", () => ({ fetchTodayStrategyBuys: vi.fn(), fetchStrategyBuysByDate: vi.fn(), fetchStrategyTradeJournal: vi.fn() }));
const fetchBuys = vi.mocked(fetchTodayStrategyBuys);
const fetchHistory = vi.mocked(fetchStrategyBuysByDate);
let client: QueryClient;
const day = "2026-09-16";
function item(id = 1): StrategyBuyAlert {
	return {
		trade_id: id,
		portfolio_id: 41,
		portfolio_name: "模拟组合",
		strategy_type: "event_driven",
		stock_code: "688001",
		stock_name: `股票${id}`,
		buy_date: day,
		bought_at: `${day} 10:00:00`,
		buy_price: 10.125,
		buy_quantity: 201,
		buy_lots: 2.01,
		buy_reason: "事件催化，成交盘口确认",
		verification_status: "verified",
		verification_issue: null,
		follow: {
			status: "consider",
			label: "可考虑跟投",
			reasons: ["价格、战法综合表现与风控通过"],
			assessed_at: `${day}T10:00:00+08:00`,
			expires_at: `${day}T10:00:30+08:00`,
			signal_at: null,
			quote_at: null,
			current_price: null,
			entry_price: null,
			price_change_from_buy_pct: null,
			entry_zone_low: null,
			entry_zone_high: null,
			target_price: null,
			stop_loss_price: null,
			risk_reward_ratio: null,
			strategy_performance: { strategy_family: "catalyst", settlement_label: "第5个交易日收盘", entry_buffer_pct: 1.4, min_risk_reward_ratio: 1.1, sample_count: 120, forward_sample_count: 80, win_rate_pct: 62.5, win_rate_ci95_pct: [53.6, 70.7], break_even_win_rate_pct: 40, win_rate_edge_pct: 22.5, win_rate_gate_passed: true, recent_sample_count: 10, recent_win_rate_pct: 70, avg_return_pct: 1.5, estimated_net_avg_return_pct: 1.25, profit_factor: 1.5, quality_score: 72.5, confidence_level: "high", trust_status: "trusted", trust_score: 86, trust_reason: "已通过可信跟投硬门槛", trust_failures: [], follow_allowed: true },
		},
	};
}
function response(items: StrategyBuyAlert[] = [], trading_date = day) {
	const data: TodayStrategyBuys = { items, total: items.length, trading_date, as_of: `${day}T10:00:00+08:00`, warnings: [], strategy_count: 14 };
	return { status: "success", data };
}
function mount() {
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={client}><ShortTermTradeAlerts pathname="/home" /></QueryClientProvider>);
}
async function tick(ms = 100) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(`${day}T02:00:00Z`));
	vi.clearAllMocks();
	useUserStore.setState({ id: "7" });
	fetchBuys.mockResolvedValue(response());
	fetchHistory.mockReset();
	fetchHistory.mockResolvedValue(response([], "2026-09-15"));
});
afterEach(() => {
	cleanup();
	client?.clear();
	vi.useRealTimers();
});
it("highlights any strategy with original price, fractional lots, shares and reason", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	mount();
	await tick();
	expect(screen.getByText("今日模拟买入 · 1 笔 · 1 个战法")).toBeInTheDocument();
	expect(screen.getByText("事件驱动 · 股票1（688001）")).toBeInTheDocument();
	expect(screen.getByText("买入 2.01 手（201 股）")).toBeInTheDocument();
	expect(screen.getByText("买入价格 ¥10.1250")).toHaveStyle({ color: "#cf1322", fontWeight: "800" });
	expect(screen.getByText("事件催化，成交盘口确认")).toBeInTheDocument();
	expect(screen.getByText(/事件催化 · 第5个交易日收盘 · 最大追价 1.40% · 最低盈亏比 1.10/)).toBeInTheDocument();
	expect(screen.getByText("固定周期胜率 62.50% · 近10笔胜率 70.00% · 综合质量分 72.5")).toBeInTheDocument();
	expect(screen.getByText("该战法保本胜率 40.00% · 胜率安全边际 +22.50个百分点")).toBeInTheDocument();
	expect(screen.getByText(/成熟样本 120 笔（前向 80 笔） · 胜率95%区间 53.6%–70.7%/)).toBeInTheDocument();
	expect(screen.getByText("可考虑跟投")).toBeInTheDocument();
});
it("finds new buys on the next poll and preserves each fill", async () => {
	mount();
	await tick();
	expect(screen.getByText("全部14个战法 · 今日暂无模拟买入")).toBeInTheDocument();
	const second = { ...item(2), buy_price: 10.2, buy_reason: "第二笔确认" };
	fetchBuys.mockResolvedValue(response([item(), second]));
	await tick(15000);
	expect(screen.getByText("今日模拟买入 · 2 笔 · 1 个战法")).toBeInTheDocument();
	expect(screen.getByText("买入价格 ¥10.2000")).toBeInTheDocument();
	expect(screen.getByText("第二笔确认")).toBeInTheDocument();
});
it("expires a positive verdict even when polling returns the same old assessment", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	mount();
	await tick(31100);
	expect(screen.queryByText("可考虑跟投")).not.toBeInTheDocument();
	expect(screen.getByText("等待刷新确认")).toBeInTheDocument();
	expect(screen.getByText("买入价格 ¥10.1250")).toBeInTheDocument();
});
it("retains fills but disables follow on a refresh failure", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	mount();
	await tick();
	fetchBuys.mockRejectedValue(new Error("offline"));
	await tick(15000);
	expect(screen.getByText("今日买入更新失败")).toBeInTheDocument();
	expect(screen.getByText("买入价格 ¥10.1250")).toBeInTheDocument();
	expect(screen.queryByText("可考虑跟投")).not.toBeInTheDocument();
});
it("does not describe unavailable data as no trades", async () => {
	fetchBuys.mockRejectedValue(new Error("unavailable"));
	mount();
	await tick();
	expect(screen.getByText("今日模拟买入检查未完成")).toBeInTheDocument();
	expect(screen.queryByText("全部14个战法 · 今日暂无模拟买入")).not.toBeInTheDocument();
});
it("rejects yesterday's data and removes buys at Beijing midnight", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	mount();
	await tick();
	vi.setSystemTime(new Date("2026-09-16T16:00:01Z"));
	await tick(1100);
	await tick();
	expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument();
	expect(screen.getByText("服务器与本地日期不一致，请校准时间后刷新。")).toBeInTheDocument();
});
it("shows unknown original fields without substituting recommendation prices", async () => {
	fetchBuys.mockResolvedValue(response([{ ...item(), buy_price: null, buy_quantity: null, buy_lots: null, buy_reason: null, verification_status: "unverified", follow: { ...item().follow, status: "unknown", label: "暂无法判断" } }]));
	mount();
	await tick();
	expect(screen.getByText("买入价格 未记录")).toBeInTheDocument();
	expect(screen.getByText("买入 未记录")).toBeInTheDocument();
	expect(screen.getByText("成交数据待核验")).toBeInTheDocument();
});
it("clears old owner data on account change and logout", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	mount();
	await tick();
	fetchBuys.mockResolvedValue(response());
	await act(async () => {
		useUserStore.setState({ id: "8" });
	});
	await tick();
	expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument();
	await act(async () => {
		useUserStore.setState({ id: "" });
	});
	expect(screen.queryByLabelText("全部战法今日模拟买入")).not.toBeInTheDocument();
});

it("queries a historical date with each strategy's price, shares and reason and no current follow verdict", async () => {
	fetchBuys.mockResolvedValue(response([item()]));
	const historical = { ...item(2), buy_date: "2026-09-15", bought_at: "2026-09-15 09:50:00", buy_price: 8.75, buy_quantity: 8700, buy_reason: "历史成交原因" };
	fetchHistory.mockResolvedValue(response([historical, { ...historical, trade_id: 3, strategy_type: "a_share_leader_tactics", stock_name: "历史龙头" }], "2026-09-15"));
	mount();
	await tick();
	expect(screen.getByLabelText("查询买入日期")).toHaveValue(day);
	fireEvent.click(screen.getByRole("button", { name: "前一天" }));
	await tick();
	expect(fetchHistory).toHaveBeenCalledWith("2026-09-15", expect.any(AbortSignal));
	expect(screen.getByText("2026-09-15 模拟买入 · 2 笔 · 2 个战法")).toBeInTheDocument();
	expect(screen.getAllByText("买入价格 ¥8.7500")).toHaveLength(2);
	expect(screen.getAllByText("买入 87 手（8,700 股）")).toHaveLength(2);
	expect(screen.getAllByText("历史成交原因")).toHaveLength(2);
	expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument();
	expect(screen.queryByText("可考虑跟投")).not.toBeInTheDocument();
	expect(screen.queryByText("是否值得跟投：")).not.toBeInTheDocument();
	await tick(30000);
	expect(fetchHistory).toHaveBeenCalledTimes(1);
});

it("returns to today and resumes live updates", async () => {
	mount();
	await tick();
	expect(screen.getByRole("button", { name: "后一天" })).toBeDisabled();
	fireEvent.click(screen.getByRole("button", { name: "前一天" }));
	await tick();
	expect(screen.getByText("全部14个战法 · 2026-09-15 暂无模拟买入")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "回到今天" }));
	await tick();
	expect(screen.getByLabelText("查询买入日期")).toHaveValue(day);
	const calls = fetchBuys.mock.calls.length;
	await tick(15000);
	expect(fetchBuys.mock.calls.length).toBeGreaterThan(calls);
});

it("does not show an old date's late response after selecting another date", async () => {
	let resolveOld: (value: ReturnType<typeof response>) => void = () => {};
	fetchHistory.mockImplementationOnce(() => new Promise((resolve) => {
		resolveOld = resolve;
	}));
	fetchHistory.mockResolvedValueOnce(response([], "2026-09-14"));
	mount();
	await tick();
	fireEvent.click(screen.getByRole("button", { name: "前一天" }));
	await tick();
	fireEvent.click(screen.getByRole("button", { name: "前一天" }));
	await tick();
	await act(async () => resolveOld(response([{ ...item(), buy_date: "2026-09-15" }], "2026-09-15")));
	await tick();
	expect(screen.getByLabelText("查询买入日期")).toHaveValue("2026-09-14");
	expect(screen.getByText("全部14个战法 · 2026-09-14 暂无模拟买入")).toBeInTheDocument();
	expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument();
});

it("shows historical query failures distinctly from an empty date", async () => {
	fetchHistory.mockRejectedValue(new Error("offline"));
	mount();
	await tick();
	fireEvent.click(screen.getByRole("button", { name: "前一天" }));
	await tick();
	expect(screen.getByText("历史买入查询失败")).toBeInTheDocument();
	expect(screen.queryByText("全部14个战法 · 2026-09-15 暂无模拟买入")).not.toBeInTheDocument();
});
