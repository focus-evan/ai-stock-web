import type { ResearchOverview, ResearchReport } from "#src/api/institutional-research";
import { fetchInstitutionalReport, fetchInstitutionalResearch, refreshInstitutionalResearch } from "#src/api/institutional-research";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstitutionalResearchPage from "../src/pages/institutional-research";
import { filterReports, percent, safeLink } from "../src/pages/institutional-research/data";
import { ensureInstitutionalResearchRoute } from "../src/router/utils/ensure-institutional-research-route";

vi.mock("#src/api/institutional-research", () => ({ fetchInstitutionalResearch: vi.fn(), fetchInstitutionalReport: vi.fn(), refreshInstitutionalResearch: vi.fn(), backfillInstitutionalResearch: vi.fn(), importInstitutionalReport: vi.fn() }));
vi.mock("#src/store/user", () => ({ useUserStore: (selector: (s: { roles: string[], username: string }) => unknown) => selector({ roles: ["admin"], username: "admin" }) }));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("echarts-for-react", () => ({ default: () => <div>行情走势图</div> }));

const report: ResearchReport = {
	id: "r1",
	institution: "morgan_stanley",
	published_at: "2026-10-09T08:00:00+08:00",
	first_seen_at: "2026-10-09T08:05:00+08:00",
	content_hash: "hash",
	payload: { title: "合成测试报告", report_key: "fixture", summary: "仅用于测试的研究判断", source_url: "https://example.com/report", content: "测试证据正文", evidence_level: "reprint", time_precision: "unknown", verified: false, scope: "stock", direction: "bearish", evaluation_symbol: "sz300502", benchmark: "sh000300", impacts: [{ symbol: "sz300502", name: "新易盛", direction: "bearish", relation: "industry_chain", mechanism: "测试中的产业链成本压力", evidence_quote: "测试证据正文", watch_next: "采购成本变化" }] },
	review: null,
};
const initial: ResearchOverview = {
	reports: [report],
	scorecards: [],
	diagnostics: { archived: 1, verified: 0, observed: 0, unknown_time: 1, eligible: 0 },
	institution_coverage: [{ institution: "morgan_stanley", name: "摩根士丹利", group: "focus", archived: 1, verified: 0, observed: 0, eligible_samples: 0, unknown_time: 1, waiting: 0, reason: "1条原报告时间待核验；1条原文待核验" }],
	history: [{ id: "run1", status: "partial", started_at: "2026-10-11T00:00:00Z", payload: { sources: [{ source_id: "morgan_stanley", source_name: "摩根士丹利", status: "failed", count: 0, errors: ["访问失败"] }], errors: [], new_reports: 1 } }],
	sources: [{ id: "morgan_stanley", name: "摩根士丹利", pages: [], limitations: "仅公开信息" }],
	runtime: { enabled: true, running: true, time: "07:45", timezone: "Asia/Shanghai" },
	holdings_status: "ok",
	holdings_as_of: "2026-10-11T08:00:00+08:00",
	holdings: [{ symbol: "sz300502", name: "新易盛", shares: 100, impacts: [{ ...report.payload.impacts[0], report_id: "r1", institution: "morgan_stanley" }] }],
	fresh_report_ids: ["r1"],
	coverage_note: "覆盖有限，无匹配不代表无风险",
	record_limit: 500,
};
const clients: QueryClient[] = [];
function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
	clients.push(client);
	return render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App><InstitutionalResearchPage /></App></ConfigProvider></QueryClientProvider>);
}
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: structuredClone(initial) });
	vi.mocked(fetchInstitutionalReport).mockResolvedValue({ data: report });
});
afterEach(() => {
	cleanup();
	clients.splice(0).forEach(c => c.clear());
});

describe("institutional research", () => {
	it("shows holding impact as inference and opens its evidence", async () => {
		mount();
		expect(await screen.findByText("测试中的产业链成本压力")).toBeInTheDocument();
		expect(screen.getByText("产业链推断")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "查看报告与证据" }));
		expect(await screen.findByText("尚未核对原报告时间，保留证据，暂不做历史检验")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "打开来源" })).toHaveAttribute("href", report.payload.source_url);
	}, 20000);
	it("never describes a holdings API failure as no exposure", async () => {
		vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { ...initial, holdings: [], holdings_status: "unavailable" } });
		mount();
		expect(await screen.findByText("持仓读取失败，无法判断影响范围")).toBeInTheDocument();
		expect(screen.queryByText("当前账号尚无有效持仓，请先维护自选盯盘")).not.toBeInTheDocument();
	});
	it("shows source failure and leaves absent scorecards empty", async () => {
		mount();
		fireEvent.click(await screen.findByRole("tab", { name: "来源与运行记录" }));
		expect(await screen.findByText("访问失败")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("tab", { name: "机构历史匹配度" }));
		expect(await screen.findByText("1条原报告时间待核验；1条原文待核验")).toBeInTheDocument();
		expect(screen.getByText(/尚无符合条件的到期样本/)).toBeInTheDocument();
		expect(screen.queryByText("100%")).not.toBeInTheDocument();
	});
	it("manual refresh joins the existing job", async () => {
		vi.mocked(refreshInstitutionalResearch).mockResolvedValue({ status: "busy", run_id: "run1" });
		mount();
		fireEvent.click(await screen.findByRole("button", { name: "采集并更新检验" }));
		await waitFor(() => expect(refreshInstitutionalResearch).toHaveBeenCalledTimes(1));
		expect(await screen.findByText("已有任务运行，正在查看进度")).toBeInTheDocument();
	});
	it("uses safe source links and does not turn missing return into zero", () => {
		expect(safeLink("javascript:alert(1)")).toBeUndefined();
		expect(percent(undefined)).toBe("—");
		expect(filterReports([report], "", "新易盛")).toHaveLength(1);
		expect(filterReports([report], "citi", "")).toHaveLength(0);
	});
	it("keeps configured permissions and adds the separate module only once", () => {
		const existing = [{ path: "/institutional-research", handle: { title: "机构研报研究", roles: ["researcher"] } }];
		expect(ensureInstitutionalResearchRoute(existing, [])).toBe(existing);
		expect(ensureInstitutionalResearchRoute([], existing)).toEqual(existing);
	});
});
