import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnwindPortfolioRisk } from "../src/api/strategy/unwind-extra";
import PortfolioRisk from "../src/components/UnwindTrackingPanel/portfolio-risk";
import { StrategyOverview } from "../src/components/UnwindTrackingPanel/strategy-blocks";

vi.mock("#src/api/strategy/unwind-extra", () => ({ fetchUnwindPortfolioRisk: vi.fn(), saveUnwindPortfolioRisk: vi.fn(), fetchUnwindBacktest: vi.fn(), saveUnwindSettings: vi.fn() }));
afterEach(cleanup);

describe("unwind safety presentation", () => {
	it("shows cumulative loss instead of declaring recovery from a lower cost basis", () => {
		const analysis: any = { currency_symbol: "¥", diagnosis: { class: "E", label: "破位观察", why: "价格破位" } };
		const plan: any = { recovery: { available: true, total_pnl: -2005, additional_capital: 0, total_recovered: false, scope: "含实际费用" } };
		render(<StrategyOverview plan={plan} analysis={analysis} />);
		expect(screen.getByText("整体尚未回本")).toBeTruthy();
		expect(screen.getByText("累计总损益（含减仓和费用）")).toBeTruthy();
		expect(screen.queryByText("已登记账本整体回本")).toBeNull();
		expect(screen.getByText(/破位观察/)).toBeTruthy();
	});
	it("keeps a newly triggered review visibly pending", () => {
		const analysis: any = { diagnosis: { class: "B", label: "下行", why: "趋势" }, review: { triggered: true, pending: true, completed: false, reasons: ["需要事件之后的新报告"] } };
		render(<StrategyOverview plan={{} as any} analysis={analysis} />);
		expect(screen.getByText("已到复盘线，请先完成基本面复核")).toBeTruthy();
		expect(screen.getByText("需要事件之后的新报告")).toBeTruthy();
	});
	it("opens explicit portfolio funding controls with cash-source limitations", async () => {
		vi.mocked(fetchUnwindPortfolioRisk).mockResolvedValue({ status: "success", data: {
			net_assets: 0,
			available_cash: 0,
			cash_floor: 0,
			total_add_budget: 0,
			max_single_weight_pct: 20,
			max_group_weight_pct: 35,
			stress_drop_pct: 20,
			max_stress_loss_pct: 5,
		} });
		render(<PortfolioRisk onSaved={() => {}} />);
		fireEvent.click(screen.getByText("组合资金与风险上限"));
		await waitFor(() => expect(screen.getByText("确认今日组合资金")).toBeTruthy());
		expect(screen.getByText(/本功能不读取券商余额/)).toBeTruthy();
		expect(screen.getByText("同产业链最高仓位")).toBeTruthy();
	});
});
