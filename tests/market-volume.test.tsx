import type { VolumeObservation, VolumeOverview } from "../src/api/market-intelligence";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { App } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVolume, refreshVolume } from "../src/api/market-intelligence";
import VolumeCard from "../src/pages/market-intelligence/volume-card";

vi.mock("#src/api/market-intelligence", () => ({ fetchVolume: vi.fn(), refreshVolume: vi.fn() }));
const observation: VolumeObservation = {
	trade_date: "2026-10-12",
	as_of: "2026-10-12T10:00:00+08:00",
	observed_at: "2026-10-12T10:01:00+08:00",
	phase: "intraday",
	checkpoint: "10:00",
	scope: "沪深A股（不含北交所）",
	amount: 600e8,
	comparison_pct: null,
	comparison_label: "较上一交易日同一时刻",
	average_5: 1200e8,
	average_20: null,
	vs_average_5_pct: null,
	vs_average_20_pct: null,
	estimated_close_amount: 1400e8,
	estimate_note: "按昨日同刻比例估算，不是收盘实值。",
	headline: "可比基准待确认",
	meaning: "成交额不等于新增资金",
	summary: "已成交600亿元",
	continuity: "首次记录",
	next_watch: "午间再确认",
	method: "同刻比较",
	indices: [],
	limitations: ["历史样本不足"],
	sources: [],
	daily_history: [],
};
const base: VolumeOverview = { latest: observation, history: [observation], stale: false, market_phase: "intraday", last_attempt: null, runtime: { enabled: true, running: true, next_run_at: "2026-10-12T11:35:00+08:00", calendar_known: true, checkpoints: [{ time: "10:00", name: "早盘", purpose: "跟踪" }], catch_up: "不补造分时" } };
const clients: QueryClient[] = [];
function mount(data = base) {
	vi.mocked(fetchVolume).mockResolvedValue({ data });
	const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
	clients.push(client);
	return render(<QueryClientProvider client={client}><App><VolumeCard /></App></QueryClientProvider>);
}
beforeEach(() => vi.resetAllMocks());
afterEach(() => {
	cleanup();
	clients.splice(0).forEach(client => client.clear());
});
describe("a-share turnover observations", () => {
	it("labels estimates and does not turn a missing comparison into zero", async () => {
		mount();
		expect(await screen.findByText("可比基准待确认")).toBeInTheDocument();
		expect(screen.getByText("待确认")).toBeInTheDocument();
		expect(screen.getByText("全天预估：1,400 亿元（估算）")).toBeInTheDocument();
		expect(screen.queryByText("相差 -50.0%")).not.toBeInTheDocument();
	});
	it("keeps stale results visible with an explicit update error", async () => {
		mount({ ...base, stale: true, last_attempt: { slot: "test", status: "failed", updated_at: observation.observed_at, error: "行情延迟" } });
		expect(await screen.findByText("行情延迟")).toBeInTheDocument();
		expect(screen.getByText("当前显示的是上次量能记录，本检查点数据尚未更新")).toBeInTheDocument();
	});
	it("refreshes volume independently of news collection", async () => {
		vi.mocked(refreshVolume).mockResolvedValue({ status: "completed" });
		mount();
		await screen.findByText("可比基准待确认");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "更新量能" }));
		});
		expect(refreshVolume).toHaveBeenCalledTimes(1);
	});
	it("shows final data without an intraday estimate", async () => {
		mount({ ...base, latest: { ...observation, phase: "close", estimated_close_amount: null } });
		expect(await screen.findByText("收盘实值")).toBeInTheDocument();
		expect(screen.queryByText(/全天预估/)).not.toBeInTheDocument();
	});
});
