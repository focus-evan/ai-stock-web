import type { StrategyBuyAlert, TodayStrategyBuys } from "#src/api/strategy";
import { fetchTodayStrategyBuys } from "#src/api/strategy";
import { useUserStore } from "#src/store/user";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ShortTermTradeAlerts from "../src/components/short-term-trade-alerts";

vi.mock("#src/api/strategy", () => ({ fetchTodayStrategyBuys: vi.fn(), fetchStrategyTradeJournal: vi.fn() }));
const fetchBuys = vi.mocked(fetchTodayStrategyBuys);
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
		follow: { status: "consider", label: "可考虑跟投", reasons: ["价格与风控通过"], assessed_at: `${day}T10:00:00+08:00`, expires_at: `${day}T10:00:30+08:00`, signal_at: null, quote_at: null, current_price: null, entry_price: null, price_change_from_buy_pct: null, entry_zone_low: null, entry_zone_high: null, target_price: null, stop_loss_price: null, risk_reward_ratio: null },
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
