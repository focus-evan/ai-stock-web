import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchAdaptiveConfluence } from "../src/api/adaptive-confluence";
import AdaptiveConfluence from "../src/pages/short-term-strategy/adaptive-confluence";

vi.mock("#src/api/adaptive-confluence", () => ({ fetchAdaptiveConfluence: vi.fn(), refreshAdaptiveConfluence: vi.fn(), analyzeAdaptiveEvolution: vi.fn(), freezeAdaptiveEvolution: vi.fn() }));
vi.mock("#src/components/strategy-follow-tab", () => ({ default: () => <div>推荐跟进</div> }));
vi.mock("#src/components/RecommendationHistory", () => ({ default: () => <div>推荐历史</div> }));
vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

beforeEach(() => {
	vi.clearAllMocks();
});
afterEach(() => cleanup());

it("shows an uncalibrated win rate instead of inventing zero or a target result", async () => {
	vi.mocked(fetchAdaptiveConfluence).mockResolvedValue({ status: "success", data: { recommendations: [] } });
	render(<MemoryRouter><AdaptiveConfluence /></MemoryRouter>);
	expect(await screen.findByText("未校准")).toBeInTheDocument();
	expect(screen.getByText("本轮没有合格候选，保留现金并等待下一次扫描")).toBeInTheDocument();
	expect(screen.getByText(/研究目标≥55%，不代表已达到/)).toBeInTheDocument();
});

it("expires a past buy label even when the server's last decision was buy", async () => {
	vi.mocked(fetchAdaptiveConfluence).mockResolvedValue({ status: "success", data: { recommendations: [{
		code: "002001",
		name: "测试科技",
		theme: "电子",
		score: 88,
		decision: "买",
		entry_min: 10,
		entry_max: 10.1,
		stop_loss_price: 9.8,
		target_price: 11,
		max_position_pct: 5,
		valid_until: "2000-01-01 10:00:00",
		blocking_reasons: [],
		score_breakdown: {},
		quant_evidence: { reason: "回撤确认" },
		catalyst_evidence: { reason: "公告", evidence: [] },
	}] } });
	render(<MemoryRouter><AdaptiveConfluence /></MemoryRouter>);
	expect(await screen.findByText("已过期，等待重检")).toBeInTheDocument();
	expect(screen.queryByText("模拟买入候选")).not.toBeInTheDocument();
});
