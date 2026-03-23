import type { DragonHeadData, StockRecommendation } from "#src/api/strategy";

import type { ColumnsType } from "antd/es/table";
import { fetchDragonHeadRecommendations, refreshDragonHeadRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import {
	ClockCircleOutlined,
	CrownOutlined,
	ExperimentOutlined,
	FireOutlined,
	InfoCircleOutlined,
	ReloadOutlined,
	RiseOutlined,
	StockOutlined,
	StopOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
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

/** 推荐等级标签颜色 */
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

/** 情绪周期颜色 */
function getSentimentColor(phase: string): string {
	switch (phase) {
		case "启动": return "#52c41a";
		case "发酵": return "#1890ff";
		case "高潮": return "#fa541c";
		case "退潮": return "#8c8c8c";
		default: return "#1890ff";
	}
}

export default function DragonHead() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<DragonHeadData | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchDragonHeadRecommendations(13);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "获取推荐数据失败");
			}
		}
		catch (err: any) {
			console.error("Dragon head fetch error:", err);
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
			const response = await refreshDragonHeadRecommendations(13);
			if (response.status === "success" && response.data) {
				setData(response.data);
				message.success({ content: `刷新完成，共 ${response.data?.recommendations?.length || 0} 只推荐股`, key: "refresh" });
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

	/** 表格列定义 */
	const columns: ColumnsType<StockRecommendation> = [
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
			render: (name: string, record: StockRecommendation) => (
				<Space>
					<Text strong>{name}</Text>
					{record.in_main_theme && (
						<Tag color="volcano" icon={<FireOutlined />}>
							主线
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
			title: "连板天数",
			dataIndex: "limit_up_days",
			key: "limit_up_days",
			width: 90,
			align: "center",
			sorter: (a, b) => a.limit_up_days - b.limit_up_days,
			defaultSortOrder: "descend",
			render: (days: number) => {
				const color = days >= 4 ? "#f5222d" : days >= 3 ? "#fa541c" : days >= 2 ? "#fa8c16" : "#1890ff";
				return (
					<Tag color={color} style={{ fontWeight: 700, fontSize: 14 }}>
						{days}
						连板
					</Tag>
				);
			},
		},
		{
			title: "封板时间",
			dataIndex: "first_limit_time",
			key: "first_limit_time",
			width: 90,
			align: "center",
			render: (time: string) => {
				if (!time)
					return <Text type="secondary">-</Text>;
				const isEarly = time < "10:00";
				return (
					<Tooltip title={isEarly ? "早盘封板，资金抢筹" : "封板时间"}>
						<Tag icon={<ClockCircleOutlined />} color={isEarly ? "green" : "default"}>
							{time}
						</Tag>
					</Tooltip>
				);
			},
		},
		{
			title: "成交额",
			dataIndex: "amount",
			key: "amount",
			width: 100,
			align: "right",
			sorter: (a, b) => a.amount - b.amount,
			render: (val: number) => <Text>{formatAmount(val)}</Text>,
		},
		{
			title: "流通市值",
			dataIndex: "float_market_cap",
			key: "float_market_cap",
			width: 100,
			align: "right",
			render: (val: number) => <Text>{formatAmount(val)}</Text>,
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
			title: data?.llm_enhanced ? "GPT推荐理由" : "推荐理由",
			dataIndex: "reasons",
			key: "reasons",
			width: 280,
			render: (_: string[], record: StockRecommendation) => (
				<Space direction="vertical" size={2}>
					{record.reasons?.map((reason, idx) => (
						<Text key={idx} style={{ fontSize: 12 }}>
							•
							{" "}
							{reason}
						</Text>
					))}
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
				const { triggerRecommendations } = await import("#src/api/portfolio");
				await triggerRecommendations();
				await fetchData();
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
					description={loading ? "正在生成推荐数据，请稍候（约1-3分钟）..." : "暂无龙头战法推荐数据"}
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
						<CrownOutlined style={{ fontSize: 24, color: "#f5222d" }} />
						<Title level={4} style={{ margin: 0 }}>
							龙头战法推荐
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
					<Button
						type="primary"
						icon={<ReloadOutlined spin={refreshing} />}
						onClick={handleRefresh}
						loading={refreshing}
					>
						{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新推荐"}
					</Button>
				</div>

				{/* GPT-5.2 市场情绪研判 */}
				{data.market_sentiment && (
					<Alert
						style={{ marginBottom: 16 }}
						type={
							data.market_sentiment.risk_level === "高"
								? "error"
								: data.market_sentiment.risk_level === "中"
									? "warning"
									: "success"
						}
						showIcon
						icon={<ExperimentOutlined />}
						message={(
							<Space>
								<Text strong>GPT-5.2 市场情绪研判</Text>
								<Tag
									color={getSentimentColor(data.market_sentiment.phase)}
									style={{ fontWeight: 700 }}
								>
									{data.market_sentiment.phase}
									期
								</Tag>
								<Tag
									color={
										data.market_sentiment.risk_level === "高"
											? "red"
											: data.market_sentiment.risk_level === "中"
												? "orange"
												: "green"
									}
								>
									<WarningOutlined />
									{" "}
									风险
									{data.market_sentiment.risk_level}
								</Tag>
							</Space>
						)}
						description={data.market_sentiment.description}
					/>
				)}

				{/* 统计卡片 */}
				<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
					{/* 今日主线题材 */}
					<Col xs={24} md={12} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<FireOutlined style={{ color: "#f5222d" }} />
									<span>今日主线题材</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							{data.main_themes.length > 0
								? (
									<Space direction="vertical" size={8} style={{ width: "100%" }}>
										<Space wrap>
											{data.main_themes.map((theme, idx) => {
												const analysis = data.theme_analysis?.find(t => t.name === theme.name);
												return (
													<Tooltip
														key={idx}
														title={analysis
															? `驱动力: ${analysis.catalyst}\n持续性: ${analysis.sustainability}`
															: undefined}
													>
														<Tag
															color={idx === 0 ? "red" : idx === 1 ? "orange" : "gold"}
															style={{ fontSize: 14, padding: "4px 12px" }}
														>
															<RiseOutlined />
															{" "}
															{theme.name}
															{theme.details.change_pct
																? (
																	<span style={{ marginLeft: 4 }}>
																		{theme.details.change_pct > 0 ? "+" : ""}
																		{theme.details.change_pct.toFixed(2)}
																		%
																	</span>
																)
																: null}
															{analysis && (
																<span style={{ marginLeft: 6 }}>
																	[
																	{analysis.logic_hardness}
																	]
																</span>
															)}
														</Tag>
													</Tooltip>
												);
											})}
										</Space>
									</Space>
								)
								: (
									<Text type="secondary">暂未识别明确主线</Text>
								)}
						</Card>
					</Col>

					{/* 新闻共振 */}
					<Col xs={24} md={12} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<ThunderboltOutlined style={{ color: "#fa8c16" }} />
									<span>新闻情绪共振</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							<Space direction="vertical" style={{ width: "100%" }}>
								<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
									<Progress
										type="circle"
										percent={Math.round(data.news_resonance.resonance_score)}
										size={48}
										strokeColor={
											data.news_resonance.resonance_score >= 70
												? "#52c41a"
												: data.news_resonance.resonance_score >= 40
													? "#faad14"
													: "#f5222d"
										}
									/>
									<div>
										<Text style={{ display: "block" }}>
											分析
											{" "}
											{data.news_resonance.news_count}
											{" "}
											条快讯
										</Text>
										{data.news_resonance.matching_themes.length > 0
											? (
												<Text type="success" style={{ fontSize: 12 }}>
													{data.news_resonance.matching_themes.join("、")}
													{" "}
													共振验证通过
												</Text>
											)
											: (
												<Text type="secondary" style={{ fontSize: 12 }}>
													未形成明显共振
												</Text>
											)}
									</div>
								</div>
							</Space>
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
										valueStyle={{ fontSize: 20, color: "#1890ff" }}
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
										title="最高连板"
										value={Math.max(...data.recommendations.map(r => r.limit_up_days), 0)}
										suffix="天"
										valueStyle={{ fontSize: 20, color: "#fa541c" }}
									/>
								</Col>
							</Row>
						</Card>
					</Col>
				</Row>

				{/* 推荐列表 */}
				<Card
					title={(
						<Space>
							<TrophyOutlined style={{ color: "#faad14" }} />
							<span>推荐个股列表</span>
							<Tag>
								{data.recommendations.length}
								只
							</Tag>
						</Space>
					)}
					styles={{ body: { padding: 0 } }}
				>
					<Table<StockRecommendation>
						columns={columns}
						dataSource={data.recommendations}
						rowKey="code"
						size="middle"
						pagination={false}
						scroll={{ x: 1500 }}
						loading={loading}
						rowClassName={(record) => {
							if (record.recommendation_level === "强烈推荐")
								return "dragon-head-row-strong";
							if (record.recommendation_level === "推荐")
								return "dragon-head-row-recommend";
							if (record.recommendation_level === "回避")
								return "dragon-head-row-avoid";
							return "";
						}}
					/>
				</Card>

				{/* 策略说明 */}
				<Card
					title={(
						<Space>
							{data.llm_enhanced
								? <ExperimentOutlined style={{ color: "#722ed1" }} />
								: <InfoCircleOutlined style={{ color: "#1890ff" }} />}
							<span>{data.llm_enhanced ? "GPT-5.2 策略深度分析报告" : "策略推荐逻辑说明"}</span>
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
						{data.strategy_explanation
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
								if (line.startsWith("- ✅")) {
									return (
										<Paragraph key={idx} type="success">
											{line.replace("- ", "")}
										</Paragraph>
									);
								}
								if (line.trim().match(/^\d+\./)) {
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

			<RecommendationHistory strategyType="dragon_head" />

			{/* Custom styles */}
			<style>
				{`
				.dragon-head-row-strong {
					background-color: rgba(245, 34, 45, 0.04) !important;
				}
				.dragon-head-row-strong:hover > td {
					background-color: rgba(245, 34, 45, 0.08) !important;
				}
				.dragon-head-row-recommend {
					background-color: rgba(250, 140, 22, 0.04) !important;
				}
				.dragon-head-row-recommend:hover > td {
					background-color: rgba(250, 140, 22, 0.08) !important;
				}
				.dragon-head-row-avoid {
					background-color: rgba(140, 140, 140, 0.06) !important;
					opacity: 0.7;
				}
				.dragon-head-row-avoid:hover > td {
					background-color: rgba(140, 140, 140, 0.1) !important;
				}
			`}
			</style>
		</BasicContent>
	);
}
