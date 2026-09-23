import type { AnalysisData } from "../src/pages/short-term-strategy/stock-analysis/presentation";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAnalysisDetail, fetchAnalysisHistory, fetchStockAnalysis } from "../src/api/strategy";
import AnalysisResult from "../src/pages/short-term-strategy/stock-analysis/analysis-result";
import { AnalysisSurface } from "../src/pages/short-term-strategy/stock-analysis/presentation";
import StockAnalysisPage, { HistoryTab } from "../src/pages/short-term-strategy/stock-analysis/workspace-page";

vi.mock("#src/api/strategy", () => ({ fetchAnalysisDetail: vi.fn(), fetchAnalysisHistory: vi.fn(), fetchStockAnalysis: vi.fn(), deleteAnalysisRecord: vi.fn() }));
vi.mock("#src/components/WatchlistModal", () => ({ default: () => null }));
vi.mock("#src/components/WatchlistPanel", () => ({ default: () => <div>自选内容</div> }));
vi.mock("#src/components/PortfolioAnalysisPanel", () => ({ default: () => <div>持仓内容</div> }));
vi.mock("#src/components/UnwindTrackingPanel", () => ({ default: () => <div>解套内容</div> }));
vi.mock("#src/components/StrategyPerformanceDashboard", () => ({ default: () => <div>绩效内容</div> }));
function report(extra: Partial<AnalysisData> = {}): AnalysisData {
	return { stock_code: "301566", stock_name: "测试股票", market: "a", market_date: "2026-09-23", action: "观望", confidence: 76, score: 64, risk_level: "高", summary: "研究结论测试", strategies_hit: 0, strategies_total: 10, llm_enhanced: true, analyzed_at: "2026-09-23 14:34:15", current_price: 27.29, change_pct: 0, strategy_analysis: [], buy_point: { price_low: 0, price_high: 0, description: "" }, sell_point: { price_low: 0, price_high: 0, description: "" }, stop_loss: { price: 0, description: "" }, position_advice: "等待", ...extra };
}
function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}
beforeEach(() => {
	vi.resetAllMocks();
	sessionStorage.clear();
	vi.mocked(fetchAnalysisHistory).mockResolvedValue({ status: "success", data: { items: [{ id: 1, ...report() }], total: 1, page: 1, page_size: 20 } });
});
afterEach(cleanup);
describe("stock analysis presentation and request lifecycle", () => {
	it("keeps missing direction unknown and preserves a genuine zero price change", () => {
		render(<AnalysisSurface><AnalysisResult data={report()} /></AnalysisSurface>);
		expect(screen.getByText("0.00%")).toBeInTheDocument();
		expect(screen.getAllByText("方向未提供")).toHaveLength(2);
		expect(screen.queryByText("震荡")).not.toBeInTheDocument();
		expect(screen.getByText("未经胜率校准")).toBeInTheDocument();
	});
	it("exposes degraded results and a buy/veto conflict without silently changing the stored advice", () => {
		render(<AnalysisSurface><AnalysisResult data={report({ llm_enhanced: false, action: "买入", score: 112, veto_checks: { veto_triggered: true, items: [] } })} /></AnalysisSurface>);
		expect(screen.getByText("本次为规则降级结果")).toBeInTheDocument();
		expect(screen.getByText(/原始建议仍为买入/)).toBeInTheDocument();
		expect(screen.getByText("原始值 112")).toBeInTheDocument();
		expect(screen.getByText("买入", { selector: "strong" })).toBeInTheDocument();
	});
	it("does not issue duplicate analysis calls from repeated Enter presses", async () => {
		const pending = deferred<Awaited<ReturnType<typeof fetchStockAnalysis>>>();
		vi.mocked(fetchStockAnalysis).mockReturnValue(pending.promise);
		render(<StockAnalysisPage />);
		const input = screen.getByRole("textbox", { name: "股票代码或公司名称" });
		fireEvent.change(input, { target: { value: "301566" } });
		fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13 });
		fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13 });
		expect(fetchStockAnalysis).toHaveBeenCalledTimes(1);
		await act(async () => pending.resolve({ status: "success", data: report() }));
		expect(await screen.findByText("研究结论测试")).toBeInTheDocument();
	});
	it("uses the backend stock filter without dropping Hong Kong leading zeroes", async () => {
		render(<AnalysisSurface><HistoryTab /></AnalysisSurface>);
		await screen.findByText("测试股票");
		const input = screen.getByRole("searchbox", { name: "按股票代码筛选历史" });
		fireEvent.change(input, { target: { value: "03750" } });
		fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13 });
		await waitFor(() => expect(fetchAnalysisHistory).toHaveBeenLastCalledWith({ page: 1, page_size: 20, stock_code: "03750" }));
	});
	it("ignores an older detail response after the drawer has closed and another record opened", async () => {
		const first = deferred<Awaited<ReturnType<typeof fetchAnalysisDetail>>>();
		const second = deferred<Awaited<ReturnType<typeof fetchAnalysisDetail>>>();
		vi.mocked(fetchAnalysisDetail).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		render(<AnalysisSurface><HistoryTab /></AnalysisSurface>);
		fireEvent.click(await screen.findByText("查看报告"));
		fireEvent.click(screen.getByRole("button", { name: /close/i }));
		fireEvent.click(screen.getByText("查看报告"));
		await act(async () => second.resolve({ status: "success", data: { analysis_data: report({ summary: "较新请求的报告" }) } }));
		await act(async () => first.resolve({ status: "success", data: { analysis_data: report({ summary: "不应显示的旧响应" }) } }));
		expect(await screen.findByText("较新请求的报告")).toBeInTheDocument();
		expect(screen.queryByText("不应显示的旧响应")).not.toBeInTheDocument();
	});
	it("restores the existing saved tracking tab and keeps the three workspace groups reachable", async () => {
		sessionStorage.setItem("stock_analysis_active_tab", "unwind");
		render(<StockAnalysisPage />);
		expect(screen.getByText("解套内容")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "战法复盘" }));
		expect(screen.getByText("绩效内容")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "个股研究" }));
		expect(await screen.findByText("测试股票")).toBeInTheDocument();
	});
});
