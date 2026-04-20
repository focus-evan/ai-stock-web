import type { EChartsOption } from "echarts";

import { fetchDashboard } from "#src/api/portfolio";
import { BasicContent } from "#src/components/basic-content";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	DollarOutlined,
	FundOutlined,
	PieChartOutlined,
	ReloadOutlined,
	RiseOutlined,
	StockOutlined,
	SwapOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Badge,
	Button,
	Card,
	Col,
	Empty,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import ReactECharts from "echarts-for-react";

const { Text } = Typography;

// ===================== 策略配置 =====================
const STRATEGY_CONFIG: Record<string, { label: string, icon: string, color: string, gradient: string }> = {
	dragon_head: { label: "龙头战法", icon: "🐉", color: "#eb2f96", gradient: "linear-gradient(135deg, #eb2f96 0%, #f759ab 100%)" },
	relay: { label: "连板接力", icon: "🔗", color: "#fa541c", gradient: "linear-gradient(135deg, #fa541c 0%, #ff7a45 100%)" },
	sentiment: { label: "情绪战法", icon: "💡", color: "#1890ff", gradient: "linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)" },
	event_driven: { label: "事件驱动", icon: "📡", color: "#fa8c16", gradient: "linear-gradient(135deg, #fa8c16 0%, #ffc53d 100%)" },
	breakthrough: { label: "突破战法", icon: "🚀", color: "#722ed1", gradient: "linear-gradient(135deg, #722ed1 0%, #b37feb 100%)" },
	volume_price: { label: "量价关系", icon: "📊", color: "#13c2c2", gradient: "linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)" },
	overnight: { label: "隔夜施工法", icon: "🌙", color: "#0f3460", gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)" },
	auction: { label: "竞价尾盘", icon: "⏰", color: "#531dab", gradient: "linear-gradient(135deg, #531dab 0%, #9254de 100%)" },
	moving_average: { label: "均线战法", icon: "📈", color: "#f5222d", gradient: "linear-gradient(135deg, #f5222d 0%, #ff7875 100%)" },
	northbound: { label: "北向资金", icon: "🏦", color: "#722ed1", gradient: "linear-gradient(135deg, #722ed1 0%, #eb2f96 100%)" },
	trend_momentum: { label: "趋势动量", icon: "📐", color: "#fa541c", gradient: "linear-gradient(135deg, #fa541c 0%, #ffc53d 100%)" },
	combined: { label: "综合战法", icon: "🎯", color: "#d4a017", gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" },
	moat_value: { label: "护城河优选", icon: "🏰", color: "#2f54eb", gradient: "linear-gradient(135deg, #2f54eb 0%, #597ef7 100%)" },
};

function formatMoney(v: number): string {
	if (Math.abs(v) >= 10000) {
		return `${(v / 10000).toFixed(2)}万`;
	}
	return v.toFixed(2);
}

function profitColor(v: number): string {
	if (v > 0)
		return "#ff4d4f";
	if (v < 0)
		return "#52c41a";
	return "#8c8c8c";
}

export default function Home() {
	const { data: dashData, loading, refresh } = useRequest(
		async () => {
			const res = await fetchDashboard();
			return res?.data || res?.result?.data || {};
		},
		{ pollingInterval: 60000 },
	);

	const overview = dashData?.overview || {};
	const strategySummary: any[] = dashData?.strategy_summary || [];
	const positions: any[] = dashData?.positions || [];
	const recentTrades: any[] = dashData?.recent_trades || [];
	const performance: Record<string, any[]> = dashData?.performance || {};
	const recommendations: Record<string, any> = dashData?.recommendations || {};

	// ============= 收益曲线 ECharts =============
	const perfOption: EChartsOption = (() => {
		const series: any[] = [];
		const allDates = new Set<string>();

		for (const [st, data] of Object.entries(performance)) {
			if (!Array.isArray(data) || data.length === 0)
				continue;
			const cfg = STRATEGY_CONFIG[st];
			const dates = data.map((d: any) => d.trading_date || d.date || "");
			const values = data.map((d: any) => d.total_profit_pct ?? d.profit_pct ?? 0);
			for (const dd of dates)
				allDates.add(dd);
			series.push({
				name: cfg?.label || st,
				type: "line",
				smooth: true,
				symbol: "circle",
				symbolSize: 4,
				lineStyle: { width: 2.5 },
				areaStyle: { opacity: 0.08 },
				data: dates.map((d: string, i: number) => [d, values[i]]),
				itemStyle: { color: cfg?.color || "#722ed1" },
			});
		}

		if (series.length === 0) {
			return { title: { text: "暂无收益数据", left: "center", top: "center", textStyle: { color: "#bbb", fontSize: 14 } } };
		}

		const sortedDates = [...allDates].sort();

		return {
			tooltip: {
				trigger: "axis",
				axisPointer: { type: "cross" },
				formatter: (params: any) => {
					if (!Array.isArray(params))
						return "";
					let html = `<div style="font-weight:600;margin-bottom:4px">${params[0]?.axisValueLabel || ""}</div>`;
					for (const p of params) {
						const val = Number(p.value?.[1] ?? 0).toFixed(2);
						const clr = Number(val) >= 0 ? "#ff4d4f" : "#52c41a";
						html += `<div>${p.marker} ${p.seriesName}: <span style="color:${clr};font-weight:600">${val}%</span></div>`;
					}
					return html;
				},
			},
			legend: { data: series.map(s => s.name), bottom: 0 },
			grid: { left: 50, right: 20, top: 20, bottom: 40 },
			xAxis: {
				type: "category",
				data: sortedDates,
				axisLabel: { fontSize: 11, formatter: (v: string) => v.slice(5) },
			},
			yAxis: {
				type: "value",
				axisLabel: { formatter: "{value}%" },
				splitLine: { lineStyle: { type: "dashed", opacity: 0.3 } },
			},
			series,
		};
	})();

	// ============= 资产饼图 =============
	const pieOption: EChartsOption = (() => {
		if (strategySummary.length === 0) {
			return { title: { text: "暂无数据", left: "center", top: "center", textStyle: { color: "#bbb", fontSize: 14 } } };
		}
		return {
			tooltip: {
				trigger: "item",
				formatter: (p: any) => `${p.name}<br/>资产: ¥${formatMoney(p.value)}<br/>占比: ${p.percent?.toFixed(1)}%`,
			},
			legend: { bottom: 0 },
			series: [{
				type: "pie",
				radius: ["40%", "70%"],
				avoidLabelOverlap: true,
				itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
				label: { show: false },
				emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
				data: strategySummary.map((s: any) => ({
					name: STRATEGY_CONFIG[s.strategy_type]?.label || s.strategy_type,
					value: s.total_asset,
					itemStyle: { color: STRATEGY_CONFIG[s.strategy_type]?.color },
				})),
			}],
		};
	})();

	// ============= 持仓列表 =============
	const positionColumns = [
		{
			title: "股票",
			key: "stock",
			render: (_: any, r: any) => (
				<div>
					<Text strong>{r.stock_name || "-"}</Text>
					<br />
					<Text type="secondary" style={{ fontSize: 12 }}>{r.stock_code || ""}</Text>
				</div>
			),
		},
		{
			title: "策略",
			dataIndex: "strategy_type",
			key: "strategy_type",
			render: (s: string) => (
				<Tag color={STRATEGY_CONFIG[s]?.color}>
					{STRATEGY_CONFIG[s]?.icon}
					{" "}
					{STRATEGY_CONFIG[s]?.label}
				</Tag>
			),
		},
		{
			title: "持仓数量",
			dataIndex: "quantity",
			key: "quantity",
			align: "right" as const,
		},
		{
			title: "成本价",
			dataIndex: "avg_cost",
			key: "avg_cost",
			align: "right" as const,
			render: (v: number) => v?.toFixed(2),
		},
		{
			title: "现价",
			dataIndex: "current_price",
			key: "current_price",
			align: "right" as const,
			render: (v: number) => v?.toFixed(2),
		},
		{
			title: "盈亏",
			dataIndex: "unrealized_pnl",
			key: "unrealized_pnl",
			align: "right" as const,
			render: (v: number) => (
				<Text style={{ color: profitColor(v || 0), fontWeight: 600 }}>
					{(v || 0) > 0 ? "+" : ""}
					{formatMoney(v || 0)}
				</Text>
			),
		},
	];

	// ============= 交易记录列表 =============
	const tradeColumns = [
		{
			title: "日期",
			dataIndex: "trade_date",
			key: "trade_date",
			width: 100,
			render: (d: string) => <Text style={{ fontSize: 12 }}>{String(d).slice(0, 10)}</Text>,
		},
		{
			title: "股票",
			key: "stock",
			render: (_: any, r: any) => <Text>{r.stock_name || r.stock_code}</Text>,
		},
		{
			title: "方向",
			dataIndex: "action",
			key: "action",
			width: 60,
			render: (a: string) => (
				<Tag color={a === "buy" ? "red" : "green"} style={{ margin: 0 }}>
					{a === "buy" ? "买入" : "卖出"}
				</Tag>
			),
		},
		{
			title: "数量",
			dataIndex: "quantity",
			key: "quantity",
			align: "right" as const,
		},
		{
			title: "价格",
			dataIndex: "price",
			key: "price",
			align: "right" as const,
			render: (v: number) => `¥${v?.toFixed(2)}`,
		},
		{
			title: "策略",
			dataIndex: "strategy_type",
			key: "strategy_type",
			render: (s: string) => <Tag color={STRATEGY_CONFIG[s]?.color}>{STRATEGY_CONFIG[s]?.icon}</Tag>,
		},
	];

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="middle">
				{/* ==================== 总览指标卡片 ==================== */}
				<Row gutter={[16, 16]}>
					<Col xs={24} sm={12} lg={6}>
						<Card
							style={{ borderRadius: 12, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
							styles={{ body: { padding: "20px 24px" } }}
						>
							<Statistic
								title={<span style={{ color: "rgba(255,255,255,0.85)" }}>总资产</span>}
								value={overview.total_asset || 0}
								precision={2}
								prefix={<DollarOutlined />}
								valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
								suffix={<Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>元</Text>}
							/>
						</Card>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<Card
							style={{
								borderRadius: 12,
								background: (overview.total_profit || 0) >= 0
									? "linear-gradient(135deg, #eb3349 0%, #f45c43 100%)"
									: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
							}}
							styles={{ body: { padding: "20px 24px" } }}
						>
							<Statistic
								title={<span style={{ color: "rgba(255,255,255,0.85)" }}>总收益</span>}
								value={overview.total_profit || 0}
								precision={2}
								prefix={(overview.total_profit || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
								valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
								suffix={<Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>元</Text>}
							/>
						</Card>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<Card
							style={{ borderRadius: 12, background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" }}
							styles={{ body: { padding: "20px 24px" } }}
						>
							<Statistic
								title={<span style={{ color: "rgba(255,255,255,0.85)" }}>总收益率</span>}
								value={overview.total_profit_pct || 0}
								precision={2}
								prefix={<RiseOutlined />}
								valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
								suffix={<Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>%</Text>}
							/>
						</Card>
					</Col>
					<Col xs={24} sm={12} lg={6}>
						<Card
							style={{ borderRadius: 12, background: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" }}
							styles={{ body: { padding: "20px 24px" } }}
						>
							<Space split={<span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>}>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.85)" }}>持仓</span>}
									value={overview.positions_count || 0}
									prefix={<StockOutlined />}
									valueStyle={{ color: "#fff", fontSize: 22, fontWeight: 700 }}
									suffix="只"
								/>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.85)" }}>组合</span>}
									value={overview.portfolios_count || 0}
									prefix={<PieChartOutlined />}
									valueStyle={{ color: "#fff", fontSize: 22, fontWeight: 700 }}
									suffix="个"
								/>
							</Space>
						</Card>
					</Col>
				</Row>

				{/* ==================== 各策略组合卡片 ==================== */}
				<Row gutter={[16, 16]}>
					{strategySummary.map((s: any) => {
						const cfg = STRATEGY_CONFIG[s.strategy_type] || {};
						const sPositions: any[] = s.positions || [];
						return (
							<Col xs={24} md={8} key={s.strategy_type}>
								<Card
									style={{
										borderRadius: 12,
										borderTop: `3px solid ${cfg.color}`,
									}}
									styles={{ body: { padding: "16px 20px" } }}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
										<Space>
											<span style={{ fontSize: 20 }}>{cfg.icon}</span>
											<Text strong style={{ fontSize: 15 }}>{cfg.label}</Text>
										</Space>
										<Badge
											status={s.auto_trade ? "processing" : "default"}
											text={<Text type="secondary" style={{ fontSize: 12 }}>{s.auto_trade ? "自动交易中" : "已暂停"}</Text>}
										/>
									</div>
									<Row gutter={[8, 8]}>
										<Col span={8}>
											<Statistic
												title="总资产"
												value={s.total_asset}
												precision={0}
												prefix="¥"
												valueStyle={{ fontSize: 15, fontWeight: 600 }}
											/>
										</Col>
										<Col span={8}>
											<Statistic
												title="总收益"
												value={s.total_profit}
												precision={0}
												prefix={s.total_profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
												valueStyle={{ fontSize: 15, fontWeight: 600, color: profitColor(s.total_profit) }}
											/>
										</Col>
										<Col span={8}>
											<Statistic
												title="今日收益"
												value={s.daily_profit || 0}
												precision={0}
												prefix={(s.daily_profit || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
												valueStyle={{ fontSize: 15, fontWeight: 600, color: profitColor(s.daily_profit || 0) }}
											/>
										</Col>
									</Row>
									<div style={{ display: "flex", gap: 16, margin: "8px 0 4px", fontSize: 12, color: "#8c8c8c" }}>
										<span>
											收益率:
											<Text style={{ color: profitColor(s.total_profit_pct), fontSize: 12, fontWeight: 600 }}>
												{s.total_profit_pct >= 0 ? "+" : ""}
												{Number(s.total_profit_pct || 0).toFixed(2)}
												%
											</Text>
										</span>
										<span>
											持仓:
											{s.positions_count}
											只
										</span>
									</div>
									{/* 最后交易时间 + 推荐更新时间 */}
									{(() => {
										const recInfo = recommendations[s.strategy_type];
										const lastTradeDate = s.last_trade_date;
										const recDate = recInfo?.trading_date || recInfo?.generated_at;
										if (!lastTradeDate && !recDate)
											return null;
										return (
											<div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11, color: "#bfbfbf", flexWrap: "wrap" }}>
												{lastTradeDate && (
													<Tooltip title="最后一次模拟交易日期">
														<span>
															🔄 交易:
															{String(lastTradeDate).slice(0, 10)}
														</span>
													</Tooltip>
												)}
												{recDate && (
													<Tooltip title="推荐数据生成时间">
														<span>
															📡 推荐:
															{String(recDate).slice(0, 10)}
														</span>
													</Tooltip>
												)}
											</div>
										);
									})()}
									{/* 持仓股票列表 */}
									{sPositions.length > 0 && (
										<div style={{
											borderTop: "1px solid #f0f0f0",
											paddingTop: 10,
										}}
										>
											<Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: "block" }}>📋 当前持仓</Text>
											{sPositions.map((pos: any) => (
												<div
													key={pos.stock_code}
													style={{
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center",
														padding: "6px 8px",
														marginBottom: 4,
														borderRadius: 6,
														background: "#fafafa",
														fontSize: 13,
													}}
												>
													<div style={{ flex: "0 0 auto", minWidth: 80 }}>
														<Text strong style={{ fontSize: 13 }}>{pos.stock_name}</Text>
														<br />
														<Text type="secondary" style={{ fontSize: 10 }}>{pos.stock_code}</Text>
													</div>
													<div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 60 }}>
														<Text style={{ fontSize: 12 }}>
															¥
															{Number(pos.current_price || 0).toFixed(2)}
														</Text>
													</div>
													<div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 75 }}>
														<Tooltip title="今日收益（基于昨收）">
															<div>
																<Text style={{ color: profitColor(pos.daily_profit || 0), fontSize: 12, fontWeight: 600 }}>
																	{(pos.daily_profit || 0) >= 0 ? "+" : ""}
																	{formatMoney(pos.daily_profit || 0)}
																</Text>
																<br />
																<Text style={{ color: profitColor(pos.daily_profit_pct || 0), fontSize: 10 }}>
																	今日
																	{" "}
																	{(pos.daily_profit_pct || 0) >= 0 ? "+" : ""}
																	{Number(pos.daily_profit_pct || 0).toFixed(2)}
																	%
																</Text>
															</div>
														</Tooltip>
													</div>
													<div style={{ textAlign: "right", flex: "0 0 auto", minWidth: 75 }}>
														<Tooltip title="整体收益（基于成本）">
															<div>
																<Text style={{ color: profitColor(pos.profit || 0), fontSize: 12, fontWeight: 600 }}>
																	{(pos.profit || 0) >= 0 ? "+" : ""}
																	{formatMoney(pos.profit || 0)}
																</Text>
																<br />
																<Text style={{ color: profitColor(pos.profit_pct || 0), fontSize: 10 }}>
																	总
																	{" "}
																	{(pos.profit_pct || 0) >= 0 ? "+" : ""}
																	{Number(pos.profit_pct || 0).toFixed(2)}
																	%
																</Text>
															</div>
														</Tooltip>
													</div>
												</div>
											))}
										</div>
									)}
									{sPositions.length === 0 && (
										<div style={{
											borderTop: "1px solid #f0f0f0",
											paddingTop: 10,
											textAlign: "center",
										}}
										>
											<Text type="secondary" style={{ fontSize: 12 }}>暂无持仓</Text>
										</div>
									)}
								</Card>
							</Col>
						);
					})}
				</Row>

				{/* ==================== 收益曲线 + 资产饼图 ==================== */}
				<Row gutter={[16, 16]}>
					<Col xs={24} lg={16}>
						<Card
							title={(
								<Space>
									<FundOutlined style={{ color: "#1890ff" }} />
									<span>收益曲线 (30天)</span>
								</Space>
							)}
							extra={<Button icon={<ReloadOutlined />} onClick={refresh} loading={loading} size="small">刷新</Button>}
							style={{ borderRadius: 12 }}
						>
							<ReactECharts
								option={perfOption}
								style={{ height: 320 }}
								opts={{ renderer: "svg" }}
							/>
						</Card>
					</Col>
					<Col xs={24} lg={8}>
						<Card
							title={(
								<Space>
									<PieChartOutlined style={{ color: "#722ed1" }} />
									<span>资产分布</span>
								</Space>
							)}
							style={{ borderRadius: 12 }}
						>
							<ReactECharts
								option={pieOption}
								style={{ height: 320 }}
								opts={{ renderer: "svg" }}
							/>
						</Card>
					</Col>
				</Row>

				{/* ==================== 各策略推荐股票 ==================== */}
				<Card
					title={(
						<Space>
							<ThunderboltOutlined style={{ color: "#faad14" }} />
							<span>今日推荐选股</span>
						</Space>
					)}
					style={{ borderRadius: 12 }}
				>
					<Row gutter={[16, 16]}>
						{Object.keys(STRATEGY_CONFIG).map((st) => {
							const cfg = STRATEGY_CONFIG[st];
							const recData = recommendations[st];
							// Backend returns {stocks: [...], generated_at, trading_date} or legacy array
							const recs = Array.isArray(recData) ? recData : (Array.isArray(recData?.stocks) ? recData.stocks : []);
							const recGenAt = recData?.generated_at;
							return (
								<Col xs={24} sm={12} md={8} lg={6} key={st}>
									<Card
										size="small"
										title={(
											<Space>
												<span>{cfg.icon}</span>
												<Text strong>{cfg.label}</Text>
												<Tag color={cfg.color}>Top 5</Tag>
												{recGenAt && <Text type="secondary" style={{ fontSize: 10 }}>{String(recGenAt).slice(5, 16)}</Text>}
											</Space>
										)}
										style={{ borderRadius: 10, borderLeft: `3px solid ${cfg.color}` }}
									>
										{recs.length === 0
											? <Empty description="暂无推荐" image={Empty.PRESENTED_IMAGE_SIMPLE} />
											: (
												<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
													{recs.map((rec: any, idx: number) => (
														<div
															key={rec.stock_code || idx}
															style={{
																display: "flex",
																justifyContent: "space-between",
																alignItems: "center",
																padding: "8px 12px",
																background: idx % 2 === 0 ? "#fafafa" : "#fff",
																borderRadius: 6,
															}}
														>
															<Space>
																<Badge
																	count={idx + 1}
																	style={{
																		backgroundColor: idx < 3 ? cfg.color : "#d9d9d9",
																		fontSize: 11,
																	}}
																/>
																<div>
																	<Text strong style={{ fontSize: 13 }}>
																		{rec.stock_name || rec.name || "-"}
																	</Text>
																	<br />
																	<Text type="secondary" style={{ fontSize: 11 }}>
																		{rec.stock_code || rec.code || ""}
																	</Text>
																</div>
															</Space>
															<div style={{ textAlign: "right" }}>
																{rec.score != null && (
																	<Tooltip title="推荐评分">
																		<Tag color={cfg.color} style={{ margin: 0, fontSize: 12 }}>
																			{Number(rec.score).toFixed(0)}
																			分
																		</Tag>
																	</Tooltip>
																)}
																{rec.reason && (
																	<Tooltip title={rec.reason}>
																		<Text type="secondary" style={{ fontSize: 11, marginLeft: 4, cursor: "pointer" }}>
																			💬
																		</Text>
																	</Tooltip>
																)}
															</div>
														</div>
													))}
												</div>
											)}
									</Card>
								</Col>
							);
						})}
					</Row>
				</Card>

				{/* ==================== 持仓 + 交易 ==================== */}
				<Row gutter={[16, 16]}>
					<Col xs={24} lg={14}>
						<Card
							title={(
								<Space>
									<StockOutlined style={{ color: "#52c41a" }} />
									<span>当前持仓</span>
									<Tag>
										{positions.length}
										{" "}
										只
									</Tag>
								</Space>
							)}
							style={{ borderRadius: 12 }}
						>
							<Table
								columns={positionColumns}
								dataSource={positions}
								rowKey={(r: any) => `${r.stock_code}-${r.strategy_type}`}
								pagination={false}
								size="small"
								scroll={{ x: 600 }}
								locale={{ emptyText: <Empty description="暂无持仓" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
							/>
						</Card>
					</Col>
					<Col xs={24} lg={10}>
						<Card
							title={(
								<Space>
									<SwapOutlined style={{ color: "#fa8c16" }} />
									<span>最近交易</span>
								</Space>
							)}
							style={{ borderRadius: 12 }}
						>
							<Table
								columns={tradeColumns}
								dataSource={recentTrades}
								rowKey={(r: any, i: any) => `${r.stock_code}-${r.trade_date}-${i}`}
								pagination={false}
								size="small"
								scroll={{ x: 500 }}
								locale={{ emptyText: <Empty description="暂无交易记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
							/>
						</Card>
					</Col>
				</Row>
			</Space>
		</BasicContent>
	);
}
