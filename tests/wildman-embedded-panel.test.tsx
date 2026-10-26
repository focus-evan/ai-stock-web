import type { ReactNode } from "react";
import type { UnwindPlanExt } from "../src/api/strategy/unwind-extra";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUnwindPlans, refreshUnwindExecution, refreshUnwindPlans } from "../src/api/strategy";
import WildmanDailyPanel from "../src/components/WildmanDailyPanel";

vi.mock("#src/api/strategy", () => ({ fetchUnwindPlans: vi.fn(), refreshUnwindExecution: vi.fn(), refreshUnwindPlans: vi.fn() }));
vi.mock("#src/components/UnwindTrackingPanel/PriceMonitor", () => ({ default: () => <div>现有全局监控视图</div> }));
vi.mock("antd", () => {
	const pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		Alert: ({ message, description }: { message: ReactNode, description?: ReactNode }) => (
			<div>
				{message}
				{description}
			</div>
		),
		Button: ({ children, onClick, disabled }: { children?: ReactNode, onClick?: () => void, disabled?: boolean }) => <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
		Checkbox: pass,
		Collapse: () => null,
		Empty: ({ description }: { description: ReactNode }) => <div>{description}</div>,
		Input: { Search: () => <input aria-label="测试搜索" /> },
		message: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
		Segmented: () => null,
		Spin: pass,
		Tag: pass,
	};
});

beforeEach(() => {
	vi.resetAllMocks();
	vi.useFakeTimers();
	vi.mocked(fetchUnwindPlans).mockResolvedValue({ status: "success", data: { items: [], total: 0, method: { name: "测试方法", capital_rule: "", position_rule: "", trend_rule: "", risk_notice: "", schedule: "" } } });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("wildman embedded plan reader", () => {
	it("reads total recovery values from the ledger and never reconstructs missing totals from effective cost", async () => {
		const plan: UnwindPlanExt = { id: 1, watchlist_id: 8, stock_code: "600001", stock_name: "回本口径测试", baseline_cost_price: 15, baseline_shares: 1000, current_shares: 700, cash_pool: 3000, open_sold_shares: 0, open_sell_amount: 0, cumulative_cost_reduction: 20, effective_cost: 14.8, status: "active", trades: [], analysis_history: [], recovery: { available: true, remaining_breakeven_price: 13.52, total_pnl: -1200.35 } };
		const data = { items: [plan], total: 1, method: { name: "测试方法", capital_rule: "", position_rule: "", trend_rule: "", risk_notice: "", schedule: "" } };
		const missing: UnwindPlanExt = { ...plan, recovery: undefined };
		vi.mocked(fetchUnwindPlans).mockResolvedValueOnce({ status: "success", data }).mockResolvedValueOnce({ status: "success", data: { ...data, items: [missing] } });
		render(<WildmanDailyPanel embedded onOpenLedger={vi.fn()} />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("整体回本价（含已实现盈亏）")).toBeVisible();
		expect(screen.getByText("¥13.52")).toBeVisible();
		expect(screen.getByText("¥-1200.35")).toBeVisible();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(screen.getAllByText("未提供")).toHaveLength(2);
		expect(screen.queryByText("¥13.52")).not.toBeInTheDocument();
	});
	it("reads saved plans every minute without mounting global monitoring or generating plans", async () => {
		render(<WildmanDailyPanel embedded onOpenLedger={vi.fn()} />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("现有全局监控视图")).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "完整工作台" })).toHaveAttribute("target", "_top");
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(2);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "重新读取解套计划" }));
		});
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(3);
		expect(refreshUnwindExecution).not.toHaveBeenCalled();
		expect(refreshUnwindPlans).not.toHaveBeenCalled();
	});
	it("keeps the original main-workspace monitor behavior without a second plan polling timer", async () => {
		render(<WildmanDailyPanel onOpenLedger={vi.fn()} />);
		await act(async () => {
			await Promise.resolve();
		});
		expect(screen.getByText("现有全局监控视图")).toBeVisible();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(1);
	});
	it("shows an embedded refresh failure and stops polling when unmounted", async () => {
		const mounted = render(<WildmanDailyPanel embedded onOpenLedger={vi.fn()} />);
		await act(async () => {
			await Promise.resolve();
		});
		vi.mocked(fetchUnwindPlans).mockRejectedValueOnce(new Error("offline"));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(screen.getByText("持仓指导加载失败，请重试。当前不使用旧页面数据执行。")).toBeVisible();
		mounted.unmount();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(60000);
		});
		expect(fetchUnwindPlans).toHaveBeenCalledTimes(2);
	});
});
