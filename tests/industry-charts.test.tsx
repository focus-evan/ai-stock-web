import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { QuarterTrendChart, SectorScoreChart } from "../src/pages/industry/industry-charts";

afterEach(cleanup);

it("renders score bars directly while distinguishing missing scores from zero", () => {
	const { container } = render(
		<SectorScoreChart sectors={[
			{ name: "正常赛道", average_score: 71.08 },
			{ name: "零分赛道", average_score: 0 },
			{ name: "暂不评分", average_score: null },
		]}
		/>,
	);
	expect(screen.getByRole("meter", { name: "正常赛道" })).toHaveAttribute("aria-valuenow", "71.08");
	expect(screen.getByRole("meter", { name: "零分赛道" })).toHaveAttribute("aria-valuenow", "0");
	expect(screen.getByText("不评分")).toBeInTheDocument();
	expect(container.querySelectorAll(".industry-score-fill")).toHaveLength(2);
	expect(container.querySelector("canvas")).toBeNull();
});

it("draws losses below zero and does not join missing quarter points", () => {
	const { container } = render(
		<QuarterTrendChart periods={[
			{ period: "2026-06-30", revenue: 4, net_profit: -1 },
			{ period: "2026-03-31", revenue: null, net_profit: null },
			{ period: "2025-12-31", revenue: 2, net_profit: 0 },
		]}
		/>,
	);
	expect(screen.getByRole("img", { name: /季度金额折线图/ })).toBeInTheDocument();
	expect(container.querySelectorAll("circle")).toHaveLength(4);
	expect(container.querySelectorAll("polyline")).toHaveLength(0);
	expect(container.textContent).toContain("-1.00");
});

it("does not reserve a chart-sized blank when no quarter values exist", () => {
	const { container } = render(<QuarterTrendChart periods={[]} />);
	expect(screen.getByText(/暂无可绘制/)).toBeInTheDocument();
	expect(container.querySelector("svg")).toBeNull();
});
