import type { IntelligenceArticle, IntelligenceOverview, IntelligenceRun } from "../src/api/market-intelligence";
import type { AppRouteRecordRaw } from "../src/router/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchIntelligence, fetchIntelligenceRun, refreshIntelligence } from "../src/api/market-intelligence";
import MarketIntelligencePage from "../src/pages/market-intelligence";
import { filterArticles, safeHref } from "../src/pages/market-intelligence/data";
import { ensureMarketIntelligenceRoute } from "../src/router/utils/ensure-market-intelligence-route";

vi.mock("#src/api/market-intelligence", () => ({ fetchIntelligence: vi.fn(), fetchIntelligenceRun: vi.fn(), refreshIntelligence: vi.fn(), setIntelligenceSource: vi.fn() }));
vi.mock("#src/store/user", () => ({ useUserStore: (selector: (s: { roles: string[] }) => unknown) => selector({ roles: ["user"] }) }));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

const evidence: IntelligenceArticle = { id: "e1", source_id: "pbc", source_name: "央行", category: "policy", title: "政策原文标题", url: "https://www.pbc.gov.cn/article", published_at: "2026-09-28T08:00:00+08:00", fetched_at: "2026-09-28T09:00:00+08:00", publisher: "央行", content: "真实抓取的证据全文", evidence_level: "official", freshness: "current", duplicate_source_ids: [], is_new: true };
const run: IntelligenceRun = { run_id: "latest", status: "completed", started_at: "2026-09-28T01:00:00Z", cutoff: "2026-09-28T09:00:00+08:00", source_status: [], report: { analysis_status: "completed", articles: [evidence], coverage: { enabled: 17, responded: 16, failed: 1, limited: 0, articles: 1, new_articles: 1, analyzed: 1, undated: 0 }, analysis: { headline: "今日最重要的政策变化", summary: "只描述本轮证据", highlights: [{ title: "新增流动性支持", priority: "high", category: "policy", fact: "官方公布具体措施", why_it_matters: "资金条件可能改善", impact: "uncertain", affected_sectors: ["金融"], watch_next: "等待实施数据", uncertainty: "尚无盘面确认", evidence_ids: ["e1"] }], risks: ["关注执行进度"], disagreements: [], watchlist: [] } } };
const initial: IntelligenceOverview = { run, history: [{ ...run, run_id: "old", cutoff: "2026-09-27T09:00:00+08:00" }], sources: [{ id: "pbc", name: "央行", category: "policy", enabled: true, priority: "核心事实源", intended_use: "政策跟踪", limitations: "不能直接当买入信号" }], categories: [{ id: "policy", name: "政策与流动性" }], runtime: { enabled: true, running: true, time: "07:30", timezone: "Asia/Shanghai", every_day: true, next_run_at: "2026-09-29T07:30:00+08:00", catch_up: "支持补跑" } };
const clients: QueryClient[] = [];
function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
	clients.push(client);
	return render(<QueryClientProvider client={client}><App><MarketIntelligencePage /></App></QueryClientProvider>);
}
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchIntelligence).mockResolvedValue({ data: structuredClone(initial) });
	vi.mocked(fetchIntelligenceRun).mockResolvedValue({ data: run });
});
afterEach(() => {
	cleanup();
	clients.splice(0).forEach(client => client.clear());
});

describe("daily intelligence reader", () => {
	it("puts the important change first and opens actual source evidence", async () => {
		mount();
		expect(await screen.findByText("今日最重要的政策变化")).toBeInTheDocument();
		expect(screen.getByText("官方公布具体措施")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "央行 · 查看证据" }));
		expect(await screen.findByText("真实抓取的证据全文")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "打开来源页面" })).toHaveAttribute("href", evidence.url);
	});
	it("shows coverage failures instead of pretending the report is complete", async () => {
		mount();
		expect(await screen.findByText(/1 个来源抓取失败/)).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "信息源与抓取状态" }));
		expect(await screen.findByRole("switch", { name: "启用央行" })).toBeDisabled();
	});
	it("keeps original articles readable when AI fails", async () => {
		const broken = structuredClone(initial);
		broken.run!.status = "failed";
		broken.run!.error = "AI引用未通过验证";
		broken.run!.report!.analysis = null;
		broken.run!.report!.analysis_status = "failed";
		vi.mocked(fetchIntelligence).mockResolvedValue({ data: broken });
		mount();
		expect(await screen.findByText("本轮分析未完成")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "分类原文（1）" }));
		expect(await screen.findByRole("link", { name: /政策原文标题/ })).toBeInTheDocument();
		expect(screen.queryByText("今日最重要的政策变化")).not.toBeInTheDocument();
	});
	it("joins an existing job and polls its run without a duplicate trigger", async () => {
		vi.mocked(refreshIntelligence).mockResolvedValue({ status: "busy", run_id: "busy-run" });
		vi.mocked(fetchIntelligenceRun).mockResolvedValue({ data: { ...run, run_id: "busy-run", status: "collecting", report: undefined } });
		mount();
		await screen.findByText("今日最重要的政策变化");
		fireEvent.click(screen.getByRole("button", { name: "立即抓取并分析" }));
		expect(await screen.findByText("正在抓取")).toBeInTheDocument();
		expect(refreshIntelligence).toHaveBeenCalledTimes(1);
	});
	it("a late historical response cannot replace the latest report", async () => {
		let resolve!: (value: { data: IntelligenceRun }) => void;
		vi.mocked(fetchIntelligenceRun).mockReturnValue(new Promise((done) => {
			resolve = done;
		}));
		mount();
		await screen.findByText("今日最重要的政策变化");
		fireEvent.click(screen.getByRole("tab", { name: "历史情报" }));
		fireEvent.click(await screen.findByRole("button", { name: "查看本批次" }));
		await waitFor(() => expect(fetchIntelligenceRun).toHaveBeenCalledWith("old"));
		fireEvent.click(screen.getByRole("button", { name: "查看最新" }));
		const old = structuredClone(run);
		old.report!.analysis!.headline = "过期报告";
		resolve({ data: old });
		await waitFor(() => expect(screen.queryByText("过期报告")).not.toBeInTheDocument());
		expect(screen.getByText("今日最重要的政策变化")).toBeInTheDocument();
	}, 20000);
});

describe("classification and route integration", () => {
	it("filters source and category together and rejects executable links", () => {
		expect(filterArticles([evidence], "policy", "央行")).toHaveLength(1);
		expect(filterArticles([evidence], "industry", "央行")).toHaveLength(0);
		expect(safeHref("javascript:alert(1)")).toBeUndefined();
	});
	it("adds navigation in backend menu mode without duplicating restricted entries", () => {
		const module: AppRouteRecordRaw[] = [{ path: "/market-intelligence", handle: { title: "每日重点情报" } }];
		const existing: AppRouteRecordRaw[] = [{ path: "/market-intelligence", handle: { title: "每日重点情报", roles: ["researcher"] } }];
		expect(ensureMarketIntelligenceRoute(existing, module)).toBe(existing);
		expect(ensureMarketIntelligenceRoute([], module)).toEqual(module);
	});
});
