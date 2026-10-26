import type { WildmanCandidate, WildmanDaily, WildmanHoldings } from "../src/api/wildman";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWildmanDaily, fetchWildmanHoldings, generateWildmanUnwindPlans } from "../src/api/wildman";
import WildmanTradingWorkspace, { WILDMAN_LOGIN_PATH } from "../src/components/WildmanTradingWorkspace";
import WildmanWidget, { MAX_WIDGET_HEIGHT } from "../src/pages/wildman-widget";
import { useAuthStore } from "../src/store/auth";

const identityCleanup = vi.hoisted(() => ({ access: vi.fn(), tabs: vi.fn() }));
vi.mock("#src/api/wildman", () => ({ fetchWildmanDaily: vi.fn(), fetchWildmanHoldings: vi.fn(), generateWildmanUnwindPlans: vi.fn() }));
vi.mock("#src/store/access", () => ({ useAccessStore: { getState: () => ({ reset: identityCleanup.access }) } }));
vi.mock("#src/store/tabs", () => ({ useTabsStore: { getState: () => ({ resetTabs: identityCleanup.tabs }) } }));
vi.mock("#src/store/auth", async () => {
	const { create } = await import("zustand");
	const store = create(() => ({ token: "", refreshToken: "" }));
	Object.assign(store, { persist: { getOptions: () => ({ name: "wildman-test-access-token" }) } });
	return { useAuthStore: store };
});
vi.mock("#src/store/user", async () => {
	const { create } = await import("zustand");
	const store = create<{ id: string, reset: () => void }>(set => ({ id: "", reset: () => set({ id: "" }) }));
	return { useUserStore: store };
});
vi.mock("#src/components/WildmanDailyPanel", () => ({ default: ({ onOpenLedger, embedded }: { onOpenLedger: () => void, embedded?: boolean }) => (
	<div>
		已有解套操作单
		{embedded && <span>手册内只读同步</span>}
		<button type="button" onClick={onOpenLedger}>打开真实成交账本</button>
	</div>
) }));

function candidate(extra: Partial<WildmanCandidate> = {}): WildmanCandidate {
	return { stock_code: "600001", stock_name: "条件候选甲", strategy_type: "leader", strategy_name: "龙头策略", reason: "来源已通过当日规则筛选", reference_price: 12, entry_low: 11, entry_high: 12, stop_loss: 10, target_price: 14, generated_at: "2026-10-26 09:00:00", validation_status: null, recommendation_kind: "conditional_plan", execution_status: "awaiting_confirmation", current_action: "WAIT", execution_reason: "等待价格触发与风险确认", ...extra };
}
function daily(extra: Partial<WildmanDaily> = {}): WildmanDaily {
	return { trading_date: "2026-10-26", server_time: "2026-10-26T10:00:00+08:00", is_trading_day: true, recommendation_status: "recommended", headline: "候选仍须等待盘中确认", reason_codes: [], reasons: ["符合当日条件，不代表立即买入"], market_gate: { allowed: true, reason: "市场门允许继续筛选" }, recommended: [candidate()], not_recommended: [candidate({ stock_code: "600002", stock_name: "排除股票乙", reason: "价格已超过计划区间", reference_price: null })], source_snapshots: [{ strategy_type: "leader", strategy_name: "龙头策略", status: "available", generated_at: "2026-10-26 09:00:00", trading_date: "2026-10-26", count: 1, reason: "当日快照" }], methodology_note: "条件式观察，等待确认。", ...extra };
}
function holdings(extra: Partial<WildmanHoldings> = {}): WildmanHoldings {
	return { source: "user_recorded", items: [{ watchlist_id: 8, stock_code: "600001", stock_name: "我的持仓甲", current_shares: 300, effective_cost: 13.5, has_unwind_account: true, position_conflict: false }], total: 1, initialized: 1, pending: 0, ...extra };
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
beforeEach(() => {
	vi.resetAllMocks();
	useAuthStore.setState({ token: "fixture-user-a", refreshToken: "" });
	window.history.replaceState({}, "", "/wildman-widget?tab=daily");
	vi.mocked(fetchWildmanDaily).mockResolvedValue(daily());
	vi.mocked(fetchWildmanHoldings).mockResolvedValue(holdings());
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("wildman private daily workspace", () => {
	it("requires login before either reader and keeps the return destination in the login link", () => {
		useAuthStore.setState({ token: "" });
		render(<WildmanTradingWorkspace initialTab="unwind" />);
		expect(screen.getByRole("link", { name: "登录后查看" })).toHaveAttribute("href", WILDMAN_LOGIN_PATH);
		expect(screen.getByRole("link", { name: "登录后查看" })).toHaveAttribute("target", "_top");
		expect(fetchWildmanDaily).not.toHaveBeenCalled();
		expect(fetchWildmanHoldings).not.toHaveBeenCalled();
		expect(generateWildmanUnwindPlans).not.toHaveBeenCalled();
	});
	it("shows conditional recommendations and explicit exclusions without an immediate buy action", async () => {
		render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("条件候选甲")).toBeVisible();
		expect(within(screen.getByRole("region", { name: "今日不推荐名单" })).getByText("排除股票乙")).toBeVisible();
		expect(screen.getByText("条件式候选（当前仍待确认）")).toBeVisible();
		expect(screen.getByText("等待价格触发与风险确认")).toBeVisible();
		expect(screen.getByText("未提供", { selector: "dd" })).toBeVisible();
		expect(screen.queryByRole("button", { name: /买入/ })).not.toBeInTheDocument();
		expect(document.body.innerHTML).not.toContain("fixture-user-a");
	});
	it("distinguishes an explicit no-recommendation decision from missing data", async () => {
		vi.mocked(fetchWildmanDaily).mockResolvedValue(daily({ recommendation_status: "no_recommendation", recommended: [], headline: "市场条件不通过", reasons: ["退潮阶段暂不参与"] }));
		render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("今日不推荐新开仓")).toBeVisible();
		expect(screen.getByText("退潮阶段暂不参与")).toBeVisible();
		expect(screen.getByText("排除股票乙")).toBeVisible();
	});
	it("never presents a failed read as an empty valid recommendation list", async () => {
		vi.mocked(fetchWildmanDaily).mockRejectedValue(new Error("offline"));
		render(<WildmanTradingWorkspace />);
		expect(await screen.findByRole("alert")).toHaveTextContent("不能据此判断没有机会");
		expect(screen.queryByText("今日不推荐新开仓")).not.toBeInTheDocument();
		expect(screen.queryByRole("region", { name: "今日推荐名单" })).not.toBeInTheDocument();
	});
	it("says temporarily not recommended for unavailable data and never treats an old empty result as today's completed screening", async () => {
		vi.mocked(fetchWildmanDaily).mockResolvedValue(daily({ recommendation_status: "unavailable", recommended: [], not_recommended: [], headline: "来源读取中断" }));
		const mounted = render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("暂不推荐 · 数据不足")).toBeVisible();
		mounted.unmount();
		vi.mocked(fetchWildmanDaily).mockResolvedValue(daily({ recommendation_status: "no_recommendation", recommended: [], trading_date: "2026-10-23", source_snapshots: [{ strategy_type: "combined", strategy_name: "暂停策略", status: "paused", generated_at: null, trading_date: null, count: null, reason: "暂停新开仓" }] }));
		render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("暂不推荐 · 日期或来源待核验")).toBeVisible();
		expect(screen.queryByText("今日不推荐新开仓")).not.toBeInTheDocument();
		expect(screen.getByText("暂停策略 · 已暂停")).toBeInTheDocument();
	});
	it("keeps pending data pending and rejects stale or shadow candidates", async () => {
		vi.mocked(fetchWildmanDaily).mockResolvedValue(daily({ recommendation_status: "pending", recommended: [], not_recommended: [], headline: "来源尚未生成" }));
		const mounted = render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("暂不推荐 · 等待生成")).toBeVisible();
		expect(screen.getByText(/不推荐明细也未齐全/)).toBeVisible();
		mounted.unmount();
		vi.mocked(fetchWildmanDaily).mockResolvedValue(daily({ recommended: [candidate({ validation_status: "shadow" }), candidate({ stock_code: "600003", stock_name: "旧日候选丙", strategy_type: "old" })] }));
		render(<WildmanTradingWorkspace />);
		expect(await screen.findByText("影子验证信号，不能作为正式推荐")).toBeVisible();
		expect(within(screen.getByRole("region", { name: "今日推荐名单" })).queryByRole("article")).not.toBeInTheDocument();
		expect(within(screen.getByRole("region", { name: "今日不推荐名单" })).getByText("旧日候选丙")).toBeVisible();
	});
	it("automatically reads recorded holdings and opens the existing plan and real-trade ledger", async () => {
		const onOpenLedger = vi.fn();
		render(<WildmanTradingWorkspace initialTab="unwind" onOpenLedger={onOpenLedger} />);
		expect(await screen.findByText("我的持仓甲")).toBeVisible();
		expect(screen.getByText("300 股")).toBeVisible();
		expect(screen.getByText("13.50")).toBeVisible();
		expect(screen.getByText(/不把总持仓当作今日可卖股数/)).toBeVisible();
		expect(generateWildmanUnwindPlans).not.toHaveBeenCalled();
		expect(screen.getByText("已有解套操作单")).toBeVisible();
		expect(screen.getByRole("button", { name: "根据我的持仓生成/更新解套" })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: "收起解套操作单" }));
		expect(screen.queryByText("已有解套操作单")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "查看已有解套操作单" }));
		fireEvent.click(screen.getByRole("button", { name: "打开真实成交账本" }));
		expect(onOpenLedger).toHaveBeenCalledTimes(1);
	});
	it("distinguishes a holdings error from no holdings and renders unknown numbers honestly", async () => {
		vi.mocked(fetchWildmanHoldings).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(holdings({ items: [{ ...holdings().items[0], current_shares: null, effective_cost: null, position_conflict: true }] }));
		render(<WildmanTradingWorkspace initialTab="unwind" />);
		expect(await screen.findByRole("alert")).toHaveTextContent("不能判断为没有持仓");
		expect(screen.queryByText(/尚未登记实际持仓/)).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "重新读取持仓" }));
		await screen.findByText("我的持仓甲");
		expect(screen.getAllByText("待补录 / 待核实")).toHaveLength(2);
		expect(screen.getByText(/持仓基准有冲突/)).toBeVisible();
	});
	it("only posts plan generation after the explicit button and never as part of polling", async () => {
		vi.useFakeTimers();
		vi.mocked(fetchWildmanHoldings).mockResolvedValue(holdings({ pending: 1, initialized: 0 }));
		vi.mocked(generateWildmanUnwindPlans).mockResolvedValue({ status: "success", data: { total: 1, generated: [], errors: [] }, message: "done" });
		render(<WildmanTradingWorkspace initialTab="unwind" />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(fetchWildmanHoldings).toHaveBeenCalledTimes(1);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(fetchWildmanHoldings).toHaveBeenCalledTimes(2);
		expect(generateWildmanUnwindPlans).not.toHaveBeenCalled();
		await act(async () => {
			vi.mocked(fetchWildmanHoldings).mockResolvedValue(holdings());
			fireEvent.click(screen.getByRole("button", { name: "根据我的持仓生成/更新解套" }));
		});
		expect(generateWildmanUnwindPlans).toHaveBeenCalledTimes(1);
		expect(screen.getByText("已有解套操作单")).toBeVisible();
	});
	it("removes a prior user's private holdings and ignores their late read after switching accounts", async () => {
		const old = deferred<WildmanHoldings>();
		vi.mocked(fetchWildmanHoldings).mockReturnValueOnce(old.promise).mockResolvedValueOnce(holdings({ items: [{ ...holdings().items[0], stock_name: "第二用户持仓" }] }));
		render(<WildmanTradingWorkspace initialTab="unwind" />);
		act(() => {
			useAuthStore.setState({ token: "fixture-user-b" });
		});
		expect(await screen.findByText("第二用户持仓")).toBeVisible();
		await act(async () => {
			old.resolve(holdings({ items: [{ ...holdings().items[0], stock_name: "旧用户迟到持仓" }] }));
		});
		expect(screen.queryByText("旧用户迟到持仓")).not.toBeInTheDocument();
		expect(screen.getByText("第二用户持仓")).toBeVisible();
		act(() => {
			window.dispatchEvent(new StorageEvent("storage", { key: "wildman-test-access-token", newValue: null }));
		});
		expect(screen.queryByText("第二用户持仓")).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "登录后查看" })).toBeVisible();
	});
	it("clears access and cached tabs before one atomic cross-window account change, without broadcasting an intermediate logout", async () => {
		render(<WildmanTradingWorkspace initialTab="unwind" />);
		await screen.findByText("我的持仓甲");
		vi.mocked(fetchWildmanHoldings).mockResolvedValue(holdings({ items: [{ ...holdings().items[0], stock_name: "跨窗口新账户持仓" }] }));
		const transitions: Array<{ token: string, accessCleared: number, tabsCleared: number }> = [];
		const unsubscribe = useAuthStore.subscribe(state => transitions.push({ token: state.token, accessCleared: identityCleanup.access.mock.calls.length, tabsCleared: identityCleanup.tabs.mock.calls.length }));
		const next = { token: "fixture-user-b", refreshToken: "fixture-refresh-b" };
		const switchAccount = () => window.dispatchEvent(new StorageEvent("storage", { key: "wildman-test-access-token", newValue: JSON.stringify({ state: next }) }));
		try {
			act(() => {
				switchAccount();
			});
			expect(screen.queryByText("我的持仓甲")).not.toBeInTheDocument();
			expect(await screen.findByText("跨窗口新账户持仓")).toBeVisible();
			expect(identityCleanup.access).toHaveBeenCalledTimes(1);
			expect(identityCleanup.tabs).toHaveBeenCalledTimes(1);
			expect(transitions).toEqual([{ token: next.token, accessCleared: 1, tabsCleared: 1 }]);
			expect(useAuthStore.getState()).toMatchObject(next);
			act(() => {
				switchAccount();
			});
			expect(identityCleanup.access).toHaveBeenCalledTimes(1);
			expect(identityCleanup.tabs).toHaveBeenCalledTimes(1);
		}
		finally {
			unsubscribe();
		}
	});
	it("drops the last valid daily result when its refresh fails", async () => {
		vi.mocked(fetchWildmanDaily).mockResolvedValueOnce(daily()).mockRejectedValueOnce(new Error("offline"));
		render(<WildmanTradingWorkspace />);
		await screen.findByText("条件候选甲");
		fireEvent.click(screen.getByRole("button", { name: "重新读取推荐" }));
		await screen.findByRole("alert");
		expect(screen.queryByText("条件候选甲")).not.toBeInTheDocument();
	});
});

describe("embedded workspace boundaries", () => {
	it("opens the unwind query tab without adding an application shell", async () => {
		window.history.replaceState({}, "", "/wildman-widget?tab=unwind");
		render(<WildmanWidget />);
		expect(await screen.findByText("我的持仓甲")).toBeVisible();
		expect(screen.getByText("手册内只读同步")).toBeVisible();
		expect(screen.getByRole("tab", { name: "我的持仓解套" })).toHaveAttribute("aria-selected", "true");
	});
	it("accepts tab messages only from the same-origin parent and sends only a bounded height", async () => {
		vi.useFakeTimers();
		const original = Object.getOwnPropertyDescriptor(window, "parent");
		const parent = { postMessage: vi.fn() };
		Object.defineProperty(window, "parent", { configurable: true, value: parent });
		let resized = () => {};
		vi.stubGlobal("ResizeObserver", class {
			constructor(callback: () => void) {
				resized = callback;
			}

			observe() {}

			disconnect() {}
		});
		try {
			render(<WildmanWidget />);
			await act(async () => {
				await vi.advanceTimersByTimeAsync(20);
			});
			const notify = (origin: string, source: unknown, tab: string) => act(() => {
				window.dispatchEvent(new MessageEvent("message", { origin, source: source as Window, data: { type: "wildman-workspace-tab", tab } }));
			});
			notify("https://untrusted.example", parent, "unwind");
			notify(window.location.origin, window, "unwind");
			expect(screen.getByRole("tab", { name: "今日推荐" })).toHaveAttribute("aria-selected", "true");
			notify(window.location.origin, parent, "unwind");
			await act(async () => {
				await Promise.resolve();
			});
			expect(screen.getByRole("tab", { name: "我的持仓解套" })).toHaveAttribute("aria-selected", "true");
			Object.defineProperty(screen.getByRole("main"), "scrollHeight", { configurable: true, value: 50000 });
			resized();
			await act(async () => {
				await vi.advanceTimersByTimeAsync(20);
			});
			expect(parent.postMessage).toHaveBeenLastCalledWith({ type: "wildman-workspace-height", height: MAX_WIDGET_HEIGHT }, window.location.origin);
			for (const [payload] of parent.postMessage.mock.calls)
				expect(Object.keys(payload).sort()).toEqual(["height", "type"]);
		}
		finally {
			cleanup();
			if (original)
				Object.defineProperty(window, "parent", original);
		}
	});
});
