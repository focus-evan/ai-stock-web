/* eslint-disable react/no-array-index-key */
import type { RelayData, RelayStock } from "#src/api/strategy";

import type { ColumnsType } from "antd/es/table";
import { fetchRelayRecommendations, refreshRelayRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import {
	ClockCircleOutlined,
	ExperimentOutlined,
	FireOutlined,
	InfoCircleOutlined,
	LinkOutlined,
	ReloadOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
	Empty,
	message,
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

/** 概率颜色 */
function getProbColor(prob: string): string {
	if (prob === "高")
		return "#f5222d";
	if (prob === "中")
		return "#fa8c16";
	return "#52c41a";
}

export default function Relay() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<RelayData | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchRelayRecommendations(15);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "获取推荐数据失败");
			}
		}
		catch (err: any) {
			console.error("Relay fetch error:", err);
			setError(err?.message || "网络请求失败，请检查后端服务是否正常运行");
		}
		finally {
			setLoading(false);
		}
	}, []);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		message.loading({ content: "正在刷新连板预判，需要1-2分钟（AI逐股评估中）...", key: "refresh", duration: 0 });
		const timer = setInterval(() => {
			setRefreshSeconds(prev => prev + 1);
		}, 1000);
		try {
			const response = await refreshRelayRecommendations(15);
			if (response.status === "success" && response.data) {
				setData(response.data);
				message.success({ content: `刷新完成，共 ${response.data?.recommendations?.length || 0} 只潜力股`, key: "refresh" });
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
	const columns: ColumnsType<RelayStock> = [
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
			width: 90,
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
			render: (name: string, record: RelayStock) => (
				<Space direction="vertical" size={2}>
					<Text strong>{name}</Text>
					<Tag color="cyan" style={{ fontSize: 11, padding: "0 4px" }}>{record.industry.slice(0, 4)}</Tag>
				</Space>
			),
		},
		{
			title: "板型评分",
			key: "board_info",
			width: 110,
			align: "center",
			render: (_, record: RelayStock) => (
				<Space direction="vertical" size={2} align="center">
					<Tag color={record.limit_up_days >= 3 ? "#f5222d" : record.limit_up_days === 2 ? "#fa8c16" : "#1890ff"}>
						{record.board_label}
					</Tag>
					<Statistic value={record.relay_score} valueStyle={{ fontSize: 16, fontWeight: 600, color: "#f5222d" }} />
				</Space>
			),
		},
		{
			title: "封板时间",
			dataIndex: "first_limit_time",
			key: "first_limit_time",
			width: 90,
			align: "center",
			render: (time: string, record: RelayStock) => {
				if (!time)
					return <Text type="secondary">-</Text>;
				const score = record.score_detail?.seal_time || 0;
				return (
					<Tooltip title={`封板时间得分: ${score}`}>
						<Tag icon={<ClockCircleOutlined />} color={score >= 80 ? "green" : score >= 50 ? "blue" : "default"}>
							{time}
						</Tag>
					</Tooltip>
				);
			},
		},
		{
			title: "成交额/换手",
			key: "amount_turnover",
			width: 100,
			align: "right",
			render: (_, record: RelayStock) => (
				<Space direction="vertical" size={2} align="end">
					<Text>{formatAmount(record.amount)}</Text>
					<Text type={record.turnover_rate > 20 ? "warning" : "secondary"}>
						{record.turnover_rate ? `${record.turnover_rate.toFixed(2)}%` : "-"}
					</Text>
				</Space>
			),
		},
		{
			title: "AI 连板概率",
			key: "probability",
			width: 100,
			align: "center",
			render: (_, record: RelayStock) => {
				if (!record.relay_probability)
					return <Text type="secondary">-</Text>;
				return (
					<Space direction="vertical" size={2} align="center">
						<Tag color={getProbColor(record.relay_probability)} style={{ fontWeight: 600 }}>
							{record.relay_probability}
							{" "}
							(
							{(record.relay_probability_pct || 0)}
							%)
						</Tag>
					</Space>
				);
			},
		},
		{
			title: "介入时机",
			dataIndex: "entry_timing",
			key: "entry_timing",
			width: 120,
			align: "center",
			render: (timing: string) => (
				timing
					? (
						<Tag color={timing.includes("放弃") ? "default" : timing.includes("排板") ? "purple" : "blue"}>
							{timing}
						</Tag>
					)
					: <Text type="secondary">-</Text>
			),
		},
		{
			title: "价格策略",
			key: "prices",
			width: 130,
			align: "right",
			render: (_, record: RelayStock) => (
				<Space direction="vertical" size={2} align="end">
					<Text style={{ fontSize: 13 }}>
						买入:
						<Text strong style={{ color: "#fa541c" }}>{record.buy_price || "-"}</Text>
					</Text>
					<Text style={{ fontSize: 12 }}>
						止损:
						<Text type="secondary">{record.stop_loss_price || "-"}</Text>
					</Text>
					<Text style={{ fontSize: 12 }}>
						目标:
						<Text style={{ color: "#f5222d" }}>{record.target_price || "-"}</Text>
					</Text>
				</Space>
			),
		},
		{
			title: "核心逻辑",
			key: "reasoning",
			width: 280,
			render: (_, record: RelayStock) => (
				<Space direction="vertical" size={2}>
					<Text strong style={{ fontSize: 13, color: "#1890ff" }}>
						{record.buy_reason || record.reasons?.[0] || "-"}
					</Text>
					{record.next_day_outlook && (
						<Text style={{ fontSize: 12, color: "#595959" }}>
							<ExperimentOutlined />
							{" "}
							{record.next_day_outlook}
						</Text>
					)}
					{record.risk_warning && (
						<Text type="warning" style={{ fontSize: 11 }}>
							<WarningOutlined />
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
				setError(err?.message || "生成预判失败");
			}
			finally {
				setLoading(false);
			}
		};
		return (
			<BasicContent>
				<Empty
					description={loading ? "正在生成连板预判，请稍候（约1-3分钟）..." : "暂无连板接力推荐数据"}
					style={{ marginTop: 80 }}
				>
					<Space>
						<Button onClick={fetchData} icon={<ReloadOutlined />}>
							刷新缓存
						</Button>
						<Button type="primary" onClick={handleGenerate} loading={loading} icon={<ThunderboltOutlined />}>
							生成预判
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
						<LinkOutlined style={{ fontSize: 24, color: "#fa541c" }} />
						<Title level={4} style={{ margin: 0 }}>
							连板接力预判
						</Title>
						{data.llm_enhanced && (
							<Tag color="purple" icon={<ExperimentOutlined />}>
								AI 深度评估
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
						{refreshing ? `AI评估中 ${refreshSeconds}s...` : "刷新预判"}
					</Button>
				</div>

				{/* 统计概览 */}
				<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
					<Col xs={24} md={12} xl={8}>
						<Card
							size="small"
							title={(
								<Space>
									<InfoCircleOutlined style={{ color: "#1890ff" }} />
									<span>
										市场概览 (
										{data.trading_date}
										)
									</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							<Row gutter={16}>
								<Col span={12}>
									<Statistic
										title="今日涨停数"
										value={data.total_limit_up || "-"}
										suffix="只"
										valueStyle={{ fontSize: 24, color: "#f5222d" }}
									/>
								</Col>
								<Col span={12}>
									<Statistic
										title="市场情绪"
										value={data.market_emotion || "未知"}
										valueStyle={{ fontSize: 24, color: data.market_emotion === "极度亢奋" ? "#f5222d" : data.market_emotion === "活跃" ? "#fa541c" : "#faad14" }}
									/>
								</Col>
							</Row>
						</Card>
					</Col>

					<Col xs={24} md={12} xl={16}>
						<Card
							size="small"
							title={(
								<Space>
									<FireOutlined style={{ color: "#fa8c16" }} />
									<span>连板高度分布</span>
								</Space>
							)}
							styles={{ body: { padding: "12px 16px" } }}
						>
							<Space size={16} wrap>
								{data.board_distribution
									? (
										Object.entries(data.board_distribution)
											.sort((a, b) => Number(b[0]) - Number(a[0]))
											.map(([height, count]) => (
												<Statistic
													key={height}
													title={`${height}板`}
													value={count}
													suffix="只"
													valueStyle={{
														fontSize: 20,
														color: Number(height) >= 4 ? "#f5222d" : Number(height) >= 2 ? "#fa541c" : "#595959",
													}}
												/>
											))
									)
									: <Text type="secondary">暂无数据</Text>}
							</Space>
						</Card>
					</Col>
				</Row>

				{/* 推荐列表 */}
				<Card
					title={(
						<Space>
							<TrophyOutlined style={{ color: "#faad14" }} />
							<span>次日候选名单</span>
							<Tag>
								{data.total}
								{" "}
								只潜力股
							</Tag>
						</Space>
					)}
					styles={{ body: { padding: 0 } }}
				>
					<Table<RelayStock>
						columns={columns}
						dataSource={data.recommendations}
						rowKey="code"
						size="middle"
						pagination={false}
						scroll={{ x: 1300 }}
						loading={loading}
						rowClassName={(record) => {
							if (record.relay_probability === "高" || record.recommendation_level === "强烈推荐")
								return "relay-row-high";
							if (record.relay_probability === "中" || record.recommendation_level === "推荐")
								return "relay-row-med";
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
							<span>{data.llm_enhanced ? "AI 接力研判报告" : "连板接力操作说明"}</span>
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
								if (line.startsWith("- ")) {
									return (
										<Paragraph key={idx} style={{ marginLeft: 16, marginBottom: 4 }}>
											•
											{" "}
											{line.replace("- ", "").replace(/\*\*(.*?)\*\*/g, "$1")}
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

			<RecommendationHistory strategyType="relay" />

			{/* Custom styles */}
			<style>
				{`
				.relay-row-high {
					background-color: rgba(245, 34, 45, 0.04) !important;
				}
				.relay-row-high:hover > td {
					background-color: rgba(245, 34, 45, 0.08) !important;
				}
				.relay-row-med {
					background-color: rgba(250, 140, 22, 0.04) !important;
				}
				.relay-row-med:hover > td {
					background-color: rgba(250, 140, 22, 0.08) !important;
				}
			`}
			</style>
		</BasicContent>
	);
}
