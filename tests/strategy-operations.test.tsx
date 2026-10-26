import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StrategyOperationsPanel from "../src/components/strategy-operations";
import { metric } from "../src/components/strategy-operations/format";

vi.mock("#src/api/portfolio/operations", () => ({ fetchStrategyOperations: vi.fn().mockResolvedValue({ status: "success", data: {
	start_date: "2026-09-26",
	end_date: "2026-10-23",
	is_intraday: false,
	totals: { book_pnl: -100, ledger_trade_count: 4, accounting_repair_count: 2 },
	accounts: [{ portfolio_id: 36, name: "连板接力旧账户", new_account_in_period: false, operation: { status: "not_scheduled", label: "旧策略未接入调度", last_scan_at: null, blocking_reasons: [], last_rejections: [] }, book: { return_pct: 0, stale: false }, ledger: { accounting_repair_count: 2 }, model: { closed_cycle_count: 0, excluded_closed_cycle_count: 1, net_pnl: null, win_rate_pct: null, note: "修复记录不计战绩" } }],
} }) }));

describe("operation and performance separation", () => {
	it("does not turn missing model observations into zero returns", () => {
		expect(metric(null, "%")).toBe("暂无有效样本");
		expect(metric(0, "%")).toBe("0.00%");
		expect(metric(Number.NaN)).toBe("暂无有效样本");
	});
	it("shows unscheduled legacy accounts and excluded repair cycles", async () => {
		render(<StrategyOperationsPanel />);
		expect(await screen.findByText("旧策略未接入调度")).toBeInTheDocument();
		expect(screen.getByText("0 轮 / 排除 1 轮")).toBeInTheDocument();
		expect(screen.getAllByText("暂无有效样本")).toHaveLength(2);
		expect(screen.getByText(/其中修复记录 2 条/)).toBeInTheDocument();
	});
});
