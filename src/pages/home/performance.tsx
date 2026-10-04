import type { DashboardData } from "#src/api/portfolio/dashboard";
import type { EChartsOption } from "echarts";
import { Empty, theme } from "antd";
import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import { finiteMetric, STRATEGIES, strategyName } from "./data";

export default function Performance({ data }: { data: DashboardData }) {
	const { token } = theme.useToken();
	const curves = data.performance_series ?? Object.entries(data.performance || {}).map(([strategy, rows]) => ({ portfolio_id: strategy, strategy_type: strategy, name: strategyName(strategy), data: rows }));
	const usable = curves.filter(curve => curve.data?.some(row => finiteMetric(row.total_profit_pct ?? row.profit_pct)));
	const option = useMemo<EChartsOption>(() => {
		const dates = [...new Set(usable.flatMap(curve => curve.data.map(row => String(row.trading_date || row.date || "").slice(0, 10)).filter(Boolean)))].sort();
		return {
			textStyle: { color: token.colorTextSecondary },
			tooltip: { trigger: "axis", renderMode: "richText", confine: true },
			legend: { type: "scroll", bottom: 0, textStyle: { color: token.colorTextSecondary } },
			grid: { left: 18, right: 22, top: 20, bottom: 55, containLabel: true },
			xAxis: { type: "category", data: dates, axisLabel: { formatter: (v: string) => v.slice(5) }, axisLine: { lineStyle: { color: token.colorBorderSecondary } } },
			yAxis: { type: "value", axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { type: "dashed", color: token.colorBorderSecondary } } },
			series: usable.map((curve) => {
				const values = new Map(curve.data.map(row => [String(row.trading_date || row.date || "").slice(0, 10), row.total_profit_pct ?? row.profit_pct]));
				return { name: `${curve.name || strategyName(curve.strategy_type)} · ${curve.portfolio_id}`, type: "line", smooth: false, connectNulls: false, showSymbol: false, lineStyle: { width: 2 }, itemStyle: { color: STRATEGIES[curve.strategy_type]?.color }, data: dates.map((date) => {
					const v = values.get(date);

					return finiteMetric(v) ? v : null;
				}) };
			}),
		};
	}, [data, token]);
	return usable.length
		? (
			<>
				<p className="wb-chart-note">最近 30 个结算记录。每个组合独立展示；缺失日期留空，收益样本从实际记录开始。</p>
				<ReactECharts className="wb-chart" option={option} notMerge opts={{ renderer: "svg" }} />
			</>
		)
		: <Empty description="尚无可核验的收益曲线" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}
