import { fetchInstitutionalResearch } from "#src/api/institutional-research";
import InstitutionalHoldingEvidence from "#src/components/institutional-holding-evidence";
import { impactBiasLabel, ImpactCard } from "#src/components/institutional-holding-evidence/ImpactCard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("#src/api/institutional-research", () => ({ fetchInstitutionalResearch: vi.fn() }));
vi.mock("#src/store/user", () => ({ useUserStore: (selector: (s: { username: string }) => unknown) => selector({ username: "alice" }) }));
const clients: QueryClient[] = [];
afterEach(() => {
	cleanup();
	clients.splice(0).forEach(c => c.clear());
});

function mount() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
	clients.push(client);
	render(<QueryClientProvider client={client}><InstitutionalHoldingEvidence /></QueryClientProvider>);
}

it("shows current-account message evidence in the portfolio without changing technical signals", async () => {
	vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { holdings_status: "ok", holdings: [{ symbol: "hk09988", name: "阿里巴巴-W", shares: 100, impacts: [{ symbol: "hk09988", name: "阿里巴巴-W", direction: "mixed", relation: "macro", analysis_origin: "system_inference", mechanism: "港股估值与利率因素影响", evidence_quote: "港股盈利预期改善", watch_next: "公司云业务利润率", bull_case: "盈利改善有利于估值", bear_case: "高利率仍压制估值", source_url: "https://example.com/source", verified: false }] }] } as any });
	mount();
	fireEvent.click(await screen.findByText("阿里巴巴-W · hk09988"));
	expect(await screen.findByText("盈利改善有利于估值")).toBeInTheDocument();
	expect(screen.getByText("高利率仍压制估值")).toBeInTheDocument();
	expect(screen.getByText("来源待核验")).toBeInTheDocument();
	expect(screen.getByRole("link", { name: /打开消息来源/ })).toHaveAttribute("href", "https://example.com/source");
}, 60000);

it("does not present failed holdings reads as no bearish exposure", async () => {
	vi.mocked(fetchInstitutionalResearch).mockResolvedValue({ data: { holdings_status: "unavailable", holdings: [] } as any });
	mount();
	expect(await screen.findByText("持仓消息读取失败，不能据此判断没有风险")).toBeInTheDocument();
	expect(screen.queryByText("当前账号没有有效持仓")).not.toBeInTheDocument();
});

it("leads with the short-term bias while retaining its condition and longer-term counterweight", () => {
	const impact = { symbol: "sz300502", name: "新易盛", direction: "mixed", relation: "industry_chain", analysis_origin: "system_inference" as const, mechanism: "数据中心监管通过建设节奏影响光模块需求", evidence_quote: "短期算力链偏利空", watch_next: "核验客户建设计划", bull_case: "中长期需求仍有支撑", bear_case: "短期监管风险", net_bias: { direction: "bearish" as const, channel: "sentiment_valuation" as const, horizon: "short_term" as const, strength: "moderate" as const, confidence: "medium" as const, reason: "监管风险先影响短期估值，长期需求不能抵消当前扰动", evidence_quote: "短期算力链偏利空", condition: "数据中心监管限制升级", longer_term: "中长期需求仍有支撑", reversal_condition: "监管缓和且客户建设恢复" } };
	render(<ImpactCard impact={impact} />);
	expect(screen.getByText("短期偏空")).toBeInTheDocument();
	expect(screen.getByText("数据中心监管限制升级")).toBeInTheDocument();
	expect(screen.getByText("监管缓和且客户建设恢复")).toBeInTheDocument();
	expect(screen.queryByText("多空并存")).not.toBeInTheDocument();
	expect(impactBiasLabel({ ...impact, net_bias: null })).toBe("偏向待复核");
});
