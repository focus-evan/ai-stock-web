import type { CapitalEvidence, CapitalStockCard, PortfolioCapitalTracking } from "#src/api/strategy/portfolioCapitalTypes";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CapitalStockSection, CapitalTrackingOverview, EvidenceTable } from "./CapitalTracking";

afterEach(cleanup);

const evidence: CapitalEvidence = {
	id: "sample",
	kind: "holder_snapshot",
	scope: "stock",
	scope_key: "600000",
	label: "历史基金持仓",
	entity: "某基金",
	value: null,
	unit: "股",
	direction: "unknown",
	actor_ids: ["active_funds"],
	as_of: "2026-06-30",
	published_at: null,
	observed_at: "2026-09-28T18:00:00+08:00",
	source: { name: "公开来源", url: "https://www.sse.com.cn/" },
	basis: "fact",
	status: "historical",
	historical: true,
	usable_for_timing: false,
	note: "报告期末持股不能确认今天买入",
	details: {},
};
const card: CapitalStockCard = {
	state: "pending",
	decision: "资金证据不完整，等待核验",
	industry: "银行",
	sector: "银行",
	evidence_ids: ["sample"],
	facts: ["历史基金持仓"],
	inferences: [],
	missing: ["近期交易证据缺失"],
	entry_conditions: ["价格仍在计划范围"],
	invalidations: ["经营出现反证后重新评估"],
	next_check: "公告发布后核验",
};
const report: PortfolioCapitalTracking = {
	version: "capital-evidence-v1",
	generated_at: "2026-09-28T18:00:00+08:00",
	status: "partial",
	market: { state: "unknown", conclusion: "大盘数据待核验", warnings: ["市场宽度缺失"], evidence_ids: [] },
	sectors: [{ name: "银行", stock_codes: ["600000"], evidence_ids: [] }],
	evidence: [evidence],
	actors: [{ id: "quant", name: "量化资金", status: "unavailable", evidence_ids: [], boundary: "公开盘口不能确认量化身份" }],
	stock_cards: { 600000: card },
	coverage: { evidence_count: 1, current_count: 0, historical_count: 1, rejected_count: 0 },
	data_gaps: [{ dataset: "fixture", message: "来源暂不可用" }],
	workflow: [{ stage: "盘前", task: "只读已公开数据" }],
	exposure: { by_currency: [
		{ currency: "CNY", market_value: 1000, largest_stock_pct: 100, sectors: [{ name: "银行", weight_pct: 100 }] },
		{ currency: "HKD", market_value: 2000, largest_stock_pct: 100, sectors: [{ name: "其他", weight_pct: 100 }] },
	], note: "不同币种不合并" },
	review: { status: "pending", items: [], note: "价格观察不是成交收益" },
	rule_note: "参与者类别重叠，不合计资金流",
};

describe("portfolio capital evidence", () => {
	it("offers regeneration for old reports without fabricating evidence", () => {
		render(<CapitalTrackingOverview />);
		expect(screen.getByText(/点击重新分析/)).toBeInTheDocument();
		expect(screen.queryByText(/净流入/)).not.toBeInTheDocument();
	});

	it("shows unknown numeric values and delayed publication explicitly", () => {
		render(<EvidenceTable evidence={[evidence]} />);
		expect(screen.getByText("未知")).toBeInTheDocument();
		expect(screen.getByText("历史披露")).toBeInTheDocument();
		expect(screen.getByText("公开：源未提供")).toBeInTheDocument();
		expect(screen.queryByText("0 股")).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "公开来源" })).toHaveAttribute("href", "https://www.sse.com.cn/");
	});

	it("does not turn unsafe source strings into executable links", () => {
		render(<EvidenceTable evidence={[{ ...evidence, source: { name: "bad", url: "javascript:alert(1)" } }]} />);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.getByText("来源待核验")).toBeInTheDocument();
	});

	it("separates unavailable actor attribution from recorded product data", async () => {
		render(<CapitalTrackingOverview data={report} />);
		fireEvent.click(screen.getByRole("tab", { name: "11类参与者" }));
		expect(await screen.findByText("量化资金")).toBeInTheDocument();
		expect(screen.getByText("暂无证据")).toBeInTheDocument();
		expect(screen.getByText("公开盘口不能确认量化身份")).toBeInTheDocument();
	});

	it("keeps currency exposures separate and labels observation review", async () => {
		render(<CapitalTrackingOverview data={report} />);
		fireEvent.click(screen.getByRole("tab", { name: "组合暴露与复盘" }));
		expect(await screen.findByText("CNY 持仓")).toBeInTheDocument();
		expect(screen.getByText("HKD 持仓")).toBeInTheDocument();
		expect(screen.getByText("价格观察不是成交收益")).toBeInTheDocument();
	});

	it("renders stale reports and stock-specific invalidations", async () => {
		render(
			<>
				<CapitalTrackingOverview data={{ ...report, status: "stale" }} />
				<CapitalStockSection card={card} evidence={[evidence]} />
			</>,
		);
		expect(screen.getByText("历史报告 · 请更新")).toBeInTheDocument();
		fireEvent.click(screen.getByText("验证条件与失效条件"));
		expect(await screen.findByText("经营出现反证后重新评估")).toBeInTheDocument();
		expect(screen.getByText("价格仍在计划范围")).toBeInTheDocument();
	});
});
