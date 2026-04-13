import type { SentimentData, SentimentSnapshot, StockPickDetail } from "#src/api/strategy";

import { fetchSentimentData, refreshSentimentRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import {
	AlertOutlined,
	ArrowDownOutlined,
	ArrowUpOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	CrownOutlined,
	DashboardOutlined,
	ExperimentOutlined,
	EyeOutlined,
	FireOutlined,
	HeartOutlined,
	InfoCircleOutlined,
	ReloadOutlined,
	RiseOutlined,
	ThunderboltOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	message,
	Progress,
	Result,
	Row,
	Skeleton,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";

import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 信号颜色 */
function getSignalColor(signal: string): string {
	switch (signal) {
		case "冰点转折": return "#52c41a";
		case "高潮退潮": return "#f5222d";
		case "情绪过热": return "#fa8c16";
		case "情绪低迷": return "#1890ff";
		default: return "#8c8c8c";
	}
}

/** 信号图标 */
function getSignalIcon(signal: string) {
	switch (signal) {
		case "冰点转折": return <ArrowUpOutlined />;
		case "高潮退潮": return <ArrowDownOutlined />;
		case "情绪过热": return <FireOutlined />;
		case "情绪低迷": return <HeartOutlined />;
		default: return <DashboardOutlined />;
	}
}

/** 分位数颜色 */
function getPercentileColor(pct: number): string {
	if (pct >= 0.9)
		return "#f5222d";
	if (pct >= 0.7)
		return "#fa8c16";
	if (pct >= 0.3)
		return "#1890ff";
	if (pct >= 0.1)
		return "#52c41a";
	return "#722ed1";
}

/** 分位数文字 */
function getPercentileText(pct: number): string {
	if (pct >= 0.95)
		return "极度贪婪";
	if (pct >= 0.8)
		return "贪婪";
	if (pct >= 0.6)
		return "偏乐观";
	if (pct >= 0.4)
		return "中性";
	if (pct >= 0.2)
		return "偏悲观";
	if (pct >= 0.05)
		return "恐惧";
	return "极度恐惧";
}

/** 情绪阶段颜色 */
function getPhaseColor(phase: string): string {
	switch (phase) {
		case "冰点": return "#722ed1";
		case "修复": return "#1890ff";
		case "升温": return "#52c41a";
		case "高潮": return "#f5222d";
		case "退潮": return "#fa8c16";
		default: return "#8c8c8c";
	}
}

/** 选股策略中文名 */
function getStrategyName(strategy: string): string {
	const map: Record<string, string> = {
		ice_reversal: "超跌反弹",
		recovery_momentum: "情绪修复",
		warm_breakout: "突破放量",
		climax_leader: "连板龙头",
		retreat_defense: "抗跌防御",
		normal_momentum: "动量选股",
	};
	return map[strategy] || strategy;
}

/** 推荐等级颜色 */
function getLevelTagColor(level: string): string {
	switch (level) {
		case "强烈推荐": return "red";
		case "推荐": return "orange";
		default: return "blue";
	}
}

/** 情绪阶段图标 */
function getPhaseIcon(phase: string) {
	switch (phase) {
		case "冰点": return <HeartOutlined />;
		case "修复": return <RiseOutlined />;
		case "升温": return <ArrowUpOutlined />;
		case "高潮": return <FireOutlined />;
		case "退潮": return <ArrowDownOutlined />;
		default: return <DashboardOutlined />;
	}
}

/** Mini 柱状图组件 */
function MiniBarChart({ data, dataKey, color, height = 80 }: {
	data: SentimentSnapshot[]
	dataKey: keyof SentimentSnapshot
	color: string
	height?: number
}) {
	if (!data || data.length === 0)
		return <Empty description="暂无数据" />;

	const values = data.map(d => Number(d[dataKey]) || 0);
	const maxAbs = Math.max(...values.map(Math.abs), 0.01);

	return (
		<div style={{ display: "flex", alignItems: "flex-end", gap: 1, height, width: "100%" }}>
			{values.map((val, idx) => {
				const absHeight = Math.max((Math.abs(val) / maxAbs) * height * 0.9, 2);
				const barColor = val >= 0
					? color
					: "#95de64";
				const item = data[idx];
				return (
					<Tooltip
						key={item?.trading_date ?? `bar-${String(idx)}`}
						title={`${item?.trading_date || ""}: ${val >= 0
							? "+"
							: ""}${(typeof val === "number"
							? val
							: 0).toFixed(2)}`}
					>
						<div
							style={{
								flex: 1,
								height: absHeight,
								backgroundColor: barColor,
								borderRadius: 1,
								opacity: idx === values.length - 1
									? 1
									: 0.6,
								cursor: "pointer",
								transition: "opacity 0.2s",
							}}
						/>
					</Tooltip>
				);
			})}
		</div>
	);
}

/** Mini 折线区域图 - 纯 SVG */
function MiniAreaChart({ data, dataKey, color, height = 80 }: {
	data: SentimentSnapshot[]
	dataKey: keyof SentimentSnapshot
	color: string
	height?: number
}) {
	if (!data || data.length < 2)
		return <Empty description="暂无数据" />;

	const values = data.map(d => Number(d[dataKey]) || 0);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const w = 100;
	const h = height;
	const padding = 4;

	const points = values.map((v, i) => {
		const x = padding + (i / (values.length - 1)) * (w - padding * 2);
		const y = h - padding - ((v - min) / range) * (h - padding * 2);
		return `${x},${y}`;
	});

	const polyline = points.join(" ");
	const areaPoints = `${padding},${h - padding} ${polyline} ${w - padding},${h - padding}`;

	const lastX = padding + ((values.length - 1) / (values.length - 1)) * (w - padding * 2);
	const lastY = h - padding - ((values[values.length - 1] - min) / range) * (h - padding * 2);

	return (
		<svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
			<defs>
				<linearGradient id={`grad-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={color} stopOpacity={0.4} />
					<stop offset="100%" stopColor={color} stopOpacity={0.05} />
				</linearGradient>
			</defs>
			<polygon points={areaPoints} fill={`url(#grad-${dataKey as string})`} />
			<polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" />
			<circle cx={lastX} cy={lastY} r="2.5" fill={color} stroke="#fff" strokeWidth="1" />
		</svg>
	);
}

export default function SentimentPage() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<SentimentData | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchSentimentData(60);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "获取情绪数据失败");
			}
		}
		catch (err: any) {
			console.error("Sentiment fetch error:", err);
			setError(err?.message || "网络请求失败，请检查后端服务是否正常运行");
		}
		finally {
			setLoading(false);
		}
	}, []);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		message.loading({ content: "正在刷新推荐，需要2-3分钟（AI逐股分析中）...", key: "refresh", duration: 0 });
		const timer = setInterval(() => {
			setRefreshSeconds(prev => prev + 1);
		}, 1000);
		try {
			const response = await refreshSentimentRecommendations(13);
			if (response.status === "success" && response.data) {
				setData(response.data);
				const count = response.data?.stock_picks?.stocks?.length || 0;
				message.success({ content: `刷新完成，共 ${count} 只推荐股`, key: "refresh" });
			}
			else {
				message.error({ content: "刷新失败", key: "refresh" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || "刷新超时，请稍后重试", key: "refresh" });
		}
		finally {
			clearInterval(timer);
			setRefreshing(false);
			setRefreshSeconds(0);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const chartHistory = useMemo(() => {
		if (!data?.history)
			return [];
		return data.history.slice(-30);
	}, [data]);

	const tableData = useMemo(() => {
		if (!data?.history)
			return [];
		return [...data.history].reverse();
	}, [data]);

	if (error && !data) {
		return (
			<BasicContent>
				<Result
					status="error"
					title="获取情绪数据失败"
					subTitle={error}
					extra={[
						<Button key="retry" type="primary" onClick={fetchData} icon={<ReloadOutlined />}>
							重新加载
						</Button>,
					]}
				/>
			</BasicContent>
		);
	}

	const today = data?.today;
	const llm = data?.llm_analysis;

	return (
		<BasicContent>
			<div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Space>
					<HeartOutlined style={{ fontSize: 24, color: "#f5222d" }} />
					<Title level={4} style={{ margin: 0 }}>情绪战法</Title>
					{today && (
						<Tag
							color={getSignalColor(data?.signal || "正常")}
							icon={getSignalIcon(data?.signal || "正常")}
							style={{ fontSize: 14, padding: "2px 12px" }}
						>
							{data?.signal || "正常"}
						</Tag>
					)}
				</Space>
				<Space>
					{data?.generated_at && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							更新时间:
							{" "}
							{data.generated_at}
						</Text>
					)}
					<Button
						icon={<ReloadOutlined spin={refreshing} />}
						onClick={handleRefresh}
						loading={refreshing}
						type="primary"
						ghost
					>
						{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新推荐"}
					</Button>
				</Space>
			</div>

			{loading && !data
				? (
					<Skeleton active paragraph={{ rows: 12 }} />
				)
				: data
					? (
						<>
							{/* ================== 今日信号卡片 ================== */}
							{today && (today.is_ice_point || today.is_climax_retreat) && (
								<Alert
									type={today.is_ice_point
										? "success"
										: "error"}
									showIcon
									icon={today.is_ice_point
										? <ThunderboltOutlined />
										: <AlertOutlined />}
									message={(
										<Text strong style={{ fontSize: 16 }}>
											{today.is_ice_point
												? "⚡ 冰点转折信号触发！"
												: "🔴 高潮退潮信号触发！"}
										</Text>
									)}
									description={today.is_ice_point
										? "情绪分位数跌入历史5%以下且拐头向上，短线资金有望回暖，可考虑试错买入。"
										: "情绪分位数处于95%以上且连板晋级率骤降，短线高位风险加大，建议清仓回避。"}
									style={{ marginBottom: 16, borderRadius: 8 }}
								/>
							)}

							{/* ================== 每日推荐股票（置顶）================== */}
							{data.stock_picks && data.stock_picks.stocks && data.stock_picks.stocks.length > 0 && (
								<Card
									title={(
										<Space>
											<CrownOutlined style={{ color: "#faad14" }} />
											<Text strong>今日情绪推荐</Text>
											<Tag color="gold">
												{getStrategyName(data.stock_picks.pick_strategy)}
											</Tag>
											<Tag color="purple">
												{data.stock_picks.pick_count}
												{" "}
												只
											</Tag>
											{data.stock_picks.llm_enhanced && (
												<Tag color="geekblue" icon={<CheckCircleOutlined />}>
													GPT-5.2
												</Tag>
											)}
										</Space>
									)}
									style={{ marginBottom: 16, borderRadius: 8 }}
								>
									<Table<StockPickDetail>
										dataSource={data.stock_picks.stocks}
										rowKey="stock_code"
										size="small"
										scroll={{ x: 1100 }}
										pagination={false}
										columns={[
											{
												title: "#",
												dataIndex: "rank",
												key: "rank",
												width: 45,
												fixed: "left",
												align: "center",
												render: (val: number) => {
													if (val <= 3) {
														const colors = ["#f5222d", "#fa8c16", "#faad14"];
														return (
															<span style={{ color: colors[val - 1], fontWeight: 700, fontSize: 16 }}>
																{val}
															</span>
														);
													}
													return <Text type="secondary">{val}</Text>;
												},
											},
											{
												title: "代码",
												dataIndex: "stock_code",
												key: "stock_code",
												width: 80,
												fixed: "left",
												render: (val: string) => <Text style={{ fontFamily: "monospace" }}>{val}</Text>,
											},
											{
												title: "名称",
												dataIndex: "stock_name",
												key: "stock_name",
												width: 80,
												fixed: "left",
												render: (val: string) => <Text strong>{val}</Text>,
											},
											{
												title: "评级",
												dataIndex: "recommendation_level",
												key: "recommendation_level",
												width: 88,
												align: "center",
												render: (val: string) => (
													<Tag color={getLevelTagColor(val || "关注")} style={{ fontWeight: 600 }}>
														{val || "关注"}
													</Tag>
												),
											},
											{
												title: "现价",
												dataIndex: "price",
												key: "price",
												width: 70,
												align: "right",
												render: (val: number) => (val || 0).toFixed(2),
											},
											{
												title: "涨幅",
												dataIndex: "change_pct",
												key: "change_pct",
												width: 80,
												align: "right",
												sorter: (a, b) => (a.change_pct || 0) - (b.change_pct || 0),
												render: (val: number) => (
													<Text style={{ color: (val || 0) >= 0 ? "#f5222d" : "#52c41a", fontWeight: 600 }}>
														{(val || 0) >= 0 ? "+" : ""}
														{(val || 0).toFixed(2)}
														%
													</Text>
												),
											},
											{
												title: "成交额",
												dataIndex: "amount",
												key: "amount",
												width: 80,
												align: "right",
												render: (val: number) => {
													const v = val || 0;
													if (v >= 1e8)
														return `${(v / 1e8).toFixed(1)}亿`;
													if (v >= 1e4)
														return `${(v / 1e4).toFixed(0)}万`;
													return String(v);
												},
											},
											{
												title: "换手率",
												dataIndex: "turnover_rate",
												key: "turnover_rate",
												width: 70,
												align: "right",
												render: (val: number) => `${(val || 0).toFixed(1)}%`,
											},
											{
												title: "标签",
												dataIndex: "pick_reason_tag",
												key: "pick_reason_tag",
												width: 80,
												align: "center",
												render: (val: string) => <Tag color="cyan">{val}</Tag>,
											},
											{
												title: "推荐理由",
												dataIndex: "llm_reason",
												key: "llm_reason",
												width: 200,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text style={{ fontSize: 12 }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
											{
												title: "操作建议",
												dataIndex: "llm_operation",
												key: "llm_operation",
												width: 180,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text style={{ fontSize: 12, color: "#52c41a" }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
											{
												title: "风险",
												dataIndex: "llm_risk_warning",
												key: "llm_risk_warning",
												width: 150,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text type="danger" style={{ fontSize: 12 }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
										]}
									/>
								</Card>
							)}

							{/* ================== GPT-5.2 情绪深度分析 ================== */}
							{llm && (
								<Card
									style={{
										marginBottom: 16,
										borderRadius: 12,
										background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
										border: "1px solid rgba(255,255,255,0.08)",
									}}
									bodyStyle={{ padding: "20px 28px" }}
									bordered={false}
								>
									<Row gutter={[24, 16]}>
										<Col xs={24} sm={6} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
											<div style={{
												width: 100,
												height: 100,
												borderRadius: "50%",
												border: `3px solid ${getPhaseColor(llm.emotion_phase)}`,
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												justifyContent: "center",
												background: `${getPhaseColor(llm.emotion_phase)}22`,
											}}
											>
												<span style={{ fontSize: 28, color: getPhaseColor(llm.emotion_phase) }}>
													{getPhaseIcon(llm.emotion_phase)}
												</span>
												<Text style={{ color: getPhaseColor(llm.emotion_phase), fontSize: 18, fontWeight: 700, marginTop: 2 }}>
													{llm.emotion_phase}
												</Text>
											</div>
											<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 8 }}>
												{llm.phase_description}
											</Text>
										</Col>

										<Col xs={24} sm={18}>
											<div style={{ marginBottom: 16 }}>
												<Space style={{ marginBottom: 6 }}>
													<EyeOutlined style={{ color: "#1890ff" }} />
													<Text style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>市场分析</Text>
													{data.llm_enhanced && <Tag color="geekblue" style={{ fontSize: 10 }}>GPT-5.2</Tag>}
												</Space>
												<Paragraph style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: 13, lineHeight: 1.8 }}>
													{llm.market_analysis}
												</Paragraph>
											</div>

											<Row gutter={[16, 8]}>
												<Col span={8}>
													<div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
														<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>建议仓位</Text>
														<div style={{ color: "#faad14", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
															{llm.position_advice}
														</div>
													</div>
												</Col>
												<Col span={8}>
													<div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
														<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>操作建议</Text>
														<div style={{ color: "#52c41a", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
															{llm.operation_advice}
														</div>
													</div>
												</Col>
												<Col span={8}>
													<div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" }}>
														<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>次日展望</Text>
														<div style={{ color: "#1890ff", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
															{llm.next_day_outlook}
														</div>
													</div>
												</Col>
											</Row>

											<Row gutter={16} style={{ marginTop: 12 }}>
												<Col span={12}>
													<Space direction="vertical" size={4} style={{ width: "100%" }}>
														<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
															<WarningOutlined style={{ color: "#f5222d" }} />
															{" "}
															风险提示
														</Text>
														{(llm.risk_points || []).map(p => (
															<Text key={p} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
																•
																{" "}
																{p}
															</Text>
														))}
													</Space>
												</Col>
												<Col span={12}>
													<Space direction="vertical" size={4} style={{ width: "100%" }}>
														<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
															<BulbOutlined style={{ color: "#52c41a" }} />
															{" "}
															机会发现
														</Text>
														{(llm.opportunity_points || []).map(p => (
															<Text key={p} style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
																•
																{" "}
																{p}
															</Text>
														))}
													</Space>
												</Col>
											</Row>
										</Col>
									</Row>
								</Card>
							)}

							{/* ================== 情绪温度计 ================== */}
							{today && (
								<Card
									style={{ marginBottom: 16, borderRadius: 12, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
									bodyStyle={{ padding: "24px 32px" }}
									bordered={false}
								>
									<Row gutter={[32, 16]} align="middle">
										<Col xs={24} sm={8} style={{ textAlign: "center" }}>
											<div style={{ position: "relative", display: "inline-block" }}>
												<Progress
													type="dashboard"
													percent={Math.round((today.sentiment_percentile || 0) * 100)}
													strokeColor={getPercentileColor(today.sentiment_percentile || 0)}
													trailColor="rgba(255,255,255,0.1)"
													format={pct => (
														<div>
															<div style={{ fontSize: 28, fontWeight: 700, color: getPercentileColor(today.sentiment_percentile || 0) }}>
																{pct}
															</div>
															<div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
																{getPercentileText(today.sentiment_percentile || 0)}
															</div>
														</div>
													)}
													size={160}
												/>
											</div>
											<div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 8 }}>
												情绪历史分位（近一年）
											</div>
										</Col>
										<Col xs={24} sm={16}>
											<Row gutter={[24, 16]}>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>综合情绪</Text>}
														value={today.composite_sentiment || 0}
														precision={2}
														valueStyle={{
															color: (today.composite_sentiment || 0) >= 0
																? "#52c41a"
																: "#f5222d",
															fontSize: 22,
														}}
														prefix={(today.composite_sentiment || 0) >= 0
															? <ArrowUpOutlined />
															: <ArrowDownOutlined />}
													/>
												</Col>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>涨停家数</Text>}
														value={today.limit_up_count || 0}
														valueStyle={{ color: "#f5222d", fontSize: 22 }}
														suffix={(
															<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
																/ 跌停
																{" "}
																{today.limit_down_count || 0}
															</Text>
														)}
													/>
												</Col>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>连板晋级率</Text>}
														value={((today.promotion_rate || 0) * 100)}
														precision={1}
														valueStyle={{ color: "#faad14", fontSize: 22 }}
														suffix="%"
													/>
												</Col>
											</Row>
											<Row gutter={[24, 16]} style={{ marginTop: 16 }}>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>涨停溢价率</Text>}
														value={today.limit_up_premium || 0}
														precision={2}
														valueStyle={{
															color: (today.limit_up_premium || 0) >= 0
																? "#52c41a"
																: "#f5222d",
															fontSize: 18,
														}}
														suffix="%"
													/>
												</Col>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>涨跌停比</Text>}
														value={((today.up_down_ratio || 0) * 100)}
														precision={1}
														valueStyle={{ color: "#1890ff", fontSize: 18 }}
														suffix="%"
													/>
												</Col>
												<Col span={8}>
													<Statistic
														title={<Text style={{ color: "rgba(255,255,255,0.65)" }}>连板/昨涨停</Text>}
														value={today.continuous_limit_up_count || 0}
														valueStyle={{ color: "#faad14", fontSize: 18 }}
														suffix={(
															<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
																/
																{" "}
																{today.pre_limit_up_count || 0}
															</Text>
														)}
													/>
												</Col>
											</Row>
										</Col>
									</Row>
								</Card>
							)}

							{/* ================== 三大指标趋势图 ================== */}
							<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
								<Col xs={24} md={8}>
									<Card
										title={(
											<Space>
												<RiseOutlined style={{ color: "#f5222d" }} />
												<Text strong>涨停溢价率</Text>
												<Tooltip title="昨日涨停股今日的平均涨跌幅，反映短线资金的赚钱效应">
													<InfoCircleOutlined style={{ color: "#8c8c8c" }} />
												</Tooltip>
											</Space>
										)}
										bodyStyle={{ padding: "12px 16px" }}
										style={{ borderRadius: 8 }}
									>
										{today && (
											<div style={{ textAlign: "center", marginBottom: 8 }}>
												<Text style={{
													fontSize: 28,
													fontWeight: 700,
													color: (today.limit_up_premium || 0) >= 0
														? "#f5222d"
														: "#52c41a",
												}}
												>
													{(today.limit_up_premium || 0) >= 0
														? "+"
														: ""}
													{(today.limit_up_premium || 0).toFixed(2)}
													%
												</Text>
												<br />
												<Text type="secondary" style={{ fontSize: 12 }}>
													Z-Score:
													{" "}
													{(today.z_premium || 0).toFixed(2)}
												</Text>
											</div>
										)}
										<MiniBarChart data={chartHistory} dataKey="limit_up_premium" color="#f5222d" />
									</Card>
								</Col>
								<Col xs={24} md={8}>
									<Card
										title={(
											<Space>
												<ExperimentOutlined style={{ color: "#1890ff" }} />
												<Text strong>涨跌停比</Text>
												<Tooltip title="涨停家数÷(涨停+跌停)，反映市场整体做多广度">
													<InfoCircleOutlined style={{ color: "#8c8c8c" }} />
												</Tooltip>
											</Space>
										)}
										bodyStyle={{ padding: "12px 16px" }}
										style={{ borderRadius: 8 }}
									>
										{today && (
											<div style={{ textAlign: "center", marginBottom: 8 }}>
												<Text style={{ fontSize: 28, fontWeight: 700, color: "#1890ff" }}>
													{((today.up_down_ratio || 0) * 100).toFixed(1)}
													%
												</Text>
												<br />
												<Text type="secondary" style={{ fontSize: 12 }}>
													Z-Score:
													{" "}
													{(today.z_ratio || 0).toFixed(2)}
												</Text>
											</div>
										)}
										<MiniAreaChart data={chartHistory} dataKey="up_down_ratio" color="#1890ff" />
									</Card>
								</Col>
								<Col xs={24} md={8}>
									<Card
										title={(
											<Space>
												<FireOutlined style={{ color: "#faad14" }} />
												<Text strong>连板晋级率</Text>
												<Tooltip title="昨日涨停股中今日继续涨停的比例，反映资金接力意愿">
													<InfoCircleOutlined style={{ color: "#8c8c8c" }} />
												</Tooltip>
											</Space>
										)}
										bodyStyle={{ padding: "12px 16px" }}
										style={{ borderRadius: 8 }}
									>
										{today && (
											<div style={{ textAlign: "center", marginBottom: 8 }}>
												<Text style={{ fontSize: 28, fontWeight: 700, color: "#faad14" }}>
													{((today.promotion_rate || 0) * 100).toFixed(1)}
													%
												</Text>
												<br />
												<Text type="secondary" style={{ fontSize: 12 }}>
													Z-Score:
													{" "}
													{(today.z_promotion || 0).toFixed(2)}
												</Text>
											</div>
										)}
										<MiniAreaChart data={chartHistory} dataKey="promotion_rate" color="#faad14" />
									</Card>
								</Col>
							</Row>

							{/* ================== 综合情绪曲线 ================== */}
							<Card
								title={(
									<Space>
										<DashboardOutlined style={{ color: "#722ed1" }} />
										<Text strong>综合情绪曲线</Text>
										<Tooltip title="三大指标Z-Score之和，正值偏多/负值偏空，越极端信号越强">
											<InfoCircleOutlined style={{ color: "#8c8c8c" }} />
										</Tooltip>
									</Space>
								)}
								bodyStyle={{ padding: "12px 16px" }}
								style={{ marginBottom: 16, borderRadius: 8 }}
							>
								<MiniAreaChart data={chartHistory} dataKey="composite_sentiment" color="#722ed1" height={120} />
								<div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
									{chartHistory.length > 0 && (
										<>
											<Text type="secondary" style={{ fontSize: 11 }}>
												{chartHistory[0]?.trading_date}
											</Text>
											<Text type="secondary" style={{ fontSize: 11 }}>
												{chartHistory[chartHistory.length - 1]?.trading_date}
											</Text>
										</>
									)}
								</div>
							</Card>

							{/* ================== 每日推荐股票 ================== */}
							{data.stock_picks && data.stock_picks.stocks && data.stock_picks.stocks.length > 0 && (
								<Card
									title={(
										<Space>
											<CrownOutlined style={{ color: "#faad14" }} />
											<Text strong>今日情绪推荐</Text>
											<Tag color="gold">
												{getStrategyName(data.stock_picks.pick_strategy)}
											</Tag>
											<Tag color="purple">
												{data.stock_picks.pick_count}
												{" "}
												只
											</Tag>
											{data.stock_picks.llm_enhanced && (
												<Tag color="geekblue" icon={<CheckCircleOutlined />}>
													GPT-5.2
												</Tag>
											)}
										</Space>
									)}
									style={{ marginBottom: 16, borderRadius: 8 }}
								>
									<Table<StockPickDetail>
										dataSource={data.stock_picks.stocks}
										rowKey="stock_code"
										size="small"
										scroll={{ x: 1400 }}
										pagination={false}
										columns={[
											{
												title: "#",
												dataIndex: "rank",
												key: "rank",
												width: 45,
												fixed: "left",
												align: "center",
												render: (val: number) => {
													if (val <= 3) {
														const colors = ["#f5222d", "#fa8c16", "#faad14"];
														return (
															<span style={{ color: colors[val - 1], fontWeight: 700, fontSize: 16 }}>
																{val}
															</span>
														);
													}
													return <Text type="secondary">{val}</Text>;
												},
											},
											{
												title: "代码",
												dataIndex: "stock_code",
												key: "stock_code",
												width: 80,
												fixed: "left",
												render: (val: string) => <Text style={{ fontFamily: "monospace" }}>{val}</Text>,
											},
											{
												title: "名称",
												dataIndex: "stock_name",
												key: "stock_name",
												width: 80,
												fixed: "left",
												render: (val: string) => <Text strong>{val}</Text>,
											},
											{
												title: "评级",
												dataIndex: "recommendation_level",
												key: "recommendation_level",
												width: 80,
												align: "center",
												render: (val: string) => (
													<Tag color={getLevelTagColor(val || "关注")}>
														{val || "关注"}
													</Tag>
												),
											},
											{
												title: "现价",
												dataIndex: "price",
												key: "price",
												width: 70,
												align: "right",
												render: (val: number) => (val || 0).toFixed(2),
											},
											{
												title: "涨幅",
												dataIndex: "change_pct",
												key: "change_pct",
												width: 80,
												align: "right",
												sorter: (a, b) => (a.change_pct || 0) - (b.change_pct || 0),
												render: (val: number) => (
													<Text style={{
														color: (val || 0) >= 0
															? "#f5222d"
															: "#52c41a",
														fontWeight: 600,
													}}
													>
														{(val || 0) >= 0
															? "+"
															: ""}
														{(val || 0).toFixed(2)}
														%
													</Text>
												),
											},
											{
												title: "成交额",
												dataIndex: "amount",
												key: "amount",
												width: 80,
												align: "right",
												render: (val: number) => {
													const v = val || 0;
													if (v >= 1e8)
														return `${(v / 1e8).toFixed(1)}亿`;
													if (v >= 1e4)
														return `${(v / 1e4).toFixed(0)}万`;
													return String(v);
												},
											},
											{
												title: "换手率",
												dataIndex: "turnover_rate",
												key: "turnover_rate",
												width: 70,
												align: "right",
												render: (val: number) => `${(val || 0).toFixed(1)}%`,
											},
											{
												title: "标签",
												dataIndex: "pick_reason_tag",
												key: "pick_reason_tag",
												width: 80,
												align: "center",
												render: (val: string) => <Tag color="cyan">{val}</Tag>,
											},
											{
												title: "推荐理由",
												dataIndex: "llm_reason",
												key: "llm_reason",
												width: 180,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text style={{ fontSize: 12 }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
											{
												title: "风险",
												dataIndex: "llm_risk_warning",
												key: "llm_risk_warning",
												width: 140,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text type="danger" style={{ fontSize: 12 }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
											{
												title: "操作",
												dataIndex: "llm_operation",
												key: "llm_operation",
												width: 120,
												ellipsis: true,
												render: (val: string) => (
													<Tooltip title={val}>
														<Text style={{ fontSize: 12, color: "#52c41a" }}>{val || "-"}</Text>
													</Tooltip>
												),
											},
										]}
									/>
								</Card>
							)}

							{/* ================== 历史数据表格 ================== */}
							<Card
								title={(
									<Space>
										<Text strong>历史情绪数据</Text>
										<Tag color="blue">
											{tableData.length}
											{" "}
											个交易日
										</Tag>
									</Space>
								)}
								style={{ borderRadius: 8 }}
							>
								<Table
									dataSource={tableData}
									rowKey="trading_date"
									size="small"
									scroll={{ x: 1200 }}
									pagination={{ pageSize: 15, showSizeChanger: true, size: "small" }}
									rowClassName={(record) => {
										if (record.is_ice_point)
											return "row-ice-point";
										if (record.is_climax_retreat)
											return "row-climax";
										return "";
									}}
									columns={[
										{
											title: "日期",
											dataIndex: "trading_date",
											key: "trading_date",
											width: 100,
											fixed: "left",
											render: (val: string, record: SentimentSnapshot) => (
												<Space>
													<Text>{val}</Text>
													{record.is_ice_point && <Tag color="green" style={{ fontSize: 10 }}>冰点</Tag>}
													{record.is_climax_retreat && <Tag color="red" style={{ fontSize: 10 }}>高潮退潮</Tag>}
												</Space>
											),
										},
										{
											title: "涨停",
											dataIndex: "limit_up_count",
											key: "limit_up_count",
											width: 60,
											align: "center",
											render: (val: number) => <Text style={{ color: "#f5222d", fontWeight: 600 }}>{val}</Text>,
										},
										{
											title: "跌停",
											dataIndex: "limit_down_count",
											key: "limit_down_count",
											width: 60,
											align: "center",
											render: (val: number) => <Text style={{ color: "#52c41a", fontWeight: 600 }}>{val}</Text>,
										},
										{
											title: "溢价率",
											dataIndex: "limit_up_premium",
											key: "limit_up_premium",
											width: 90,
											align: "right",
											sorter: (a, b) => (a.limit_up_premium || 0) - (b.limit_up_premium || 0),
											render: (val: number) => (
												<Text style={{
													color: (val || 0) >= 0
														? "#f5222d"
														: "#52c41a",
													fontWeight: 600,
												}}
												>
													{(val || 0) >= 0
														? "+"
														: ""}
													{(val || 0).toFixed(2)}
													%
												</Text>
											),
										},
										{
											title: "涨跌停比",
											dataIndex: "up_down_ratio",
											key: "up_down_ratio",
											width: 90,
											align: "right",
											sorter: (a, b) => (a.up_down_ratio || 0) - (b.up_down_ratio || 0),
											render: (val: number) => `${((val || 0) * 100).toFixed(1)}%`,
										},
										{
											title: "晋级率",
											dataIndex: "promotion_rate",
											key: "promotion_rate",
											width: 80,
											align: "right",
											sorter: (a, b) => (a.promotion_rate || 0) - (b.promotion_rate || 0),
											render: (val: number) => `${((val || 0) * 100).toFixed(1)}%`,
										},
										{
											title: "综合情绪",
											dataIndex: "composite_sentiment",
											key: "composite_sentiment",
											width: 100,
											align: "right",
											sorter: (a, b) => (a.composite_sentiment || 0) - (b.composite_sentiment || 0),
											render: (val: number) => (
												<Text style={{
													color: (val || 0) >= 0
														? "#f5222d"
														: "#52c41a",
													fontWeight: 700,
												}}
												>
													{(val || 0) >= 0
														? "+"
														: ""}
													{(val || 0).toFixed(2)}
												</Text>
											),
										},
										{
											title: "分位数",
											dataIndex: "sentiment_percentile",
											key: "sentiment_percentile",
											width: 100,
											align: "center",
											sorter: (a, b) => (a.sentiment_percentile || 0) - (b.sentiment_percentile || 0),
											render: (val: number) => {
												const pct = Math.round((val || 0) * 100);
												return (
													<Progress
														percent={pct}
														size="small"
														strokeColor={getPercentileColor(val || 0)}
														format={() => `${pct}%`}
														style={{ width: 80 }}
													/>
												);
											},
										},
										{
											title: "信号",
											dataIndex: "signal_text",
											key: "signal_text",
											width: 90,
											align: "center",
											filters: [
												{ text: "冰点转折", value: "冰点转折" },
												{ text: "高潮退潮", value: "高潮退潮" },
												{ text: "情绪过热", value: "情绪过热" },
												{ text: "情绪低迷", value: "情绪低迷" },
												{ text: "正常", value: "正常" },
											],
											onFilter: (value, record) => record.signal_text === value,
											render: (val: string) => (
												<Tag color={getSignalColor(val || "正常")} style={{ margin: 0 }}>
													{val || "正常"}
												</Tag>
											),
										},
									]}
								/>
							</Card>

							{/* ================== 底部说明 ================== */}
							<Card style={{ marginTop: 16, borderRadius: 8 }}>
								<Title level={5}>
									<WarningOutlined style={{ color: "#faad14" }} />
									{" "}
									指标说明与风险提示
								</Title>
								<Paragraph type="secondary" style={{ fontSize: 13 }}>
									<strong>1. 涨停溢价率</strong>
									：昨日涨停股今日的平均涨跌幅。正值说明市场有赚钱效应，
									负值说明跟风打板亏钱，是短线资金最敏感的指标。
								</Paragraph>
								<Paragraph type="secondary" style={{ fontSize: 13 }}>
									<strong>2. 涨跌停比</strong>
									：涨停家数÷(涨停+跌停)。越接近1说明做多共识越强，
									低于0.5说明跌停多于涨停，市场严重分化。
								</Paragraph>
								<Paragraph type="secondary" style={{ fontSize: 13 }}>
									<strong>3. 连板晋级率</strong>
									：昨日涨停股中今日继续涨停的比例。反映资金的接力意愿，
									高晋级率说明市场活跃，低晋级率预示退潮。
								</Paragraph>
								<Paragraph type="secondary" style={{ fontSize: 13 }}>
									<strong>交易信号</strong>
									：
									<Tag color="green">冰点转折</Tag>
									{" "}
									情绪跌入历史5%分位且拐头向上，可试错做多；
									<Tag color="red">高潮退潮</Tag>
									{" "}
									情绪处于95%分位以上且晋级率骤降20%+，建议清仓。
								</Paragraph>
								<Paragraph type="secondary" style={{ fontSize: 12 }}>
									⚠️ 以上为量化模型输出，不构成投资建议。情绪指标适用于短线交易，需结合个股基本面综合判断。
								</Paragraph>
							</Card>
						</>
					)
					: null}

			<RecommendationHistory strategyType="sentiment" />

			<style>
				{`
				.row-ice-point td {
					background-color: rgba(82, 196, 26, 0.08) !important;
				}
				.row-climax td {
					background-color: rgba(245, 34, 45, 0.08) !important;
				}
			`}
			</style>
		</BasicContent>
	);
}
