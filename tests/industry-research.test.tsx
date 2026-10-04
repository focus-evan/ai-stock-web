import type { IndustryResearch, ResearchReview } from "../src/pages/industry/research-model";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Industry from "../src/pages/industry";
import { parseReviews, reviewIsCurrent, reviewStorageKey, safeEvidenceUrl } from "../src/pages/industry/research-model";
import ResearchWorkbench from "../src/pages/industry/research-workbench";
import fixture from "./fixtures/industry-research.json";

const user = vi.hoisted(() => ({ id: "research-user" }));
vi.mock("#src/store/user", () => ({ useUserStore: (select: (state: { id: string }) => unknown) => select(user) }));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
const research = fixture.research as IndustryResearch;
const key = reviewStorageKey(user.id, "ai")!;
const saved: ResearchReview = { sectorId: "11", snapshotKey: research.snapshot_key, decision: "focus", reason: "客户验证仍待复核", signal: "下季检查交付与现金流", evidenceUrl: "https://example.com/evidence", updatedAt: "2026-10-04T10:00:00Z" };
const props = { chainCode: "ai", research, analysis: fixture.analysis, legacy: () => <div>历史技术资料</div> };

beforeEach(() => {
	localStorage.clear();
	user.id = "research-user";
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("requires a reason and a review condition, then restores account-scoped research", () => {
	const view = render(<ResearchWorkbench {...props} />);
	fireEvent.click(screen.getByRole("button", { name: "保存研究记录" }));
	expect(screen.getByText("请写明取舍理由和下一次验证或重新纳入的条件。")).toBeInTheDocument();
	expect(localStorage.getItem(key)).toBeNull();
	fireEvent.change(screen.getByRole("textbox", { name: "取舍理由" }), { target: { value: saved.reason } });
	fireEvent.change(screen.getByRole("textbox", { name: "下一次验证条件" }), { target: { value: saved.signal } });
	fireEvent.click(screen.getByRole("button", { name: "保存研究记录" }));
	expect(parseReviews(localStorage.getItem(key))["11"].reason).toBe(saved.reason);
	view.unmount();
	render(<ResearchWorkbench {...props} />);
	expect(screen.getByRole("textbox", { name: "取舍理由" })).toHaveValue(saved.reason);
});

it("retains old reasons but makes a changed snapshot pending until reviewed", () => {
	localStorage.setItem(key, JSON.stringify({ version: 1, entries: [saved] }));
	render(<ResearchWorkbench {...props} research={{ ...research, snapshot_key: "new-batch" }} />);
	expect(screen.getByText("1 条历史取舍需要复核")).toBeInTheDocument();
	expect(screen.getByRole("textbox", { name: "取舍理由" })).toHaveValue(saved.reason);
	expect(screen.getByRole("button", { name: /计算.*待研究/ })).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "保存研究记录" }));
	expect(screen.queryByText("1 条历史取舍需要复核")).not.toBeInTheDocument();
	expect(parseReviews(localStorage.getItem(key))["11"].snapshotKey).toBe("new-batch");
});

it("does not carry another account or industry's drafts across identity changes", () => {
	localStorage.setItem(key, JSON.stringify({ version: 1, entries: [saved] }));
	const view = render(<ResearchWorkbench {...props} />);
	expect(screen.getByRole("textbox", { name: "取舍理由" })).toHaveValue(saved.reason);
	user.id = "another-user";
	view.rerender(<ResearchWorkbench {...props} />);
	expect(screen.getByRole("textbox", { name: "取舍理由" })).toHaveValue("");
	user.id = "research-user";
	view.rerender(<ResearchWorkbench {...props} chainCode="quantum" />);
	expect(screen.getByRole("textbox", { name: "取舍理由" })).toHaveValue("");
});

it("preserves corrupt local storage and offers export instead of silently overwriting it", () => {
	localStorage.setItem(key, "not-json");
	render(<ResearchWorkbench {...props} />);
	expect(screen.getByText(/本机记录暂时无法读取/)).toBeInTheDocument();
	fireEvent.change(screen.getByRole("textbox", { name: "取舍理由" }), { target: { value: saved.reason } });
	fireEvent.change(screen.getByRole("textbox", { name: "下一次验证条件" }), { target: { value: saved.signal } });
	fireEvent.click(screen.getByRole("button", { name: "保存研究记录" }));
	expect(localStorage.getItem(key)).toBe("not-json");
	expect(screen.getByRole("button", { name: "导出研究记录" })).toBeInTheDocument();
});

it("saves a separate company decision after competition research", { timeout: 10000 }, async () => {
	render(<ResearchWorkbench {...props} />);
	fireEvent.click(screen.getByRole("tab", { name: "竞争格局 → 焦点 → 优势" }));
	expect(await screen.findByText("公司优势如何对应竞争焦点")).toBeInTheDocument();
	fireEvent.change(screen.getByRole("textbox", { name: "取舍理由" }), { target: { value: "优势需与同行交付比较" } });
	fireEvent.change(screen.getByRole("textbox", { name: "下一次验证条件" }), { target: { value: "观察下季客户回款" } });
	fireEvent.click(screen.getByRole("button", { name: "保存研究记录" }));
	expect(parseReviews(localStorage.getItem(key))["11/company/000001"].reason).toBe("优势需与同行交付比较");
	expect(parseReviews(localStorage.getItem(key))["11"]).toBeUndefined();
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
