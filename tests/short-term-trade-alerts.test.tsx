import type { StrategyTradeCycle } from "#src/api/strategy";
import { fetchStrategyTradeJournal } from "#src/api/strategy";
import { useUserStore } from "#src/store/user";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ShortTermTradeAlerts from "../src/components/short-term-trade-alerts";
import { beijingTradeDate, loadTacticTradeCycles, SHORT_TERM_TACTICS, todayTradeAlerts } from "../src/components/short-term-trade-alerts/data";

vi.mock("#src/api/strategy", () => ({ fetchStrategyTradeJournal: vi.fn() }));
const fetchJournal = vi.mocked(fetchStrategyTradeJournal);
let clients: QueryClient[] = [];
const day = "2026-09-10";
function cycle(id = 1): StrategyTradeCycle {
	return {
		id: `41:000019:${id}`,
		portfolio_id: 41,
		portfolio_name: "模拟组合",
		portfolio_status: "active",
		stock_code: "000019",
		stock_name: `股票${id}`,
		status: "holding",
		buy_date: day,
		buy_price: 10.125,
		buy_quantity: 1000,
		buy_reason: "回封成交",
		sell_date: null,
		sell_price: null,
		sell_quantity: 0,
		sell_reason: null,
		buy_count: 1,
		sell_count: 0,
		remaining_quantity: 1000,
		issues: [],
		verification_status: "verified",
		verification_issues: [],
		performance_eligible: true,
		executions: [{ trade_id: id, direction: "buy", date: day, price: 10.125, quantity: 1000, reason: "回封成交", verification_status: "verified", verification_issue: null }],
	};
}
function response(items: StrategyTradeCycle[] = [], total = items.length) {
	return { status: "success", data: { items, total, strategy_type: "a_share_leader_tactics" as const, summary: { total, holding: total, closed: 0, incomplete: 0, unverified: 0, anomalous: 0, excluded_reconstruction_count: 0 } } };
}
function mount(pathname = "/home") {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(client);
	return render(<QueryClientProvider client={client}><ShortTermTradeAlerts pathname={pathname} /></QueryClientProvider>);
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date("2026-09-10T02:00:00Z"));
	vi.clearAllMocks();
	useUserStore.setState({ id: "7" });
	fetchJournal.mockResolvedValue(response());
});
afterEach(() => {
	cleanup();
	clients.forEach(client => client.clear());
	clients = [];
	vi.useRealTimers();
});

describe("short-term trade alerts", () => {
	it("shows all four tactics' actual fill prices and quantities in large red text", async () => {
		fetchJournal.mockImplementation(async type => response([cycle(SHORT_TERM_TACTICS.findIndex(t => t.type === type) + 1)]));
		mount();
		expect(await screen.findByText("短线四法 · 今日模拟成交 4 笔")).toBeInTheDocument();
		expect(screen.getAllByText("买入股数 1,000 股")).toHaveLength(4);
		for (const price of screen.getAllByText("买入价格 ¥10.1250"))
			expect(price).toHaveStyle({ color: "#cf1322", fontWeight: "800" });
		for (const tactic of SHORT_TERM_TACTICS)
			expect(fetchJournal).toHaveBeenCalledWith(tactic.type, "all", 100, 0);
	});

	it("labels a sale distinctly, retaining the earlier buy cost and quantity", async () => {
		const item = cycle();
		item.buy_date = "2026-09-09";
		item.executions[0].date = item.buy_date;
		item.executions.push({ ...item.executions[0], trade_id: 2, direction: "sell", date: day, price: 10.6, quantity: 400 });
		item.sell_count = 1;
		item.sell_quantity = 400;
		item.status = "partial";
		fetchJournal.mockImplementation(async type => response(type === "a_share_leader_tactics" ? [item] : []));
		mount("/short-term-strategy/portfolio");
		expect(await screen.findByText("卖出已成交")).toBeInTheDocument();
		expect(screen.getByText("卖出股数 400 股")).toBeInTheDocument();
		expect(screen.getByText(/本轮买入均价 ¥10.1250 · 累计买入 1,000 股/)).toBeInTheDocument();
		expect(screen.queryByText("买入已成交")).not.toBeInTheDocument();
	});

	it("reads later journal pages so an old position traded today is not missed", async () => {
		const old = Array.from({ length: 100 }, (_, i) => {
			const item = cycle(i + 2);
			item.executions[0].date = "2026-09-09";
			return item;
		});
		fetchJournal.mockResolvedValueOnce(response(old, 101)).mockResolvedValueOnce(response([cycle()], 101));
		const items = await loadTacticTradeCycles("a_share_leader_tactics");
		expect(fetchJournal).toHaveBeenLastCalledWith("a_share_leader_tactics", "all", 100, 100);
		expect(todayTradeAlerts(SHORT_TERM_TACTICS[2], items, day)).toHaveLength(1);
	});

	it("does not promote yesterday's trade or recommendation into a new alert", async () => {
		const item = cycle();
		item.executions[0].date = "2026-09-09";
		fetchJournal.mockResolvedValue(response([item]));
		mount("/short-term-strategy/skill-tactics");
		expect(await screen.findByText("短线四法 · 今日暂无模拟成交")).toBeInTheDocument();
		expect(screen.queryByText("买入已成交")).not.toBeInTheDocument();
		expect(beijingTradeDate(new Date("2026-09-09T16:01:00Z"))).toBe(day);
	});

	it("detects a new buy on the next poll and deduplicates repeated fills", async () => {
		vi.useRealTimers();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-10T02:00:00Z"));
		let filled = false;
		fetchJournal.mockImplementation(async type => response(filled && type === "a_share_leader_tactics" ? [cycle(), cycle()] : []));
		mount();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(screen.getByText("短线四法 · 今日暂无模拟成交")).toBeInTheDocument();
		filled = true;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(15100);
		});
		expect(screen.getByText("短线四法 · 今日模拟成交 1 笔")).toBeInTheDocument();
		expect(screen.getAllByText("买入股数 1,000 股")).toHaveLength(1);
	});

	it("shows each buy fill's own quantity and price rather than the cycle totals", async () => {
		const item = cycle();
		item.buy_quantity = 3000;
		item.buy_price = 11.0417;
		item.executions.push({ ...item.executions[0], trade_id: 2, price: 11.5, quantity: 2000 });
		fetchJournal.mockImplementation(async type => response(type === "a_share_leader_tactics" ? [item] : []));
		mount();
		expect(await screen.findByText("买入价格 ¥11.5000")).toBeInTheDocument();
		expect(screen.getByText("买入价格 ¥10.1250")).toBeInTheDocument();
		expect(screen.getByText("买入股数 1,000 股")).toBeInTheDocument();
		expect(screen.getByText("买入股数 2,000 股")).toBeInTheDocument();
		expect(screen.queryByText("买入股数 3,000 股")).not.toBeInTheDocument();
	});

	it("expires yesterday's alerts after Beijing midnight", async () => {
		vi.useRealTimers();
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-10T15:59:55Z"));
		fetchJournal.mockResolvedValue(response([cycle()]));
		mount();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(screen.getByText("短线四法 · 今日模拟成交 4 笔")).toBeInTheDocument();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(15100);
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument();
		expect(screen.getByText("短线四法 · 今日暂无模拟成交")).toBeInTheDocument();
	});

	it("keeps successful tactics visible when another fails and marks unverified data", async () => {
		const item = cycle();
		item.executions[0].verification_status = "unverified";
		item.executions[0].verification_issue = "缺少原始成交盘口";
		fetchJournal.mockImplementation(async (type) => {
			if (type === "kobe92_cycle_speculation")
				throw new Error("network");
			return response(type === "a_share_leader_tactics" ? [item] : []);
		});
		mount();
		expect(await screen.findByText("成交数据待核验")).toBeInTheDocument();
		expect(await screen.findByText("92科比周期投机更新失败")).toBeInTheDocument();
		expect(screen.getByText("买入股数 1,000 股")).toBeInTheDocument();
	});

	it("does not load for other pages or a logged-out user", () => {
		const view = mount("/system/user");
		expect(fetchJournal).not.toHaveBeenCalled();
		view.unmount();
		useUserStore.setState({ id: "" });
		mount();
		expect(fetchJournal).not.toHaveBeenCalled();
	});

	it("clears the previous user's alerts during an account switch", async () => {
		fetchJournal.mockResolvedValue(response([cycle()]));
		mount();
		await screen.findByText("短线四法 · 今日模拟成交 4 笔");
		fetchJournal.mockImplementation(() => new Promise(() => {}));
		act(() => useUserStore.setState({ id: "8" }));
		await waitFor(() => expect(screen.queryByText("买入价格 ¥10.1250")).not.toBeInTheDocument());
	});
});
