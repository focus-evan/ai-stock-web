import type { AggCompany, AggShadowStock, AggTrack, ShadowStockDashboardResponse, ShadowStockRecommendResponse, ShadowStockReportStatusResponse } from "../src/api/shadow-stock";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchShadowStockDashboard, fetchShadowStockRecommendations, fetchShadowStockReportHistory, fetchShadowStockReportStatus, generateShadowStockRecommendations, refreshShadowStockReport } from "../src/api/shadow-stock";
import ShadowStockPage from "../src/pages/shadow-stock";
import { buildShadowDimension, filterAggregateTracks, formatMetric } from "../src/pages/shadow-stock/data";
import { pollReport } from "../src/pages/shadow-stock/poll-report";
import ShadowStockRecommendPage from "../src/pages/shadow-stock/recommend";
import { useLatestRequest } from "../src/pages/shadow-stock/use-latest-request";

vi.mock("#src/api/shadow-stock", () => ({
	fetchShadowStockDashboard: vi.fn(),
	fetchShadowStockReportHistory: vi.fn(),
	fetchShadowStockReportStatus: vi.fn(),
	refreshShadowStockReport: vi.fn(),
	fetchShadowStockRecommendations: vi.fn(),
	generateShadowStockRecommendations: vi.fn(),
}));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: {
	children: React.ReactNode
}) => <div>{children}</div> }));
const holder = (extra: Partial<AggShadowStock> = {}): AggShadowStock => ({ holder_name: "甲股", holder_stock_code: "600001", holding_ratio: 2, holding_type: "直接", holder_market_cap: 100, gain_ratio: 3, holder_main_business: "设备", risk_level: "low", ...extra });
const company = (name: string, status: string, holdings = [holder()]): AggCompany => ({ company_name: name, ipo_status: status, target_market: "科创板", expected_valuation: 1000, importance_score: 70, latest_progress: "已受理", data_source: "公告", appear_count: 1, shadow_stocks: holdings });
const track = (name: string, companies: AggCompany[]): AggTrack => ({ track_name: name, track_description: "说明", heat_score: 50, policy_support: "", company_count: companies.length, companies });
const status = (value: ShadowStockReportStatusResponse["status"]): ShadowStockReportStatusResponse => ({ status: value, batch_id: "new-batch" });
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchShadowStockReportHistory).mockResolvedValue({ status: "ok", data: [], total: 0, page: 1, page_size: 50 });
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
describe("shadow stock aggregation", () => {
	it("does not invent zero for missing/nonfinite metrics and uses the supplied unit", () => {
		expect(formatMetric(null)).toBe("待核验");
		expect(formatMetric(Number.NaN)).toBe("待核验");
		expect(formatMetric(30, 1, "倍")).toBe("30.0倍");
		expect(formatMetric(0, 1, "%")).toBe("0.0%");
	});
	it("counts one company once across tracks and keeps the highest known risk", () => {
		const result = buildShadowDimension([track("芯片", [company("甲IPO", "已受理")]), track("AI", [company("甲IPO", "已受理", [holder({ risk_level: "high" })])])]);
		expect(result).toHaveLength(1);
		expect(result[0].linked_count).toBe(1);
		expect(result[0].avg_gain).toBe(3);
		expect(result[0].risk_level).toBe("high");
		expect(result[0].linked_companies[0].track_name).toContain("AI");
	});
	it("requires company and status filters to match the same relationship", () => {
		const tracks = [track("AI", [company("甲IPO", "已受理"), company("乙IPO", "已注册")])];
		expect(buildShadowDimension(filterAggregateTracks(tracks, "甲", "", ["已注册"]))).toEqual([]);
		const filtered = buildShadowDimension(filterAggregateTracks(tracks, "乙", "", ["已注册"]));
		expect(filtered[0].linked_count).toBe(1);
		expect(filtered[0].linked_companies[0].company_name).toBe("乙IPO");
	});
	it("filters holder rows consistently in both dimensions", () => {
		const tracks = [track("AI", [company("甲IPO", "已受理", [holder(), holder({ holder_name: "乙股", holder_stock_code: "600002" })])])];
		const result = filterAggregateTracks(tracks, "", "600002", []);
		expect(result[0].companies[0].shadow_stocks).toHaveLength(1);
		expect(buildShadowDimension(result)[0].holder_name).toBe("乙股");
	});
	it("does not dilute missing calculations into an apparently valid average", () => {
		const result = buildShadowDimension([track("AI", [company("甲IPO", "已受理"), company("乙IPO", "已受理", [holder({ gain_ratio: 0, calculation_available: false, risk_level: "" })])])]);
		expect(result[0].avg_gain).toBeNull();
		expect(result[0].risk_level).toBe("unknown");
	});
});
describe("request lifecycle", () => {
	it("aborts the older request and ignores its late response", async () => {
		const old = deferred<string>();
		const current = deferred<string>();
		const { result } = renderHook(() => useLatestRequest<string>());
		let signal!: AbortSignal;
		act(() => {
			void result.current.run((s) => {
				signal = s;
				return old.promise;
			});
		});
		act(() => {
			void result.current.run(() => current.promise);
		});
		expect(signal.aborted).toBe(true);
		await act(async () => {
			current.resolve("new");
		});
		await act(async () => {
			old.resolve("old");
		});
		expect(result.current.data).toBe("new");
		expect(result.current.loading).toBe(false);
	});
	it("clears previous results when a new history request fails", async () => {
		const { result } = renderHook(() => useLatestRequest<string[]>());
		await act(async () => {
			await result.current.run(async () => ["old"]);
		});
		await act(async () => {
			await result.current.run(async () => {
				throw new Error("offline");
			});
		});
		expect(result.current.data).toBeNull();
		expect(result.current.error).toContain("加载失败");
	});
	it("cancels on unmount", () => {
		const { result, unmount } = renderHook(() => useLatestRequest<string>());
		let signal!: AbortSignal;
		act(() => {
			void result.current.run((s) => {
				signal = s;
				return new Promise(() => {
				});
			});
		});
		unmount();
		expect(signal.aborted).toBe(true);
	});
});
describe("report polling", () => {
	it("never overlaps status requests and stops on completion", async () => {
		vi.useFakeTimers();
		const pending = deferred<ShadowStockReportStatusResponse>();
		const check = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(status("completed"));
		const task = pollReport(check, new AbortController().signal, 100, 10000);
		await vi.advanceTimersByTimeAsync(500);
		expect(check).toHaveBeenCalledTimes(1);
		pending.resolve(status("running"));
		await vi.advanceTimersByTimeAsync(100);
		expect((await task).status).toBe("completed");
		expect(check).toHaveBeenCalledTimes(2);
		expect(vi.getTimerCount()).toBe(0);
	});
	it("cancels sleeping polls on unmount without leaking timers", async () => {
		vi.useFakeTimers();
		const controller = new AbortController();
		const task = pollReport(async () => status("running"), controller.signal, 100);
		const assertion = expect(task).rejects.toMatchObject({ name: "AbortError" });
		await vi.advanceTimersByTimeAsync(0);
		controller.abort();
		await assertion;
		expect(vi.getTimerCount()).toBe(0);
	});
	it("reports a missing batch immediately instead of waiting fifteen minutes", async () => {
		const check = vi.fn().mockResolvedValue(status("not_found"));
		expect((await pollReport(check, new AbortController().signal)).status).toBe("not_found");
		expect(check).toHaveBeenCalledTimes(1);
	});
	it("ends after three consecutive transport failures", async () => {
		vi.useFakeTimers();
		const check = vi.fn().mockRejectedValue(new Error("offline"));
		const task = pollReport(check, new AbortController().signal, 100);
		const assertion = expect(task).rejects.toThrow("连续三次");
		await vi.advanceTimersByTimeAsync(200);
		await assertion;
		expect(check).toHaveBeenCalledTimes(3);
	});
});
const dashboard = { status: "ok", batch_id: "batch", tracks: [{ id: 1, track_name: "芯片", heat_score: 60 }, { id: 2, track_name: "机器人", heat_score: 50 }], top_ipo_targets: [{ id: 1, track_id: 1, company_name: "甲IPO", industry_pe: 30, expected_valuation: 100, importance_score: 60, ipo_status: "已受理", holdings: [], data_source: "交易所公告", progress_date: "2026-09-18" }, { id: 2, track_id: 2, company_name: "乙IPO", industry_pe: 20, expected_valuation: 50, importance_score: 50, ipo_status: "状态未知", holdings: [] }] } as unknown as ShadowStockDashboardResponse;
describe("shadow stock page behavior", () => {
	it("uses PE multiples, shows provenance, and keeps detail within selected track", async () => {
		vi.mocked(fetchShadowStockDashboard).mockResolvedValue(dashboard);
		render(<ShadowStockPage />);
		expect(await screen.findByText("30.0倍")).toBeInTheDocument();
		expect(screen.getByText("交易所公告")).toBeInTheDocument();
		fireEvent.click(screen.getByText("机器人"));
		expect(await screen.findByText("乙IPO — 影子股分析")).toBeInTheDocument();
		expect(screen.queryByText("甲IPO — 影子股分析")).not.toBeInTheDocument();
	});
	it("recovers an existing running report without creating another job", async () => {
		vi.mocked(fetchShadowStockDashboard).mockResolvedValueOnce({ status: "no_data", running_report: { batch_id: "new-batch", status: "running" } } as ShadowStockDashboardResponse).mockResolvedValue(dashboard);
		vi.mocked(fetchShadowStockReportStatus).mockResolvedValue(status("completed"));
		render(<ShadowStockPage />);
		expect(await screen.findByText("30.0倍")).toBeInTheDocument();
		expect(refreshShadowStockReport).not.toHaveBeenCalled();
		expect(fetchShadowStockReportStatus).toHaveBeenCalledWith("new-batch", expect.any(AbortSignal));
	});
	it("distinguishes load errors from an empty report", async () => {
		vi.mocked(fetchShadowStockDashboard).mockRejectedValue(new Error("offline"));
		render(<ShadowStockPage />);
		expect(await screen.findByText(/加载失败，请重试/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "重新查询" })).toBeInTheDocument();
	});
	it("labels history snapshots and renders unavailable values without crashing", async () => {
		vi.mocked(fetchShadowStockRecommendations).mockResolvedValue({ status: "ok", recommend_date: "2026-09-18", total: 1, historical_only: true, type_distribution: {}, level_distribution: {}, recommendations: [{ id: 1, rank: 1, holder_name: "历史甲股", total_score: null, adjusted_gain_ratio: null, holder_market_cap: null, holding_ratio: null, expected_valuation: null, elasticity_score: null, safety_score: null, ipo_progress_score: null, track_heat_score: null, confidence_score: null, is_historical: true }] } as unknown as ShadowStockRecommendResponse);
		render(<ShadowStockRecommendPage />);
		expect(await screen.findByText("历史甲股")).toBeInTheDocument();
		expect(screen.getByText("历史评分快照")).toBeInTheDocument();
		expect(screen.getAllByText("待核验").length).toBeGreaterThan(0);
		expect(screen.queryByText("辅导中")).not.toBeInTheDocument();
	});
});

it("clears displayed recommendations when generating returns no_eligible", async () => {
	vi.mocked(fetchShadowStockRecommendations).mockResolvedValueOnce({ status: "ok", recommend_date: "2026-09-18", total: 1, type_distribution: {}, level_distribution: {}, recommendations: [{ id: 1, rank: 1, holder_name: "不再符合条件的旧股" }] } as ShadowStockRecommendResponse).mockResolvedValue({ status: "no_data", recommend_date: null, total: 0, type_distribution: {}, level_distribution: {}, recommendations: [], message: "无合格候选" });
	vi.mocked(generateShadowStockRecommendations).mockResolvedValue({ status: "no_eligible", count: 0, message: "无合格候选" });
	render(<ShadowStockRecommendPage />);
	expect(await screen.findByText("不再符合条件的旧股")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "🔄 立即生成推荐" }));
	await waitFor(() => expect(screen.queryByText("不再符合条件的旧股")).not.toBeInTheDocument());
	expect(fetchShadowStockRecommendations).toHaveBeenLastCalledWith(undefined, expect.any(AbortSignal));
});

it("treats an already running recommendation job as progress", async () => {
	vi.mocked(fetchShadowStockRecommendations).mockResolvedValue({ status: "no_data", recommend_date: null, total: 0, type_distribution: {}, level_distribution: {}, recommendations: [] });
	vi.mocked(generateShadowStockRecommendations).mockResolvedValue({ status: "running", message: "已有推荐任务正在生成" });
	render(<ShadowStockRecommendPage />);
	fireEvent.click(await screen.findByRole("button", { name: "🔄 立即生成推荐" }));
	expect(await screen.findByText("已有推荐任务正在生成")).toBeInTheDocument();
});
