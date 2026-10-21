import type { UnwindAlertEvent, UnwindPlan } from "../src/api/strategy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeUnwindAlerts, fetchUnwindAlerts, fetchUnwindPlans, refreshUnwindExecution } from "../src/api/strategy";
import GlobalPriceMonitor from "../src/components/UnwindTrackingPanel/GlobalPriceMonitor";
import { freshUnwindQuote, MONITOR_INTERVAL, newPriceAlerts, priceAlertForPlan } from "../src/components/UnwindTrackingPanel/price-alerts";
import PriceMonitor from "../src/components/UnwindTrackingPanel/PriceMonitor";
import { useAuthStore } from "../src/store/auth";
import { useUserStore } from "../src/store/user";

vi.mock("#src/api/strategy", () => ({ acknowledgeUnwindAlerts: vi.fn(), fetchUnwindAlerts: vi.fn(), fetchUnwindPlans: vi.fn(), refreshUnwindExecution: vi.fn() }));
const now = new Date("2026-10-21T10:00:00+08:00");
function plan(): UnwindPlan {
	return { watchlist_id: 66, stock_code: "301566", stock_name: "测试持仓", open_sold_shares: 0, execution: { plan: { trading_date: "2026-10-21", technical: { as_of: "2026-10-20" }, generated_at: "2026-10-21 09:00:00", valid_until: "2026-10-21T14:57:00+08:00", sell_zone_high: 10.1, pause_buy_below: 9, cancel_sell_above: 12 }, signal: { action: "WAIT", phase: "intraday", target_price: 10, planned_shares: 100, reason: "等待连续报价确认", quote: { price: 10.2, as_of: now.toISOString() }, valid_until: new Date(now.getTime() + 120000).toISOString() } } } as UnwindPlan;
}
function event(id = 1, stage: UnwindAlertEvent["stage"] = "confirmed"): UnwindAlertEvent {
	return { id, stock_code: "301566", stock_name: "测试持仓", trading_date: "2026-10-21", stage, delivered_at: null, read_at: null, payload: { ...plan().execution!.signal, event_action: "SELL", suggested_action: stage === "confirmed" ? "SELL" : undefined, validation_status: "shadow" } };
}
function alerts(items: UnwindAlertEvent[]) {
	return { status: "success", data: { items, server_time: new Date().toISOString() } };
}
async function mount() {
	let view!: ReturnType<typeof render>;
	await act(async () => {
		view = render(
			<>
				<GlobalPriceMonitor />
				<PriceMonitor />
			</>,
		);
	});
	return view;
}
beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
	vi.setSystemTime(now);
	vi.resetAllMocks();
	localStorage.clear();
	useAuthStore.setState({ token: "test", refreshToken: "" });
	useUserStore.setState({ id: "user-1" });
	vi.mocked(fetchUnwindPlans).mockResolvedValue({ status: "success", data: { items: [plan()], total: 1, method: {} as never } });
	vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([]));
	vi.mocked(acknowledgeUnwindAlerts).mockResolvedValue({ status: "success" });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("durable unwind notifications", () => {
	it("shows frozen cancellation and buyback-pause prices inside the popup", async () => {
		const saved = event();
		saved.payload.invalid_conditions = ["突破45.41取消卖出", "跌破35.09暂停买回", "报价超过120秒失效"];
		vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([saved]));
		await mount();
		const popup = screen.getByRole("dialog");
		expect(popup).toHaveTextContent("突破¥45.410 取消卖出");
		expect(popup).toHaveTextContent("跌破¥35.090 暂停买回");
		expect(popup).toHaveTextContent("暂停买回线不是接回目标价");
		expect(popup).not.toHaveTextContent("突破¥12.000");
	});
	it("does not invent historical boundaries or show a zero target for risk alerts", async () => {
		const saved = event(1, "risk");
		saved.payload.target_price = undefined;
		vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([saved]));
		await mount();
		expect(screen.getByRole("dialog")).toHaveTextContent("此条历史提醒未保存失效条件");
		expect(screen.getByRole("dialog")).toHaveTextContent("无下单目标");
		expect(screen.getByRole("dialog")).not.toHaveTextContent("¥0.000");
	});
	it("reads every thirty seconds without invoking the execution writer", async () => {
		await mount();
		expect(refreshUnwindExecution).not.toHaveBeenCalled();
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(fetchUnwindAlerts).toHaveBeenCalledTimes(2);
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(2);
		fireEvent.click(screen.getByRole("switch"));
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(fetchUnwindAlerts).toHaveBeenCalledTimes(2);
	});
	it("recovers expired unread events and never presents them as current orders", async () => {
		const old = event();
		old.payload.valid_until = "2026-10-21T09:42:00+08:00";
		vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([old]));
		await mount();
		expect(screen.getByRole("dialog")).toHaveTextContent("已过期 · 仅供复盘");
		expect(screen.getByRole("dialog")).toHaveTextContent("验证信号 · 暂不下单");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "我已知晓，继续监控" }));
		});
		expect(acknowledgeUnwindAlerts).toHaveBeenCalledWith([1], "read");
	});
	it("reopens for confirmation after a candidate was read", async () => {
		vi.mocked(fetchUnwindAlerts).mockResolvedValueOnce(alerts([event(1, "candidate")])).mockResolvedValue(alerts([event(2)]));
		await mount();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "我已知晓，继续监控" }));
		});
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(screen.getByRole("dialog")).toHaveTextContent("验证信号");
	});
	it("delivers saved events even when the holding snapshot fails", async () => {
		vi.mocked(fetchUnwindPlans).mockRejectedValue(new Error("unavailable"));
		vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([event()]));
		await mount();
		expect(screen.getByRole("dialog")).toHaveTextContent("测试持仓");
	});
	it("reports delivery failure while preserving healthy quote coverage", async () => {
		vi.mocked(fetchUnwindAlerts).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(alerts([event()]));
		await mount();
		expect(screen.getByText(/有效报价 1 只/)).toBeInTheDocument();
		expect(screen.getByText(/提醒同步失败/)).toBeInTheDocument();
		await act(async () => {
			vi.advanceTimersByTime(MONITOR_INTERVAL);
		});
		expect(screen.getByRole("dialog")).toHaveTextContent("测试持仓");
	});
	it("retains unread state if acknowledgment fails", async () => {
		vi.mocked(fetchUnwindAlerts).mockResolvedValue(alerts([event()]));
		vi.mocked(acknowledgeUnwindAlerts).mockRejectedValue(new Error("offline"));
		await mount();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "我已知晓，继续监控" }));
		});
		expect(screen.getByRole("dialog")).toHaveTextContent("已读保存失败");
	});
	it("cancels late results on logout and isolates the next login", async () => {
		let resolve!: (value: ReturnType<typeof alerts>) => void;
		vi.mocked(fetchUnwindAlerts).mockReturnValueOnce(new Promise((done) => {
			resolve = done;
		}));
		await mount();
		act(() => useAuthStore.setState({ token: "" }));
		await act(async () => {
			resolve(alerts([event()]));
		});
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(acknowledgeUnwindAlerts).not.toHaveBeenCalled();
	});
	it("allows independent confirmation keys and prices above the original narrow zone", () => {
		const p = plan();
		expect(priceAlertForPlan(p, now)).not.toBeNull();
		const seen = new Set<string>();
		expect(newPriceAlerts([p], seen, now)).toHaveLength(1);
		p.execution!.signal.action = "SELL";
		expect(newPriceAlerts([p], seen, now)).toHaveLength(1);
		expect(newPriceAlerts([p], seen, now)).toHaveLength(0);
	});
	it("still rejects stale, future and invalidated quotes", () => {
		const p = plan();
		p.execution!.signal.quote!.as_of = "2026/10/21 10:00:00";
		expect(freshUnwindQuote(p, now)).not.toBeNull();
		expect(freshUnwindQuote(p, new Date(now.getTime() + 121000))).toBeNull();
		expect(freshUnwindQuote(p, new Date(now.getTime() - 6000))).toBeNull();
		p.execution!.signal.invalidated = true;
		expect(priceAlertForPlan(p, now)).toBeNull();
	});
});
