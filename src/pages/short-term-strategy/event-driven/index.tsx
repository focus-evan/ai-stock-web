import type { EventDrivenData, EventStockRecommendation } from "#src/api/strategy";

import type { ColumnsType } from "antd/es/table";
import { fetchEventDrivenRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import {
	AlertOutlined,
	BulbOutlined,
	ExperimentOutlined,
	FileTextOutlined,
	FireOutlined,
	InfoCircleOutlined,
	RadarChartOutlined,
	ReloadOutlined,
	RocketOutlined,
	SearchOutlined,
	StockOutlined,
	StopOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Collapse,
	Empty,
	List,
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
import { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 格式化金额 */
function formatAmount(val: number): string {
	if (!val)
		return "-";
	if (val >= 1e12)
		return `${(val / 1e12).toFixed(2)}万亿`;
	if (val >= 1e8)
		return `${(val / 1e8).toFixed(2)}亿`;
	if (val >= 1e4)
		return `${(val / 1e4).toFixed(2)}万`;
	return val.toFixed(2);
}

/** 推荐等级颜色 */
function getLevelColor(level: string): string {
	switch (level) {
		case "强烈推荐": return "red";
		case "推荐": return "orange";
		case "回避": return "default";
		default: return "blue";
	}
}

/** 推荐等级图标 */
function getLevelIcon(level: string) {
	switch (level) {
		case "强烈推荐": return <FireOutlined />;
		case "推荐": return <TrophyOutlined />;
		case "回避": return <StopOutlined />;
		default: return <StockOutlined />;
	}
}

/** 影响等级颜色 */
function getImpactColor(level: number): string {
	if (level >= 5)
		return "#f5222d";
	if (level >= 4)
		return "#fa541c";
	if (level >= 3)
		return "#fa8c16";
	if (level >= 2)
		return "#1890ff";
	return "#8c8c8c";
}

/** 事件热度标签 */
function getHeatColor(heat: string): string {
	switch (heat) {
		case "高": return "red";
		case "中": return "orange";
		default: return "blue";
	}
}

export default function EventDriven() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<EventDrivenData | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchEventDrivenRecommendations(13);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "获取事件驱动数据失败");
			}
		}
		catch (err: any) {
			console.error("Event-driven fetch error:", err);
			setError(err?.message || "网络请求失败，请检查后端服务是否正常运行");
		}
		finally {
			setLoading(false);
		}
	}, []);

	/** 强制重新生成（不使用缓存，重新聚合新闻 + LLM分析） */
	const handleForceRefresh = useCallback(async () => {
		setRefreshing(true);
		setError(null);
		try {
			const response = await fetchEventDrivenRecommendations(13, true);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "重新生成推荐失败");
			}
		}
		catch (err: any) {
			console.error("Event-driven force refresh error:", err);
			setError(err?.message || "重新生成失败，请检查后端服务");
		}
		finally {
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	/** 表格列定义 */
	const columns: ColumnsType<EventStockRecommendation> = [
		{
			title: "排名",
			dataIndex: "rank",
			key: "rank",
			width: 60,
			align: "center",
			render: (rank: number) => {
				if (rank <= 3) {
					return (
						<Tag
							color={rank === 1 ? "#f5222d" : rank === 2 ? "#fa8c16" : "#faad14"}
							style={{
								borderRadius: "50%",
								width: 28,
								height: 28,
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								fontWeight: 700,
								fontSize: 14,
							}}
						>
							{rank}
						</Tag>
					);
				}
				return <Text type="secondary">{rank}</Text>;
			},
		},
		{
			title: "股票代码",
			dataIndex: "code",
			key: "code",
			width: 100,
			render: (code: string) => (
				<Text strong copyable={{ text: code }}>
					{code}
				</Text>
			),
		},
		{
			title: "股票名称",
			dataIndex: "name",
			key: "name",
			width: 100,
			render: (name: string, record: EventStockRecommendation) => (
				<Space>
					<Text strong>{name}</Text>
					{record.concept_count >= 3 && (
						<Tag color="volcano" icon={<ThunderboltOutlined />}>
							多概念
						</Tag>
					)}
				</Space>
			),
		},
		{
			title: "最新价",
			dataIndex: "price",
			key: "price",
			width: 80,
			align: "right",
			render: (price: number) => (
				<Text style={{ color: "#f5222d", fontWeight: 600 }}>
					{price ? price.toFixed(2) : "-"}
				</Text>
			),
		},
		{
			title: "涨跌幅",
			dataIndex: "change_pct",
			key: "change_pct",
			width: 90,
			align: "right",
			sorter: (a, b) => a.change_pct - b.change_pct,
			render: (val: number) => (
				<Text style={{ color: val >= 0 ? "#f5222d" : "#52c41a", fontWeight: 600 }}>
					{val >= 0 ? "+" : ""}
					{val.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "综合评分",
			dataIndex: "event_score",
			key: "event_score",
			width: 100,
			align: "center",
			sorter: (a, b) => a.event_score - b.event_score,
			defaultSortOrder: "descend",
			render: (score: number, record: EventStockRecommendation) => {
				const color = score >= 60 ? "#f5222d" : score >= 40 ? "#fa8c16" : "#1890ff";
				return (
					<Tooltip
						title={
							record.score_detail
								? `逻辑:${record.score_detail.logic} 历史:${record.score_detail.history} 资金:${record.score_detail.capital} 稀缺:${record.score_detail.scarcity}`
								: undefined
						}
					>
						<Tag color={color} style={{ fontWeight: 700, fontSize: 14 }}>
							{score.toFixed(1)}
						</Tag>
					</Tooltip>
				);
			},
		},
		{
			title: "影响等级",
			dataIndex: "max_impact_level",
			key: "max_impact_level",
			width: 90,
			align: "center",
			sorter: (a, b) => a.max_impact_level - b.max_impact_level,
			render: (level: number) => (
				<Badge
					count={`${level}级`}
					style={{
						backgroundColor: getImpactColor(level),
						fontWeight: 600,
					}}
				/>
			),
		},
		{
			title: "换手率",
			dataIndex: "turnover_rate",
			key: "turnover_rate",
			width: 80,
			align: "right",
			render: (val: number) => (
				<Text type={val > 15 ? "warning" : undefined}>
					{val ? `${val.toFixed(2)}%` : "-"}
				</Text>
			),
		},
		{
			title: "成交额",
			dataIndex: "amount",
			key: "amount",
			width: 100,
			align: "right",
			render: (val: number) => <Text>{formatAmount(val)}</Text>,
		},
		{
			title: "推荐等级",
			dataIndex: "recommendation_level",
			key: "recommendation_level",
			width: 110,
			align: "center",
			filters: [
				{ text: "强烈推荐", value: "强烈推荐" },
				{ text: "推荐", value: "推荐" },
				{ text: "关注", value: "关注" },
				{ text: "回避", value: "回避" },
			],
			onFilter: (value, record) => record.recommendation_level === value,
			render: (level: string) => (
				<Tag
					color={getLevelColor(level)}
					icon={getLevelIcon(level)}
					style={{ fontWeight: 600 }}
				>
					{level}
				</Tag>
			),
		},
		{
			title: data?.llm_enhanced ? "GPT事件分析" : "关联事件",
			dataIndex: "event_reason",
			key: "event_reason",
			width: 280,
			render: (_: string, record: EventStockRecommendation) => (
				<Space direction="vertical" size={2}>
					{record.event_reason && (
						<Text style={{ fontSize: 12 }}>
							<ThunderboltOutlined style={{ color: "#fa8c16", marginRight: 4 }} />
							{record.event_reason}
						</Text>
					)}
					{record.reasons?.map((reason, idx) => (
						<Text key={idx} style={{ fontSize: 12 }}>
							•
							{" "}
							{reason}
						</Text>
					))}
					{record.related_concepts?.length > 0 && (
						<Space size={2} wrap>
							{record.related_concepts.slice(0, 3).map((c, idx) => (
								<Tag key={idx} style={{ fontSize: 11 }}>
									{c}
								</Tag>
							))}
						</Space>
					)}
					{record.operation_suggestion && (
						<Tag color="blue" style={{ fontSize: 11, marginTop: 2 }}>
							💡
							{" "}
							{record.operation_suggestion}
						</Tag>
					)}
					{record.risk_warning && (
						<Text type="warning" style={{ fontSize: 11 }}>
							⚠️
							{" "}
							{record.risk_warning}
						</Text>
					)}
				</Space>
			),
		},
	];

	// Loading skeleton
	if (loading && !data) {
		return (
			<BasicContent>
				<div style={{ padding: 24 }}>
					<Skeleton active paragraph={{ rows: 2 }} />
					<div style={{ marginTop: 24 }}>
						<Skeleton active paragraph={{ rows: 8 }} />
					</div>
				</div>
			</BasicContent>
		);
	}

	// Error state
	if (error && !data) {
		return (
			<BasicContent>
				<Result
					status="error"
					title="数据获取失败"
					subTitle={error}
					extra={(
						<Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
							重新加载
						</Button>
					)}
				/>
			</BasicContent>
		);
	}

	// Empty state
	if (!data || data.recommendations.length === 0) {
		const handleGenerate = async () => {
			setLoading(true);
			setError(null);
			try {
				// 直接调用 force_refresh=true，只重新生成事件驱动推荐，避免触发全量策略
				const response = await fetchEventDrivenRecommendations(13, true);
				if (response.status === "success" && response.data) {
					setData(response.data);
				}
				else {
					setError(response.message || "生成推荐失败");
				}
			}
			catch (err: any) {
				setError(err?.message || "生成推荐失败");
			}
			finally {
				setLoading(false);
			}
		};
		return (
			<BasicContent>
				<Empty
					description={loading ? "正在生成推荐数据，请稍候（约1-3分钟）..." : "暂无事件驱动推荐数据"}
					style={{ marginTop: 80 }}
				>
					<Space>
						<Button onClick={fetchData} icon={<ReloadOutlined />}>
							刷新缓存
						</Button>
						<Button type="primary" onClick={handleGenerate} loading={loading} icon={<ThunderboltOutlined />}>
							生成推荐
						</Button>
					</Space>
				</Empty>
			</BasicContent>
		);
	}

	return (
		<BasicContent>
			<div style={{ padding: "0 0 24px 0" }}>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 16,
					}}
				>
					<Space align="center">
						<RadarChartOutlined style={{ fontSize: 24, color: "#722ed1" }} />
						<Title level={4} style={{ margin: 0 }}>
							事件驱动推荐
						</Title>
						{data.llm_enhanced && (
							<Tag color="purple" icon={<ExperimentOutlined />}>
								GPT-5.2 增强
							</Tag>
						)}
						<Tag color="processing">
							{data.trading_date}
						</Tag>
						<Text type="secondary" style={{ fontSize: 12 }}>
							生成于
							{" "}
							{data.generated_at}
						</Text>
					</Space>
					<Space>
						<Button
							icon={<ReloadOutlined />}
							onClick={fetchData}
							loading={loading}
						>
							刷新缓存
						</Button>
						<Button
							type="primary"
							icon={<ThunderboltOutlined />}
							onClick={handleForceRefresh}
							loading={refreshing}
							danger
						>
							{refreshing ? "正在重新生成..." : "重新生成"}
						</Button>
					</Space>
				</div>

				{/* 市场事件评估 */}
				{data.market_assessment && (
					<Alert
						style={{ marginBottom: 16 }}
						type={
							data.market_assessment.risk_level === "高"
								? "error"
								: data.market_assessment.risk_level === "中"
									? "warning"
									: "success"
						}
						showIcon
						icon={<AlertOutlined />}
						message={(
							<Space>
								<Text strong>GPT-5.2 事件评估</Text>
								{data.market_assessment.event_type && (
									<Tag color="purple">
										{data.market_assessment.event_type}
									</Tag>
								)}
								{data.market_assessment.heat_level && (
									<Tag color={getHeatColor(data.market_assessment.heat_level)}>
										🔥 热度
										{data.market_assessment.heat_level}
									</Tag>
								)}
								<Tag
									color={
										data.market_assessment.risk_level === "高"
											? "red"
											: data.market_assessment.risk_level === "中"
												? "orange"
												: "green"
									}
								>
									<WarningOutlined />
									{" "}
									风险
									{data.market_assessment.risk_level}
								</Tag>
							</Space>
						)}
						description={data.market_assessment.description}
					/>
				)}

				{/* 统计卡片 */}
				<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
					{/* 事件雷达 */}
					<Col xs={24} md={12} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<ThunderboltOutlined style={{ color: "#722ed1" }} />
									<span>事件雷达</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							<Space direction="vertical" style={{ width: "100%" }}>
								<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
									<Progress
										type="circle"
										percent={Math.min(
											Math.round(
												(data.events.high_impact_count / Math.max(data.events.total_analyzed, 1)) * 100,
											),
											100,
										)}
										size={48}
										strokeColor="#722ed1"
									/>
									<div>
										<Text style={{ display: "block" }}>
											分析
											{" "}
											{data.events.total_analyzed}
											{" "}
											条新闻
										</Text>
										<Text
											type={data.events.high_impact_count > 0 ? "danger" : "secondary"}
											style={{ fontSize: 12 }}
										>
											发现
											{" "}
											{data.events.high_impact_count}
											{" "}
											个高影响事件
										</Text>
									</div>
								</div>
							</Space>
						</Card>
					</Col>

					{/* 高影响事件 */}
					<Col xs={24} md={12} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<FireOutlined style={{ color: "#f5222d" }} />
									<span>高影响事件</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							{data.events.high_impact_events.length > 0
								? (
									<Space direction="vertical" size={4} style={{ width: "100%" }}>
										{data.events.high_impact_events.slice(0, 3).map((event, idx) => (
											<Tooltip key={idx} title={event.logic_chain}>
												<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
													<Badge
														count={`${event.impact_level}级`}
														style={{
															backgroundColor: getImpactColor(event.impact_level),
															fontSize: 10,
														}}
													/>
													<Text
														style={{ fontSize: 12, flex: 1 }}
														ellipsis={{ tooltip: event.title }}
													>
														{event.title}
													</Text>
												</div>
											</Tooltip>
										))}
									</Space>
								)
								: (
									<Text type="secondary">暂无高影响事件</Text>
								)}
						</Card>
					</Col>

					{/* 统计概览 */}
					<Col xs={24} md={24} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<InfoCircleOutlined style={{ color: "#1890ff" }} />
									<span>推荐概览</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							<Row gutter={16}>
								<Col span={8}>
									<Statistic
										title="推荐总数"
										value={data.total}
										valueStyle={{ fontSize: 20, color: "#722ed1" }}
									/>
								</Col>
								<Col span={8}>
									<Statistic
										title="强烈推荐"
										value={data.recommendations.filter(r => r.recommendation_level === "强烈推荐").length}
										valueStyle={{ fontSize: 20, color: "#f5222d" }}
									/>
								</Col>
								<Col span={8}>
									<Statistic
										title="最高评分"
										value={Math.max(...data.recommendations.map(r => r.event_score), 0).toFixed(1)}
										valueStyle={{ fontSize: 20, color: "#fa541c" }}
									/>
								</Col>
							</Row>
						</Card>
					</Col>
				</Row>

				{/* ===== Top 5 重要事件（核心展示区，置于推荐列表上方）===== */}
				{data.top_events && data.top_events.length > 0 && (
					<Card
						style={{ marginBottom: 16, border: "1px solid #722ed115", background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
						styles={{ body: { padding: "16px 20px" } }}
						title={(
							<Space>
								<AlertOutlined style={{ fontSize: 18, color: "#ff4d4f" }} />
								<Text strong style={{ fontSize: 15, color: "#fff" }}>
									今日最重要事件
								</Text>
								<Tag color="#722ed1" style={{ fontWeight: 600 }}>
									{data.top_events.length}
									{" "}
									个高影响事件
								</Tag>
							</Space>
						)}
					>
						<Space direction="vertical" size={12} style={{ width: "100%" }}>
							{data.top_events.map((event, idx) => {
								const isTop = event.impact_level >= 4;
								const borderColor = event.impact_level >= 5 ? "#ff4d4f" : event.impact_level >= 4 ? "#fa541c" : "#fa8c16";
								return (
									<div
										key={idx}
										style={{
											background: "rgba(255,255,255,0.04)",
											border: `1px solid ${borderColor}30`,
											borderLeft: `3px solid ${borderColor}`,
											borderRadius: 8,
											padding: "10px 14px",
										}}
									>
										<div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
											<Badge
												count={`${event.impact_level}级`}
												style={{ backgroundColor: getImpactColor(event.impact_level), fontWeight: 700, flexShrink: 0 }}
											/>
											{event.freshness === "首次" && (
												<Tag color="#f5222d" style={{ flexShrink: 0 }}>🔥 首次</Tag>
											)}
											{isTop && (
												<Tag color="#722ed1" style={{ flexShrink: 0 }}>⚡ 重大</Tag>
											)}
											<Text strong style={{ color: "#fff", lineHeight: 1.4, flex: 1 }}>
												{event.title}
											</Text>
										</div>
										{event.logic_chain && (
											<Text style={{ fontSize: 12, color: "#aaa", display: "block", marginBottom: 6 }}>
												📊 传导逻辑：
												{" "}
												{event.logic_chain}
											</Text>
										)}
										<Space size={4} wrap>
											{event.sectors?.slice(0, 6).map((sector, si) => (
												<Tag key={si} color="processing" style={{ fontSize: 11, marginBottom: 2 }}>
													{sector}
												</Tag>
											))}
											{event.keywords?.slice(0, 4).map((kw, ki) => (
												<Tag key={ki} style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
													{kw}
												</Tag>
											))}
										</Space>
										{/* 该事件关联推荐的股票 */}
										{(() => {
											const relatedStocks = data.recommendations.filter(r =>
												r.related_concepts?.some(c =>
													event.sectors?.some(s => c.includes(s) || s.includes(c))
													|| event.keywords?.some(k => c.includes(k) || k.includes(c)),
												),
											);
											return relatedStocks.length > 0
												? (
													<div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
														<Text style={{ fontSize: 11, color: "#666", marginRight: 6 }}>关联推荐：</Text>
														{relatedStocks.slice(0, 4).map((s, si) => (
															<Tag
																key={si}
																color={s.recommendation_level === "强烈推荐" ? "red" : s.recommendation_level === "推荐" ? "orange" : "default"}
																style={{ fontSize: 11 }}
															>
																{s.name}
																{" "}
																{s.code}
															</Tag>
														))}
													</div>
												)
												: null;
										})()}
									</div>
								);
							})}
						</Space>
					</Card>
				)}

				{/* 新闻摘要 */}
				{data.news_digest && (
					<>
						<Alert
							style={{ marginBottom: 16 }}
							type="info"
							showIcon
							icon={<FileTextOutlined />}
							message={(
								<Space wrap>
									<Text strong>多维度新闻聚合</Text>
									<Tag color="blue">
										{data.news_digest.total_captured}
										{" "}
										条资讯
									</Tag>
									{Object.entries(data.news_digest.by_source).map(([src, cnt]) => (
										<Tag key={src}>
											{src}
											{" "}
											{cnt as number}
											条
										</Tag>
									))}
									{data.news_digest.high_quality_news.length > 0 && (
										<Tag color="gold">
											高质量
											{data.news_digest.high_quality_news.length}
											条
										</Tag>
									)}
								</Space>
							)}
						/>

						<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
							{data.news_digest.board_signals.length > 0 && (
								<Col xs={24} md={12}>
									<Card
										size="small"
										title={(
											<Space>
												<RocketOutlined style={{ color: "#eb2f96" }} />
												<span>板块异动信号</span>
												<Tag color="magenta">{data.news_digest.board_signals.length}</Tag>
											</Space>
										)}
										styles={{ body: { padding: "12px 16px" } }}
									>
										<Space size={[4, 8]} wrap>
											{data.news_digest.board_signals.map((sig, idx) => (
												<Tag key={idx} color="magenta" style={{ fontSize: 12 }}>
													{sig.replace("【板块异动】", "").replace("板块出现明显异动", "")}
												</Tag>
											))}
										</Space>
									</Card>
								</Col>
							)}

							{data.news_digest.hot_stocks.length > 0 && (
								<Col xs={24} md={12}>
									<Card
										size="small"
										title={(
											<Space>
												<SearchOutlined style={{ color: "#fa541c" }} />
												<span>市场热搜焦点</span>
												<Tag color="volcano">{data.news_digest.hot_stocks.length}</Tag>
											</Space>
										)}
										styles={{ body: { padding: "12px 16px" } }}
									>
										<Space direction="vertical" size={2} style={{ width: "100%" }}>
											{data.news_digest.hot_stocks.slice(0, 8).map((item, idx) => (
												<Text key={idx} style={{ fontSize: 12 }}>
													{item}
												</Text>
											))}
										</Space>
									</Card>
								</Col>
							)}
						</Row>

						{data.news_digest.high_quality_news.length > 0 && (
							<Collapse
								ghost
								style={{ marginBottom: 16 }}
								items={[
									{
										key: "hq-news",
										label: (
											<Space>
												<FileTextOutlined style={{ color: "#1890ff" }} />
												<Text strong>高质量A股新闻</Text>
												<Tag color="blue">
													{data.news_digest!.high_quality_news.length}
													条
												</Tag>
											</Space>
										),
										children: (
											<List
												size="small"
												dataSource={data.news_digest!.high_quality_news}
												renderItem={(item: any) => (
													<List.Item>
														<div style={{ width: "100%" }}>
															<Space style={{ marginBottom: 4 }}>
																<Tag
																	color={
																		item.source === "财联社"
																			? "blue"
																			: item.source === "同花顺"
																				? "cyan"
																				: item.source === "东方财富"
																					? "green"
																					: item.source === "百度热搜"
																						? "orange"
																						: item.source === "板块异动监控"
																							? "magenta"
																							: "default"
																	}
																>
																	{item.source}
																</Tag>
																<Tag>{item.category}</Tag>
																<Tag color="gold">
																	评分
																	{" "}
																	{item.quality_score}
																</Tag>
															</Space>
															<div>
																<Text style={{ fontSize: 13 }}>{item.title}</Text>
															</div>
														</div>
													</List.Item>
												)}
											/>
										),
									},
								]}
							/>
						)}
					</>
				)}

				{/* 推荐列表 */}
				<Card
					title={(
						<Space>
							<TrophyOutlined style={{ color: "#faad14" }} />
							<span>事件驱动推荐个股</span>
							<Tag>
								{data.recommendations.length}
								只
							</Tag>
						</Space>
					)}
					styles={{ body: { padding: 0 } }}
				>
					<Table<EventStockRecommendation>
						columns={columns}
						dataSource={data.recommendations}
						rowKey="code"
						size="middle"
						pagination={false}
						scroll={{ x: 1500 }}
						loading={loading}
						rowClassName={(record) => {
							if (record.recommendation_level === "强烈推荐")
								return "event-row-strong";
							if (record.recommendation_level === "推荐")
								return "event-row-recommend";
							if (record.recommendation_level === "回避")
								return "event-row-avoid";
							return "";
						}}
					/>
				</Card>

				{/* 策略报告 */}
				<Card
					title={(
						<Space>
							{data.llm_enhanced
								? <ExperimentOutlined style={{ color: "#722ed1" }} />
								: <BulbOutlined style={{ color: "#1890ff" }} />}
							<span>{data.llm_enhanced ? "GPT-5.2 事件驱动策略报告" : "策略推荐逻辑说明"}</span>
						</Space>
					)}
					style={{ marginTop: 16 }}
				>
					<div
						style={{
							whiteSpace: "pre-wrap",
							lineHeight: 1.8,
							fontSize: 14,
						}}
					>
						{data.strategy_report
							.split("\n")
							.map((line, idx) => {
								if (line.startsWith("## ")) {
									return (
										<Title key={idx} level={4} style={{ margin: "16px 0 8px" }}>
											{line.replace("## ", "")}
										</Title>
									);
								}
								if (line.startsWith("### ")) {
									return (
										<Title key={idx} level={5} style={{ margin: "12px 0 6px" }}>
											{line.replace("### ", "")}
										</Title>
									);
								}
								if (line.startsWith("⚠️")) {
									return (
										<Paragraph key={idx} type="warning" style={{ fontWeight: 600 }}>
											{line}
										</Paragraph>
									);
								}
								if (line.startsWith("- **")) {
									return (
										<Paragraph key={idx} style={{ marginLeft: 16, marginBottom: 4 }}>
											{line.replace(/\*\*(.*?)\*\*/g, "$1")}
										</Paragraph>
									);
								}
								if (line.trim() === "") {
									return <br key={idx} />;
								}
								return (
									<Paragraph key={idx} style={{ marginBottom: 4 }}>
										{line.replace(/\*\*(.*?)\*\*/g, "$1")}
									</Paragraph>
								);
							})}
					</div>
				</Card>
			</div>

			<RecommendationHistory strategyType="event_driven" />

			{/* Custom styles */}
			<style>
				{`
				.event-row-strong {
					background-color: rgba(114, 46, 209, 0.04) !important;
				}
				.event-row-strong:hover > td {
					background-color: rgba(114, 46, 209, 0.08) !important;
				}
				.event-row-recommend {
					background-color: rgba(250, 140, 22, 0.04) !important;
				}
				.event-row-recommend:hover > td {
					background-color: rgba(250, 140, 22, 0.08) !important;
				}
				.event-row-avoid {
					background-color: rgba(140, 140, 140, 0.06) !important;
					opacity: 0.7;
				}
				.event-row-avoid:hover > td {
					background-color: rgba(140, 140, 140, 0.1) !important;
				}
			`}
			</style>
		</BasicContent>
	);
}
