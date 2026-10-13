import type { AnalysisData } from "../src/pages/short-term-strategy/stock-analysis/presentation";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAnalysisDetail, fetchAnalysisHistory, fetchStockAnalysis, retrySaveStockAnalysis } from "../src/api/strategy";
import AnalysisResult from "../src/pages/short-term-strategy/stock-analysis/analysis-result";
import { AnalysisSurface } from "../src/pages/short-term-strategy/stock-analysis/presentation";
import StockAnalysisPage, { HistoryTab } from "../src/pages/short-term-strategy/stock-analysis/workspace-page";

vi.mock("#src/api/strategy", () => ({ fetchAnalysisDetail: vi.fn(), fetchAnalysisHistory: vi.fn(), fetchStockAnalysis: vi.fn(), deleteAnalysisRecord: vi.fn(), retrySaveStockAnalysis: vi.fn() }));
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
	window.history.replaceState({}, "", "/short-term-strategy/stock-analysis");
	vi.mocked(fetchAnalysisHistory).mockResolvedValue({ status: "success", data: { items: [{ id: 1, ...report() }], total: 1, page: 1, page_size: 20 } });
});
afterEach(cleanup);
describe("stock analysis presentation and request lifecycle", () => {
	it("shows six research layers and distinguishes holder concentration from cost and crowding", () => {
		const data = report({ research_report: {
			version: "stock-research-v1",
			headline: "观察",
			key_reasons: [],
			key_risks: [],
			boundary: "",
			layers: ["macro", "industry", "company", "valuation", "technical", "chips"].map(key => ({
				key: key as "macro",
				title: key === "chips" ? "筹码与拥挤度" : key,
				question: "判断问题",
				status: "数据不足",
				conclusion: `结论-${key}`,
				key_points: [],
				risks: [],
				watch_points: [],
				invalidation: [],
				data_gaps: [],
				sources: [],
			})),
			data_snapshot: { chips: { holder_history: [{ as_of: "2026-06-30", count: 40000 }, { as_of: "2026-09-30", count: 30000 }], holder_change_pct: -25, ownership_trend: "趋于集中", share_capital_comparable: true, top10_float_pct: null, cost: { as_of: "2026-10-12", concentration_90_pct: 5.26, profit_ratio_pct: 90 }, cost_trend: "数据不足", turnover_rate_pct: 0 } },
		} });
		render(<AnalysisSurface><AnalysisResult data={data} historical /></AnalysisSurface>);
		expect(screen.getByLabelText("分层分析总览").querySelectorAll("button")).toHaveLength(6);
		fireEvent.click(screen.getByRole("tab", { name: "筹码与拥挤度" }));
		expect(screen.getByText("持仓集中：股票在谁手里")).toBeInTheDocument();
		expect(screen.getByText("成本集中：买入价格是否接近")).toBeInTheDocument();
		expect(screen.getByText("交易拥挤：是否涨得急、换手热")).toBeInTheDocument();
		expect(screen.getByText("5.26%")).toBeInTheDocument();
		expect(screen.getByText("0.00%", { selector: "dd" })).toBeInTheDocument();
		expect(screen.getByText("90.00%")).toBeInTheDocument();
	});
	it("keeps legacy macro and chip conclusions explicitly missing", () => {
		render(<AnalysisSurface><AnalysisResult data={report()} historical /></AnalysisSurface>);
		fireEvent.click(screen.getByRole("tab", { name: "宏观环境" }));
		expect(screen.getByText("该次分析未记录这一层", { selector: ".ant-alert-message" })).toBeInTheDocument();
		expect(screen.queryByText("主力已经控盘")).not.toBeInTheDocument();
	});
	it("opens a historical deep link with its stock filter and saved record id", async () => {
		vi.mocked(fetchAnalysisDetail).mockResolvedValue({ status: "success", data: { analysis_data: report({ summary: "指定历史快照" }) } });
		render(<AnalysisSurface><HistoryTab initialFilter="03750" initialId={7} /></AnalysisSurface>);
		expect(await screen.findByText("指定历史快照")).toBeInTheDocument();
		expect(fetchAnalysisDetail).toHaveBeenCalledWith(7);
		expect(fetchAnalysisHistory).toHaveBeenCalledWith({ stock_code: "03750", page: 1, page_size: 20 });
	});
	it("shows layered conclusions in the historical timeline", async () => {
		vi.mocked(fetchAnalysisHistory).mockResolvedValue({ status: "success", data: { items: [{ id: 4, ...report(), research_overview: { version: "stock-research-v1", headline: "当时判断的摘要", layers: [{ key: "macro", title: "宏观环境", status: "承压", conclusion: "大盘宽度走弱" }] } }], total: 1, page: 1, page_size: 20 } });
		render(<AnalysisSurface><HistoryTab /></AnalysisSurface>);
		expect(await screen.findByText("当时判断的摘要")).toBeInTheDocument();
		expect(screen.getByText("大盘宽度走弱")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "打开历史页面" })).toHaveAttribute("href", "/short-term-strategy/stock-analysis?tab=history&stock_code=301566&analysis_id=4");
	});
	it("opens the saved page through the existing backend-menu route and query parameters", async () => {
		window.history.replaceState({}, "", "/short-term-strategy/stock-analysis?tab=history&stock_code=03750&analysis_id=7");
		vi.mocked(fetchAnalysisDetail).mockResolvedValue({ status: "success", data: { analysis_data: report({ summary: "链接指定的历史报告" }) } });
		render(<StockAnalysisPage />);
		expect(await screen.findByText("链接指定的历史报告")).toBeInTheDocument();
		expect(fetchAnalysisHistory).toHaveBeenCalledWith({ stock_code: "03750", page: 1, page_size: 20 });
		expect(fetchAnalysisDetail).toHaveBeenCalledWith(7);
	});
	it("retries saving an unsaved result without running analysis again", async () => {
		const frozen = report({ history_saved: false, history_error: "保存失败" });
		vi.mocked(fetchStockAnalysis).mockResolvedValue({ status: "success", data: frozen });
		vi.mocked(retrySaveStockAnalysis).mockResolvedValue({ status: "success", data: { history_id: 8, history_saved: true } });
		render(<StockAnalysisPage />);
		fireEvent.change(screen.getByRole("textbox", { name: "股票代码或公司名称" }), { target: { value: "301566" } });
		fireEvent.click(screen.getByText("开始分析"));
		fireEvent.click(await screen.findByText("重试保存"));
		expect(await screen.findByText("打开本次历史分析")).toBeInTheDocument();
		expect(fetchStockAnalysis).toHaveBeenCalledTimes(1);
		expect(retrySaveStockAnalysis).toHaveBeenCalledWith(frozen);
	});
	it("does not attach a delayed save response to a newer analysis even with the same code and timestamp", async () => {
		const pending = deferred<Awaited<ReturnType<typeof retrySaveStockAnalysis>>>();
		vi.mocked(fetchStockAnalysis).mockResolvedValueOnce({ status: "success", data: report({ history_saved: false }) }).mockResolvedValueOnce({ status: "success", data: report({ stock_name: "第二次分析", history_saved: false }) });
		vi.mocked(retrySaveStockAnalysis).mockReturnValue(pending.promise);
		render(<StockAnalysisPage />);
		const input = screen.getByRole("textbox", { name: "股票代码或公司名称" });
		fireEvent.change(input, { target: { value: "301566" } });
		fireEvent.click(screen.getByText("开始分析"));
		fireEvent.click(await screen.findByText("重试保存"));
		fireEvent.click(screen.getByText("开始分析"));
		await screen.findByRole("heading", { name: /第二次分析/ });
		await act(async () => pending.resolve({ status: "success", data: { history_id: 8, history_saved: true } }));
		expect(screen.queryByText("打开本次历史分析")).not.toBeInTheDocument();
		expect(screen.getByText("分析已完成，历史尚未保存")).toBeInTheDocument();
	});
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
