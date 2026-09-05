import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PortfolioAuditPanel from "../src/components/portfolio-audit";

vi.mock("#src/api/portfolio", () => ({
	fetchPortfolioQualityAudit: vi.fn().mockResolvedValue({
		status: "success",
		data: {
			accounts: [{
				portfolio_id: 22,
				name: "原竞价尾盘归档组合",
				status: "hidden",
				data_quality_passed: false,
				validation_status: "unverified",
				data_quality_issues: ["cash_reconciliation_failed"],
				account_return_pct: -7.492,
				sell_count: 8,
				closed_cycle_count: 1,
				verified_cycle_win_rate_pct: null,
				cash_residual: -74932,
				excluded_reconstruction_trade_count: 4,
				clean_forward_days: 0,
			}],
		},
	}),
}));

describe("portfolio evidence audit", () => {
	it("retains archived losses and shows unknown net win rate as unverified", async () => {
		render(<PortfolioAuditPanel />);
		expect(await screen.findByText("原竞价尾盘归档组合")).toBeInTheDocument();
		expect(screen.getByText("-7.49%")).toBeInTheDocument();
		expect(screen.getByText("8 / 1")).toBeInTheDocument();
		expect(screen.getAllByText(/未验证/).length).toBeGreaterThan(0);
		expect(screen.queryByText("0.00%")).not.toBeInTheDocument();
	});
});
