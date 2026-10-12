import type { ResearchOverview, ResearchReport } from "#src/api/institutional-research";
import { backfillPublicResearch, fetchInstitutionalReport, fetchInstitutionalResearch, rebuildHoldingAssociations, refreshInstitutionalResearch } from "#src/api/institutional-research";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InstitutionalResearchPage from "../src/pages/institutional-research";
import { filterReports, percent, safeLink } from "../src/pages/institutional-research/data";
import { ensureInstitutionalResearchRoute } from "../src/router/utils/ensure-institutional-research-route";

vi.mock("#src/api/institutional-research", () => ({ fetchInstitutionalResearch: vi.fn(), fetchInstitutionalReport: vi.fn(), refreshInstitutionalResearch: vi.fn(), backfillInstitutionalResearch: vi.fn(), backfillFocusResearch: vi.fn(), backfillPublicResearch: vi.fn(), rebuildHoldingAssociations: vi.fn(), importInstitutionalReport: vi.fn() }));
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
	holdings: [{ symbol: "sz300502", name: "新易盛", shares: 100, impacts: [{ ...report.payload.impacts[0], report_id: "r1", institution: "morgan_stanley", title: "报告甲：成本压力", summary: "原报告只讨论采购成本压力" }] }],
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
	it("opens personalized bull and bear conditions from a message and filters unrelated messages", async () => {
		const own = { ...report.payload.impacts[0], report_id: report.id, analysis_origin: "system_inference" as const, relation: "macro", bull_case: "需求落地时存在支持", bear_case: "高利率对估值形成压力", horizon: "短期估值", verified: false };
		const linked = { ...report, holding_impacts: [own], holding_impact_status: "matched" as const };
		const unrelated = { ...report, id: "unrelated", payload: { ...report.payload, title: "不相关的机构消息" }, holding_impacts: [], holding_impact_status: "no_match" as const };
		vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { ...initial, reports: [linked, unrelated] } });
		vi.mocked(rebuildHoldingAssociations).mockResolvedValue({ status: "started" });
		mount();
		expect(await screen.findByText("新易盛 · 偏利空")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("checkbox", { name: "只看持仓相关" }));
		expect(screen.queryByRole("button", { name: "不相关的机构消息" })).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "查看持仓多空与条件" }));
		expect(await screen.findByText("我的持仓多空分析")).toBeInTheDocument();
		expect(screen.getByText("系统影响推演")).toBeInTheDocument();
		expect(screen.getByText("需求落地时存在支持")).toBeInTheDocument();
		expect(screen.getByText("高利率对估值形成压力")).toBeInTheDocument();
	}, 60000);
	it("can rebuild associations without recollecting articles", async () => {
		vi.mocked(rebuildHoldingAssociations).mockResolvedValue({ status: "started" });
		mount();
		fireEvent.click(await screen.findByRole("button", { name: "更新近30天持仓关联" }));
		await waitFor(() => expect(rebuildHoldingAssociations).toHaveBeenCalledWith(""));
		expect(refreshInstitutionalResearch).not.toHaveBeenCalled();
	});
	it("shows recent news and opinions alongside older verified reports and starts public backfill", async () => {
		const news: ResearchReport = { ...report, id: "news", published_at: "2026-10-11T08:00:00+08:00", payload: { ...report.payload, title: "近期机构新闻消息", content_type: "news", evaluation_symbol: null, direction: "uncertain" } };
		const opinion: ResearchReport = { ...report, id: "opinion", payload: { ...report.payload, title: "分析师公开采访", content_type: "opinion" } };
		vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { ...initial, reports: [{ ...report, payload: { ...report.payload, verified: true } }, news, opinion] } });
		vi.mocked(backfillPublicResearch).mockResolvedValue({ status: "started" });
		mount();
		expect(await screen.findByRole("button", { name: "近期机构新闻消息" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "分析师公开采访" })).toBeInTheDocument();
		expect(screen.getAllByRole("row")[1]).toHaveTextContent("近期机构新闻消息");
		fireEvent.click(screen.getByRole("button", { name: "补采重点机构近30天公开资料" }));
		await waitFor(() => expect(backfillPublicResearch).toHaveBeenCalledWith(""));
		expect(filterReports([report, news, opinion], "", "", "report")).toEqual([report]);
		expect(filterReports([report, news, opinion], "", "", "news")).toEqual([news]);
		expect(filterReports([report, news, opinion], "", "", "opinion")).toEqual([opinion]);
	}, 60000);
	it("shows holding impact as inference and opens its evidence", async () => {
		mount();
		const source = await screen.findByRole("link", { name: "媒体转载" });
		expect(source).toHaveAttribute("href", report.payload.source_url);
		expect(source).toHaveAttribute("target", "_blank");
		expect(source).toHaveAttribute("rel", "noopener noreferrer");
		fireEvent.click(await screen.findByRole("tab", { name: "每日持仓影响" }));
		expect(await screen.findByText("测试中的产业链成本压力")).toBeInTheDocument();
		expect(screen.getByText("报告甲：成本压力")).toBeInTheDocument();
		expect(screen.getByText("原报告只讨论采购成本压力")).toBeInTheDocument();
		expect(screen.getByText("产业链推断")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "查看报告与证据" }));
		expect(await screen.findByText("尚未核对原报告时间，保留证据，暂不做历史检验")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "打开来源" })).toHaveAttribute("href", report.payload.source_url);
	}, 60000);
	it("links original articles and PDFs and marks invalid source links unavailable", async () => {
		const original = { ...report, id: "original", payload: { ...report.payload, title: "原站测试文章", evidence_level: "original" as const, source_url: "https://example.com/original" } };
		const pdf = { ...original, id: "pdf", payload: { ...original.payload, title: "原文测试PDF", source_url: "https://example.com/report.pdf" } };
		const invalid = { ...report, id: "invalid", payload: { ...report.payload, title: "无效来源测试", source_url: "javascript:alert(1)" } };
		vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { ...initial, reports: [original, pdf, invalid] } });
		vi.mocked(fetchInstitutionalReport).mockResolvedValue({ data: invalid });
		mount();
		const links = await screen.findAllByRole("link", { name: "机构原站 / 原文" });
		expect(links.map(link => link.getAttribute("href"))).toEqual([original.payload.source_url, pdf.payload.source_url]);
		expect(screen.getByText("媒体转载（链接不可用）")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "无效来源测试" }));
		expect(await screen.findByText("打开来源（链接不可用）")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "打开来源" })).not.toBeInTheDocument();
	}, 60000);
	it("never describes a holdings API failure as no exposure", async () => {
		vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { ...initial, holdings: [], holdings_status: "unavailable" } });
		mount();
		fireEvent.click(await screen.findByRole("tab", { name: "每日持仓影响" }));
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
	}, 60000);
	it("opens focus history first and separates original evidence from disclosures", async () => {
		mount();
		expect(await screen.findByRole("tab", { name: "重点机构观点与走势" })).toHaveAttribute("aria-selected", "true");
		fireEvent.click(screen.getByRole("tab", { name: "机构历史匹配度" }));
		expect(await screen.findByText("原站 / PDF核验")).toBeInTheDocument();
		expect(screen.getByText("可靠转载核验")).toBeInTheDocument();
	}, 60000);
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
