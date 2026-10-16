import type { UnwindAnalysis, UnwindPlan } from "../src/api/strategy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { strategyTime } from "../src/components/UnwindTrackingPanel/strategy-time";
import { StrategyDateOverview, StrategyDateStamp } from "../src/components/UnwindTrackingPanel/StrategyDate";

const now = new Date("2026-10-16T10:10:00+08:00");
function analysis(dataDate = "2026-10-16", generated = "2026-10-16 10:09:27") {
	return { technical: { as_of: dataDate }, generated_at: generated } as UnwindAnalysis;
}
function plan(data = analysis()) {
	return { watchlist_id: 1, stock_name: "测试持仓", latest_analysis: data } as UnwindPlan;
}
afterEach(cleanup);

describe("unwind strategy dates", () => {
	it("distinguishes a current execution plan from its previous-session daily basis", () => {
		const data = { ...analysis("2026-10-15"), trading_date: "2026-10-16", basis_date: "2026-10-15", valid_until: "2026-10-16T14:57:00+08:00" };
		expect(strategyTime(data, now)).toMatchObject({ current: true, strategyDate: "2026-10-16", dataDate: "2026-10-15", label: "今日预案 · 操作前复核" });
		expect(strategyTime(data, new Date("2026-10-16T15:00:00+08:00"))).toMatchObject({ current: false, label: "已过有效期 · 仅供复盘" });
	});
	it("uses Beijing timestamps, including explicit UTC offsets", () => {
		expect(strategyTime(analysis(), now)).toMatchObject({ today: "2026-10-16", dataDate: "2026-10-16", generatedAt: "2026-10-16 10:09:27", current: true });
		expect(strategyTime(analysis("2026-10-16", "2026-10-16T02:09:27Z"), now).generatedAt).toBe("2026-10-16 10:09:27");
	});
	it("does not make yesterday's market data current when regenerated today", () => {
		expect(strategyTime(analysis("2026-10-15"), now)).toMatchObject({ current: false, dataDate: "2026-10-15", label: "行情未到今日 · 仅作预案" });
	});
	it.each([
		analysis("2026-02-30"),
		analysis("missing"),
		analysis("2026-10-17"),
		analysis("2026-10-16", "2026-10-16 10:11:00"),
		analysis("2026-10-16", "2026-10-15 16:40:00"),
		analysis("2026-10-16", ""),
		analysis("2026-10-16", "2026-02-30 10:00:00"),
	])("does not label missing, impossible, future or inconsistent times current", (data) => {
		expect(strategyTime(data, now)).toMatchObject({ current: false, label: "时间待核验 · 暂勿照此操作" });
	});
	it("does not use page load time as the generation time", () => {
		const state = strategyTime(analysis("2026-10-15", "2026-10-15 16:40:00"), now);
		expect(state.generatedAt).toBe("2026-10-15 16:40:00");
		expect(state.label).toBe("历史策略 · 请先更新");
	});
	it("changes today's badge after Beijing midnight", () => {
		const { rerender } = render(<StrategyDateStamp plan={plan()} now={now} />);
		expect(screen.getByText("今日快照 · 操作前复核")).toBeInTheDocument();
		rerender(<StrategyDateStamp plan={plan()} now={new Date("2026-10-16T16:00:01Z")} />);
		expect(screen.getByText("历史策略 · 请先更新")).toBeInTheDocument();
	});
	it("makes mixed portfolio dates visible instead of assigning the newest date to every holding", () => {
		render(<StrategyDateOverview plans={[plan(), plan(analysis("2026-10-15", "2026-10-15 16:40:00"))]} now={now} action={<button type="button">更新全部策略</button>} />);
		expect(screen.getByText("2026-10-15 — 2026-10-16（日期不一致）")).toBeInTheDocument();
		expect(screen.getByText("1 / 2")).toBeInTheDocument();
		expect(screen.queryByText("今日快照已生成 · 不代表条件已触发")).not.toBeInTheDocument();
	});
	it("keeps a failed refresh visibly unverified even if its old snapshot has today's date", () => {
		render(<StrategyDateStamp plan={plan()} now={now} unavailable />);
		expect(screen.getByText("更新未完成 · 暂勿照此操作")).toBeInTheDocument();
		expect(screen.queryByText("今日快照 · 操作前复核")).not.toBeInTheDocument();
		expect(screen.getByText("2026-10-16 10:09:27")).toBeInTheDocument();
	});
});
