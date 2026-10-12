import { fetchInstitutionalResearch } from "#src/api/institutional-research";
import InstitutionalHoldingEvidence from "#src/components/institutional-holding-evidence";
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
