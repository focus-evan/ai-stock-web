import type { StrategyTradeCycle } from "#src/api/strategy";
import { fetchStrategyTradeJournal } from "#src/api/strategy";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StrategyFollowTab from "../src/components/strategy-follow-tab";
import StrategyTradeJournal from "../src/components/strategy-trade-journal";

vi.mock("#src/api/strategy", () => ({
	fetchStrategyTradeJournal: vi.fn(),
	fetchStrategyFollow: vi.fn(),
	fetchStrategyFollowHistory: vi.fn(),
	closeStrategyFollow: vi.fn(),
	triggerStrategyAutoFollow: vi.fn(),
	triggerStrategyFollowSnapshot: vi.fn(),
}));
const fetchJournal = vi.mocked(fetchStrategyTradeJournal);
const cycle: StrategyTradeCycle = {
	id: "41:002579:1",
	portfolio_id: 41,
	portfolio_name: "陈小群组合",
	portfolio_status: "active",
	stock_code: "002579",
	stock_name: "中京电子",
	status: "closed" as const,
	buy_date: "2026-09-07",
	buy_price: 10.125,
	buy_reason: "回封确认后买入",
	sell_date: "2026-09-08",
	sell_price: 12.5,
	sell_reason: "承接转弱止盈",
	buy_quantity: 50000,
	sell_quantity: 50000,
	verification_status: "verified",
	verification_issues: [],
	performance_eligible: true,
	buy_count: 1,
	sell_count: 1,
	remaining_quantity: 0,
	issues: [],
	executions: [
		{ trade_id: 1, direction: "buy" as const, date: "2026-09-07", price: 10.125, quantity: 50000, verification_status: "verified", verification_issue: null, reason: "回封确认后买入" },
		{ trade_id: 2, direction: "sell" as const, date: "2026-09-08", price: 12.5, quantity: 50000, verification_status: "verified", verification_issue: null, reason: "承接转弱止盈" },
	],
};
function response(items = [cycle]) {
	return { status: "success", data: { strategy_type: "a_share_leader_tactics" as const, items, total: items.length,	summary: { total: items.length, holding: 0, closed: items.length, incomplete: 0, unverified: items.filter(item => item.verification_status !== "verified").length, anomalous: items.filter(item => item.verification_status === "anomalous").length, excluded_reconstruction_count: 8 } } };
}

beforeEach(() => {
	vi.clearAllMocks();
	fetchJournal.mockResolvedValue(response());
});

describe("strategy executed trade journal", () => {
	it("shows all eight requested fields and expands the individual executions", async () => {
		render(<StrategyTradeJournal strategyType="a_share_leader_tactics" />);
		expect(await screen.findByText("中京电子")).toBeInTheDocument();
		for (const name of ["买入日期", "买入原因", "买入价格", "买入股数", "卖出日期", "卖出价格", "卖出股数", "卖出原因"])
			expect(screen.getByRole("columnheader", { name })).toBeInTheDocument();
		expect(screen.getByText("2026-09-07")).toBeInTheDocument();
		expect(screen.getByText("2026-09-08")).toBeInTheDocument();
		expect(screen.getByText("¥10.1250")).toBeInTheDocument();
		expect(screen.getByText("¥12.5000")).toBeInTheDocument();
		expect(screen.getAllByText("50,000 股")).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: /expand row|展开行/i }));
		expect(await screen.findByText("剩余持仓：0 股")).toBeInTheDocument();
		expect(screen.getAllByText("承接转弱止盈")).toHaveLength(2);
	});

	it("keeps absent sell fields empty for an open holding", async () => {
		const data = response();
		data.data.items = [{ ...cycle, status: "holding" as any, sell_date: null as any, sell_price: null as any, sell_reason: null as any, sell_count: 0, sell_quantity: 0, remaining_quantity: 100, executions: [cycle.executions[0]] }];
		fetchJournal.mockResolvedValue(data);
		render(<StrategyTradeJournal strategyType="a_share_leader_tactics" />);
		const row = (await screen.findByText("中京电子")).closest("tr")!;
		expect(within(row).getAllByText("未卖出")).toHaveLength(2);
		expect(within(row).getByText("0 股")).toBeInTheDocument();
		expect(within(row).getByText("—")).toBeInTheDocument();
		expect(within(row).queryByText("¥0.0000")).not.toBeInTheDocument();
	});

	it("flags the original anomalous record without inventing a corrected fill", async () => {
		fetchJournal.mockResolvedValue(response([{ ...cycle, buy_price: 2, sell_price: 6.8903, verification_status: "anomalous", performance_eligible: false, verification_issues: ["缺少原始成交盘口"], sell_reason: "硬性止盈：盈利245.5%" }]));
		render(<StrategyTradeJournal strategyType="beijing_chaogu_first_board" />);
		expect(await screen.findByText("价格异常，收益待核验")).toBeInTheDocument();
		expect(screen.getByText("发现 1 条价格异常记录，收益待核验")).toBeInTheDocument();
		expect(screen.getByText("¥2.0000")).toBeInTheDocument();
		expect(screen.getByText("硬性止盈：盈利245.5%")).toBeInTheDocument();
		expect(screen.getAllByText("50,000 股")).toHaveLength(2);
	});

	it("uses the executed journal by default for every strategy", async () => {
		for (const strategyType of ["dragon_head", "emotion_relay", "event_driven", "breakthrough", "volume_price", "overnight", "moving_average", "northbound", "trend_momentum", "combined", "yangjia_emotion_cycle", "kobe92_cycle_speculation", "a_share_leader_tactics", "beijing_chaogu_first_board"] as const) {
			const view = render(<StrategyFollowTab strategyType={strategyType} />);
			expect(screen.getByRole("tab", { name: "交易跟进" })).toHaveAttribute("aria-selected", "true");
			await waitFor(() => expect(fetchJournal).toHaveBeenLastCalledWith(strategyType, "all", 20, 0));
			view.unmount();
		}
	});

	it("does not let a late response from another strategy replace current records", async () => {
		let finish: (value: ReturnType<typeof response>) => void = () => {};
		fetchJournal.mockImplementationOnce(() => new Promise((resolve) => {
			finish = resolve;
		}));
		const view = render(<StrategyTradeJournal strategyType="dragon_head" />);
		view.rerender(<StrategyTradeJournal strategyType="a_share_leader_tactics" />);
		expect(await screen.findByText("中京电子")).toBeInTheDocument();
		await act(async () => {
			finish(response([{ ...cycle, stock_name: "旧战法结果" }]));
		});
		expect(screen.queryByText("旧战法结果")).not.toBeInTheDocument();
	});

	it("clears old results on filter failure and shows an error instead of zero trades", async () => {
		render(<StrategyTradeJournal strategyType="a_share_leader_tactics" />);
		await screen.findByText("中京电子");
		fetchJournal.mockRejectedValueOnce(new Error("network"));
		fireEvent.click(screen.getByText("已清仓", { selector: ".ant-segmented-item-label" }));
		expect(await screen.findByText(/获取交易跟进失败/)).toBeInTheDocument();
		expect(screen.queryByText("中京电子")).not.toBeInTheDocument();
		expect(screen.queryByText(/暂无实际模拟成交/)).not.toBeInTheDocument();
	});
});
