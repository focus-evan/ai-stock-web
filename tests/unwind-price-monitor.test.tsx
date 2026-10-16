import type { UnwindPlan } from "../src/api/strategy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUnwindPlans, refreshUnwindExecution } from "../src/api/strategy";
import GlobalPriceMonitor from "../src/components/UnwindTrackingPanel/GlobalPriceMonitor";
import { UNWIND_ALERT_Z_INDEX, useUnwindMonitorStore } from "../src/components/UnwindTrackingPanel/monitor-store";
import { freshUnwindQuote, MONITOR_INTERVAL, newPriceAlerts, priceAlertForPlan } from "../src/components/UnwindTrackingPanel/price-alerts";
import PriceMonitor from "../src/components/UnwindTrackingPanel/PriceMonitor";
import { useAuthStore } from "../src/store/auth";
import { useUserStore } from "../src/store/user";

vi.mock("#src/api/strategy", () => ({ fetchUnwindPlans: vi.fn(), refreshUnwindExecution: vi.fn() }));
vi.mock("../src/components/WildmanDailyPanel/daily-guide", () => ({ wildmanAlertEligible: () => true }));
const now = new Date("2026-10-16T10:00:00+08:00");
function plan(at = now): UnwindPlan {
	return {
		watchlist_id: 66,
		stock_code: "301566",
		stock_name: "测试持仓",
		open_sold_shares: 0,
		execution: {
			plan: { trading_date: "2026-10-16", technical: { as_of: "2026-10-15" }, generated_at: "2026-10-16 09:00:00", valid_until: "2026-10-16T14:57:00+08:00", sell_zone_high: 11, pause_buy_below: 9, cancel_sell_above: 12 },
			signal: { action: "WAIT", phase: "intraday", target_price: 10, planned_shares: 100, reason: "价格到区间，等待下一次有效行情确认", quote: { price: 10.2, as_of: at.toISOString() }, valid_until: new Date(at.getTime() + 120000).toISOString() },
		},
	} as UnwindPlan;
}
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
	vi.setSystemTime(now);
	vi.resetAllMocks();
	sessionStorage.clear();
	localStorage.clear();
	useAuthStore.setState({ token: "test-session", refreshToken: "" });
	useUserStore.setState({ id: "user-1" });
	useUnwindMonitorStore.setState({ view: null });
	vi.mocked(refreshUnwindExecution).mockResolvedValue({ status: "success", data: { total: 1, errors: [] } });
	vi.mocked(fetchUnwindPlans).mockImplementation(async () => ({ status: "success", data: { items: [plan(new Date())], total: 1, method: {} as never } }));
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("unwind price alerts", () => {
	it("accepts slash-separated HK quote times without dropping HK holdings", () => {
		const p = plan();
		p.stock_code = "09988";
		p.execution!.signal.quote!.as_of = "2026/10/16 10:00:00";
		expect(freshUnwindQuote(p, now)?.price).toBe(10.2);
		expect(priceAlertForPlan(p, now)?.symbol).toBe("HK$");
	});
	it("alerts on entry to the sell zone while keeping the pending confirmation explicit", () => {
		expect(priceAlertForPlan(plan(), now)).toMatchObject({ side: "sell", price: 10.2, target: 10, confirmed: false });
	});
	it("only follows the actual sold-position buyback target", () => {
		const p = plan();
		p.open_sold_shares = 100;
		p.execution!.signal.target_price = 9.5;
		p.execution!.signal.quote!.price = 9.4;
		expect(priceAlertForPlan(p, now)?.side).toBe("buy");
		p.open_sold_shares = 0;
		expect(priceAlertForPlan(p, now)).toBeNull();
	});
	it("suppresses stale, future, closed-market, invalidated and out-of-zone quotes", () => {
		expect(priceAlertForPlan(plan(new Date(now.getTime() - 121000)), now)).toBeNull();
		expect(priceAlertForPlan(plan(new Date(now.getTime() + 6000)), now)).toBeNull();
		const p = plan();
		p.execution!.signal.phase = "break";
		expect(priceAlertForPlan(p, now)).toBeNull();
		p.execution!.signal.phase = "intraday";
		p.execution!.signal.invalidated = true;
		expect(priceAlertForPlan(p, now)).toBeNull();
		p.execution!.signal.invalidated = false;
		p.execution!.signal.quote!.price = 11.2;
		expect(priceAlertForPlan(p, now)).toBeNull();
		p.execution!.signal.quote!.price = 8.9;
		p.open_sold_shares = 100;
		expect(priceAlertForPlan(p, now)).toBeNull();
	});
	it("deduplicates by trading day, stock, direction and target, allowing a changed target", () => {
		const seen = new Set<string>();
		expect(newPriceAlerts([plan()], seen, now)).toHaveLength(1);
		expect(newPriceAlerts([plan()], seen, now)).toHaveLength(0);
		const changed = plan();
		changed.execution!.signal.target_price = 10.1;
		expect(newPriceAlerts([changed], seen, now)).toHaveLength(1);
	});
	it("checks immediately and every ten minutes, shows a modal, and pauses when switched off", async () => {
		const onPlans = vi.fn();
		await act(async () => {
			render(
				<>
					<GlobalPriceMonitor />
					<PriceMonitor onPlans={onPlans} />
				</>,
			);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("dialog")).toHaveTextContent("测试持仓");
		fireEvent.click(screen.getByRole("button", { name: "我已知晓，继续监控" }));
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL - 1000);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
		await act(async () => {
			vi.advanceTimersByTime(1000);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(2);
		expect(onPlans).toHaveBeenCalledTimes(2);
		fireEvent.click(screen.getByRole("switch", { name: "启用到价监控" }));
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(2);
	});
	it("does not alert from a failed check, and recovers at the next interval", async () => {
		vi.mocked(refreshUnwindExecution).mockRejectedValueOnce(new Error("offline"));
		await act(async () => {
			render(
				<>
					<GlobalPriceMonitor />
					<PriceMonitor onPlans={vi.fn()} />
				</>,
			);
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText(/本次价格检查失败/)).toBeInTheDocument();
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(screen.getByRole("dialog")).toHaveTextContent("测试持仓");
	});
	it("does not issue alerts for a partial refresh failure", async () => {
		vi.mocked(refreshUnwindExecution).mockResolvedValue({ status: "partial", data: { total: 0, errors: [{ stock_code: "301566", message: "missing" }] } });
		await act(async () => {
			render(
				<>
					<GlobalPriceMonitor />
					<PriceMonitor onPlans={vi.fn()} />
				</>,
			);
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.getByText(/1 项更新未成功/)).toBeInTheDocument();
	});
	it("continues on other pages with one timer and raises an undismissable-by-mask popup above an existing modal", async () => {
		vi.mocked(fetchUnwindPlans).mockImplementationOnce(async () => {
			const p = plan();
			p.execution!.signal.quote!.price = 9.9;
			return { status: "success", data: { items: [p], total: 1, method: {} as never } };
		});
		const tree = (page: string) => (
			<>
				<GlobalPriceMonitor />
				<main>{page}</main>
				{page === "首页" ? <PriceMonitor /> : <Modal open title="其他页面的编辑窗口">未保存的内容</Modal>}
			</>
		);
		let mounted: ReturnType<typeof render>;
		await act(async () => {
			mounted = render(tree("首页"));
		});
		await act(async () => {
			mounted.rerender(tree("财务数据页面"));
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(2);
		// Ant Design uses a fixed title id in NODE_ENV=test; distinguish the two actual dialogs by their host.
		const popup = screen.getAllByRole("dialog").find(element => element.closest(".unwind-global-alert"))!;
		expect(popup).toHaveTextContent("高优先级 · 解套到价提醒");
		expect(popup).toHaveTextContent("测试持仓");
		expect(popup.closest(".ant-modal-wrap")).toHaveStyle({ zIndex: String(UNWIND_ALERT_Z_INDEX) });
		fireEvent.click(popup.closest(".ant-modal-wrap")!);
		fireEvent.keyDown(popup, { key: "Escape", keyCode: 27 });
		expect(popup).toBeInTheDocument();
		expect(screen.getByText("未保存的内容")).toBeInTheDocument();
	});
	it("shares controls across page panels without starting more pollers", async () => {
		await act(async () => {
			render(
				<>
					<GlobalPriceMonitor />
					<PriceMonitor />
					<PriceMonitor />
				</>,
			);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getAllByRole("switch", { name: "启用到价监控" })[0]);
		expect(screen.getAllByRole("switch", { name: "启用到价监控" })[1]).toHaveAttribute("aria-checked", "false");
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
	});
	it("stops on logout and discards a pending result", async () => {
		let resolve!: (value: Awaited<ReturnType<typeof refreshUnwindExecution>>) => void;
		vi.mocked(refreshUnwindExecution).mockReturnValueOnce(new Promise((done) => {
			resolve = done;
		}));
		await act(async () => {
			render(<GlobalPriceMonitor />);
		});
		act(() => useAuthStore.setState({ token: "" }));
		await act(async () => {
			resolve({ status: "success", data: { total: 1, errors: [] } });
		});
		expect(fetchUnwindPlans).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(useUnwindMonitorStore.getState().view).toBeNull();
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
	});
	it("isolates account state and does not restart on token rotation", async () => {
		await act(async () => {
			render(<GlobalPriceMonitor />);
		});
		act(() => useAuthStore.setState({ token: "rotated-session" }));
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(1);
		await act(async () => {
			useUserStore.setState({ id: "user-2" });
		});
		expect(refreshUnwindExecution).toHaveBeenCalledTimes(2);
		expect(useUnwindMonitorStore.getState().view?.userId).toBe("user-2");
		expect(sessionStorage.getItem("unwind-price-alerts-seen-v1:user-1")).not.toBeNull();
		expect(sessionStorage.getItem("unwind-price-alerts-seen-v1:user-2")).not.toBeNull();
	});
});
