import type { AIResearchState } from "../src/api/industry-ai";
import type { IndustryResearch, ResearchReview } from "../src/pages/industry/research-model";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchIndustryAI, fetchIndustryAIStrategy } from "../src/api/industry-ai";
import Industry from "../src/pages/industry";
import { parseReviews, reviewIsCurrent, reviewStorageKey, safeEvidenceUrl } from "../src/pages/industry/research-model";
import ResearchWorkbench from "../src/pages/industry/research-workbench";
import fixture from "./fixtures/industry-research.json";

vi.mock("#src/api/industry-ai", () => ({ fetchIndustryAI: vi.fn(), fetchIndustryAIStrategy: vi.fn(), refreshIndustryAI: vi.fn() }));
const aiState: AIResearchState = {
	current: true,
	latest: { run_id: "ai-1", status: "completed", started_at: "2026-10-04T10:00:00+08:00", output: {
		summary: "AI正在以经营兑现证据判断计算环节",
		sectors: [{ subject_id: "11", name: "计算", decision: "focus", quality_score: 75, thesis: "营收与利润同步改善，进入优先研究范围", counterargument: "行业份额仍须新增证据验证", next_check: "自动核对下一季度财报和交付公告", evidence_ids: ["finance-1"], gate_issues: [] }],
		companies: [],
		learning_applied: [],
		research_review: { settled: 0, confirmed: 0, contradicted: 0, status: "forward_validation" },
	}, evidence: [{ id: "finance-1", title: "公司财报", kind: "financial", as_of: "2026-08-01" }] },
	attempt: { run_id: "ai-1", status: "completed", started_at: "2026-10-04T10:00:00+08:00", finished_at: "2026-10-04T10:01:00+08:00" },
	history: [],
	reviews: [],
};
const user = vi.hoisted(() => ({ id: "research-user" }));
vi.mock("#src/store/user", () => ({ useUserStore: (select: (state: { id: string }) => unknown) => select(user) }));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const research = fixture.research as IndustryResearch;
const key = reviewStorageKey(user.id, "ai")!;
const saved: ResearchReview = { sectorId: "11", snapshotKey: research.snapshot_key, decision: "focus", reason: "客户验证仍待复核", signal: "下季检查交付与现金流", evidenceUrl: "https://example.com/evidence", updatedAt: "2026-10-04T10:00:00Z" };
const props = { chainCode: "ai", research, analysis: fixture.analysis, legacy: () => <div>历史技术资料</div> };

beforeEach(() => {
	vi.mocked(fetchIndustryAI).mockResolvedValue({ data: structuredClone(aiState) });
	vi.mocked(fetchIndustryAIStrategy).mockResolvedValue({ data: { name: "AI产业研究自进化", version: "v1", recommendations: [], evolution: null, evolution_history: [], runtime: { scheduler_running: true, loop_running: true, research_times: ["07:50", "17:30"], entry_windows: [] } } });
	localStorage.clear();
	user.id = "research-user";
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("replaces manual notes with server-backed AI judgments and leaves old local notes untouched", async () => {
	localStorage.setItem(key, JSON.stringify({ version: 1, entries: [saved] }));
	const original = localStorage.getItem(key);
	render(<ResearchWorkbench {...props} />);
	expect(await screen.findByText("营收与利润同步改善，进入优先研究范围")).toBeInTheDocument();
	expect(screen.queryByRole("button", { name: "保存研究记录" })).not.toBeInTheDocument();
	expect(screen.queryByRole("textbox", { name: "取舍理由" })).not.toBeInTheDocument();
	expect(screen.getByRole("tab", { name: "AI复盘与自进化" })).toBeInTheDocument();
	expect(localStorage.getItem(key)).toBe(original);
	expect(screen.getByRole("button", { name: /计算.*AI：优先深研/ })).toBeInTheDocument();
});

it("shows interrupted runs and historical judgments without treating them as current", async () => {
	vi.mocked(fetchIndustryAI).mockResolvedValue({ data: { ...structuredClone(aiState), current: false, attempt: { run_id: "r2", status: "failed", started_at: "2026-10-04T12:00:00+08:00", error: "自动复核失败，新买暂停" } } });
	render(<ResearchWorkbench {...props} />);
	expect(await screen.findByText("自动复核失败，新买暂停")).toBeInTheDocument();
	expect(screen.getByText("历史判断 · 新买暂停")).toBeInTheDocument();
	expect(screen.getByText("营收与利润同步改善，进入优先研究范围")).toBeInTheDocument();
});

it("does not request a manual note when no AI report exists", async () => {
	vi.mocked(fetchIndustryAI).mockResolvedValue({ data: { current: false, latest: null, attempt: null, history: [], reviews: [] } });
	render(<ResearchWorkbench {...props} />);
	await waitFor(() => expect(fetchIndustryAI).toHaveBeenCalled());
	expect(screen.getByText("等待首轮自动研究")).toBeInTheDocument();
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(screen.getByRole("button", { name: "立即AI复核" })).toBeInTheDocument();
});

it("shows sample limits and the simulation link instead of a fabricated win rate", async () => {
	render(<ResearchWorkbench {...props} />);
	await screen.findByText("营收与利润同步改善，进入优先研究范围");
	fireEvent.click(screen.getByRole("tab", { name: "AI复盘与自进化" }));
	expect(await screen.findByText(/至少 60 轮、20 个入场日期/)).toBeInTheDocument();
	expect(screen.getByRole("link", { name: "查看模拟组合" })).toHaveAttribute("href", "#/short-term-strategy/portfolio");
	expect(screen.getByText("还没有晚于判断时间的新财报，不提前计算准确率")).toBeInTheDocument();
});

it("keeps future quarter and market values out of financial validation", async () => {
	const analysis = structuredClone(fixture.analysis);
	analysis.companies[0].quarters.push({ ...analysis.companies[0].latest, period: "2099-06-30", disclosed_at: "2099-08-01", revenue: 999999 });
	analysis.companies[0].market = { date: "2099-10-10", market_cap: 999999, pe_ttm: 999999 };
	render(<ResearchWorkbench {...props} analysis={analysis} />);
	fireEvent.click(screen.getByRole("tab", { name: "公司与财务验证" }));
	expect(await screen.findByText("公司五维PK · 最新单季度")).toBeInTheDocument();
	expect(screen.queryByText(/2099/)).not.toBeInTheDocument();
	expect(screen.queryByText(/999999/)).not.toBeInTheDocument();
	expect(screen.queryByText("满足保留条件的前3")).not.toBeInTheDocument();
	expect(screen.getByText("参考量化分")).toBeInTheDocument();
});

it("keeps an empty industry usable and gives missing-data guidance", () => {
	render(<ResearchWorkbench {...props} research={{ ...research, sectors: [] }} />);
	expect(screen.getByText("当前范围没有待展示的环节")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("tab", { name: "方法与原始资料" }));
	expect(screen.getByText("按研究对象组合方法")).toBeInTheDocument();
});

it("integrates the research payload on the existing industry route", async () => {
	vi.stubGlobal("fetch", vi.fn(async (url: string) => ({ ok: true, json: async () => ({ success: true, data: url === "/api/industry/chains" ? [{ code: "ai", name: "AI产业链" }] : fixture }) })));
	render(<Industry />);
	expect(await screen.findByRole("tab", { name: "全景与取舍" })).toBeInTheDocument();
	expect(screen.queryByText("满足保留条件的前3")).not.toBeInTheDocument();
});

it("validates links and keeps retired records exportable without treating blank notes as current", () => {
	expect(safeEvidenceUrl("javascript:alert(1)")).toBeUndefined();
	expect(safeEvidenceUrl("https://user:secret@example.com")).toBeUndefined();
	expect(safeEvidenceUrl(saved.evidenceUrl)).toBe(saved.evidenceUrl);
	expect(reviewStorageKey("", "ai")).toBeNull();
	expect(reviewIsCurrent({ ...saved, reason: " " }, research.snapshot_key)).toBe(false);
	expect(parseReviews(JSON.stringify({ version: 1, entries: [{ ...saved, sectorId: "retired" }] })).retired.reason).toBe(saved.reason);
});

it("shows company financial values on the initial panorama without a research note", () => {
	render(<ResearchWorkbench {...props} />);
	const table = within(screen.getByRole("table"));
	expect(table.getByText("示例公司")).toBeInTheDocument();
	expect(table.getByText("10.00")).toBeInTheDocument();
	expect(table.getByText("2.00")).toBeInTheDocument();
	expect(table.getByText("30.00%")).toBeInTheDocument();
	expect(screen.getByRole("button", { name: /计算.*财务已载入/ })).toBeInTheDocument();
	expect(screen.queryByText("待研究 / 待复核", { selector: ".ant-tag" })).not.toBeInTheDocument();
});

it("starts with an available sector and distinguishes a genuinely empty mapping", () => {
	render(<ResearchWorkbench {...props} research={{ ...research, sectors: [research.sectors[1], research.sectors[0]] }} />);
	expect(screen.getByText("计算 · 公司与经营数据")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: /应用软件.*资料缺口/ }));
	expect(screen.getByText(/此环节尚未建立公司关联/)).toBeInTheDocument();
	expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("does not expose rejected financial values in the initial overview", () => {
	const changed = structuredClone(research);
	changed.sectors[0].companies[0].observation.financial_status = "needs_evidence";
	changed.sectors[0].companies[0].observation.metrics.revenue = 999999;
	render(<ResearchWorkbench {...props} research={changed} />);
	expect(screen.queryByText(/999999/)).not.toBeInTheDocument();
	expect(screen.getByText("1 家公司财务尚未对齐")).toBeInTheDocument();
});

it("opens detailed financial verification from the overview", async () => {
	render(<ResearchWorkbench {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "完整财务与趋势" }));
	expect(await screen.findByText("公司五维PK · 最新单季度")).toBeInTheDocument();
});
