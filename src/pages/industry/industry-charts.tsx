import "./industry-charts.css";

interface Sector {
	name: string
	average_score: number | null
}
interface Period {
	period: string
	revenue?: number | null
	net_profit?: number | null
}

function numeric(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

/** Native layout keeps scores visible when a cached route is mounted off-screen. */
export function SectorScoreChart({ sectors }: { sectors: Sector[] }) {
	return (
		<figure className="industry-score-chart" aria-label="赛道S量化得分对比">
			{sectors.map(sector => (
				<div className="industry-score-row" key={sector.name}>
					<span className="industry-score-name" title={sector.name}>{sector.name}</span>
					<div className="industry-score-track" role={numeric(sector.average_score) ? "meter" : undefined} aria-label={sector.name} aria-valuemin={numeric(sector.average_score) ? 0 : undefined} aria-valuemax={numeric(sector.average_score) ? 100 : undefined} aria-valuenow={numeric(sector.average_score) ? sector.average_score : undefined} aria-valuetext={numeric(sector.average_score) ? `${sector.average_score.toFixed(2)} 分` : undefined}>
						{numeric(sector.average_score) && <div className="industry-score-fill" style={{ width: `${Math.max(0, Math.min(100, sector.average_score))}%` }} />}
					</div>
					<strong>{numeric(sector.average_score) ? sector.average_score.toFixed(2) : "不评分"}</strong>
				</div>
			))}
			<figcaption>0–100 分；亏损基数、风险警示或指标缺失可能使评分不适用，财务明细仍保留。</figcaption>
		</figure>
	);
}

export function QuarterTrendChart({ periods }: { periods: Period[] }) {
	const rows = [...periods].reverse();
	const values = rows.flatMap(row => [row.revenue, row.net_profit]).filter(numeric);
	if (!rows.length || !values.length)
		return <p className="industry-chart-empty">暂无可绘制的季度金额，详细数据见下表。</p>;
	const min = Math.min(0, ...values);
	const max = Math.max(0, ...values);
	const span = max - min || 1;
	const x = (index: number) => 62 + index * 654 / Math.max(1, rows.length - 1);
	const y = (value: number) => 205 - (value - min) / span * 177;
	const series = [
		{ key: "revenue", label: "营收", color: "#cf183b" },
		{ key: "net_profit", label: "归母净利", color: "#315bd4" },
	] as const;
	return (
		<figure className="industry-trend-chart" aria-label="最近六季度营收与归母净利趋势">
			<figcaption>
				{series.map(item => (
					<span key={item.key}>
						<i style={{ background: item.color }} />
						{item.label}
						（亿元）
					</span>
				))}
			</figcaption>
			<div className="industry-trend-scroll">
				<svg viewBox="0 0 760 255" role="img" aria-label="季度金额折线图，完整金额和同比见下表">
					{Array.from({ length: 5 }, (_, index) => {
						const value = min + index / 4 * span;
						return (
							<g key={index}>
								<line x1={62} y1={y(value)} x2={716} y2={y(value)} stroke="#dce1e8" strokeDasharray="4 4" />
								<text x={52} y={y(value) + 4} textAnchor="end">{value.toFixed(1)}</text>
							</g>
						);
					})}
					{rows.map((row, index) => <text key={row.period} x={x(index)} y={234} textAnchor="middle">{row.period.slice(0, 7)}</text>)}
					{series.map((item) => {
						const segments: string[][] = [[]];
						rows.forEach((row, index) => {
							const value = row[item.key];
							if (numeric(value))
								segments[segments.length - 1].push(`${x(index)},${y(value)}`);
							else if (segments[segments.length - 1].length)
								segments.push([]);
						});
						return (
							<g key={item.key}>
								{segments.filter(segment => segment.length > 1).map(segment => <polyline key={segment.join(" ")} points={segment.join(" ")} fill="none" stroke={item.color} strokeWidth={2.5} />)}
								{rows.map((row, index) => {
									const value = row[item.key];
									return numeric(value)
										? (
											<circle key={row.period} cx={x(index)} cy={y(value)} r={4} fill={item.color}>
												<title>
													{row.period}
													{" "}
													{item.label}
													{" "}
													{value.toFixed(2)}
													{" "}
													亿元
												</title>
											</circle>
										)
										: null;
								})}
							</g>
						);
					})}
				</svg>
			</div>
		</figure>
	);
}
