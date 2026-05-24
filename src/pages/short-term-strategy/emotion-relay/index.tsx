import type { ColumnsType } from "antd/es/table";
import { fetchEmotionRelayRecommendations, refreshEmotionRelayRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";
import { EmotionRelayFollowExecutionTab } from "#src/pages/short-term-strategy/dragon-head-follow";
import {
	ExperimentOutlined,
	FireOutlined,
	HeartOutlined,
	ReloadOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
} from "@ant-design/icons";
import {
	Alert,
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
	Tabs,
	Tag,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

interface EmotionRelayData {
	market_regime?: {
		phase?: string
		risk_level?: string
		action_bias?: string
		description?: string
		position_advice?: string
	}
	main_themes?: any[]
	theme_ladders?: any[]
	core_candidates?: any[]
	watch_candidates?: any[]
	avoid_candidates?: any[]
	entry_signals?: any[]
	recommendations?: any[]
	strategy_report?: string
	strategy_explanation?: string
	generated_at?: string
	trading_date?: string
	llm_enhanced?: boolean
	total?: number
}

function getRiskColor(level?: string): string {
	switch (level) {
		case "低": return "green";
		case "中": return "orange";
		case "高": return "red";
		default: return "default";
	}
}

function getBoardColor(record: any): string {
	const displayBoardTag = String(record?.display_board_tag || "");
	const limitUpDays = Number(record?.limit_up_days || 0);
	if (displayBoardTag.includes("高位") || displayBoardTag.includes("退潮") || displayBoardTag.includes("空仓"))
		return "red";
	if (displayBoardTag.includes("转强") || displayBoardTag.includes("主线"))
		return "purple";
	if (limitUpDays >= 3)
		return "red";
	if (limitUpDays >= 1)
		return "orange";
	return "gold";
}

function renderBoardTag(record: any) {
	const limitUpDays = Number(record?.limit_up_days || 0);
	const relayScore = typeof record?.relay_score === "number"
		? record.relay_score
		: (record?.relay_score ? Number(record.relay_score) : null);
	const displayBoardTag = record?.display_board_tag;
	const boardColor = getBoardColor(record);
	const boardLabel = displayBoardTag || (limitUpDays > 0 ? `${limitUpDays} 连板` : "情绪观察");
	const scoreText = relayScore != null && Number.isFinite(relayScore)
		? relayScore.toFixed(1)
		: record?.theory_tag || "观察为主";
	return (
		<Space direction="vertical" size={0}>
			<Tag color={boardColor}>{boardLabel}</Tag>
			<Text>{scoreText}</Text>
		</Space>
	);
}

export default function EmotionRelayPage() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<EmotionRelayData | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchEmotionRelayRecommendations(15);
			if (response.status === "success" && response.data)
				setData(response.data as EmotionRelayData);
			else
				setError(response.message || "获取情绪接力数据失败");
		}
		catch (err: any) {
			console.error("Emotion relay fetch error:", err);
			setError(err?.message || "网络请求失败，请检查后端服务是否正常运行");
		}
		finally {
			setLoading(false);
		}
	}, []);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		message.loading({ content: "正在刷新情绪接力，需要1-2分钟（AI综合判断中）...", key: "refresh", duration: 0 });
		const timer = setInterval(() => {
			setRefreshSeconds(prev => prev + 1);
		}, 1000);
		try {
			const response = await refreshEmotionRelayRecommendations(15);
			if (response.status === "success" && response.data) {
				setData(response.data as EmotionRelayData);
				message.success({ content: `刷新完成，共 ${response.data?.recommendations?.length || 0} 只候选`, key: "refresh" });
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

	const coreCandidates = useMemo(() => data?.core_candidates || [], [data]);
	const watchCandidates = useMemo(() => data?.watch_candidates || [], [data]);
	const avoidCandidates = useMemo(() => data?.avoid_candidates || [], [data]);
	const hasCoreCandidates = coreCandidates.length > 0;
	const watchTitle = `观察池（${watchCandidates.length}）`;
	const avoidTitle = `回避池（${avoidCandidates.length}）`;

	const columns: ColumnsType<any> = [
		{ title: "股票", key: "stock", render: (_, record) => (
			<Space direction="vertical" size={0}>
				<Text strong>{record.name}</Text>
				<Text type="secondary">{record.code}</Text>
			</Space>
		) },
		{ title: "板块", dataIndex: "industry", key: "industry", render: (val: string) => (val ? <Tag color="cyan">{val}</Tag> : <Text type="secondary">未归类</Text>) },
		{ title: "连板/评分", key: "board", render: (_, record) => renderBoardTag(record) },
		{ title: "价格", key: "price", render: (_, record) => (
			<Space direction="vertical" size={0}>
				<Text>{record.price ? `¥${record.price.toFixed(2)}` : "-"}</Text>
				<Text type="secondary">{record.turnover_rate ? `${record.turnover_rate.toFixed(2)}%` : "-"}</Text>
			</Space>
		) },
		{ title: "逻辑", key: "logic", render: (_, record) => (
			<Space direction="vertical" size={0}>
				<Space wrap>
					{record.theory_tag ? <Tag color="blue">{record.theory_tag}</Tag> : null}
					{record.candidate_pool === "avoid" && record.display_board_tag ? <Tag color="red">{record.display_board_tag}</Tag> : null}
				</Space>
				<Text>{record.buy_reason || record.reasons?.[0] || "-"}</Text>
				{record.risk_warning ? <Text type="warning" style={{ fontSize: 12 }}>{record.risk_warning}</Text> : null}
			</Space>
		) },
	];

	if (loading && !data) {
		return <BasicContent><Skeleton active paragraph={{ rows: 10 }} /></BasicContent>;
	}
	if (error && !data) {
		return <BasicContent><Result status="error" title="获取情绪接力数据失败" subTitle={error} extra={<Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>重新加载</Button>} /></BasicContent>;
	}
	if (!data) {
		return <BasicContent><Empty description="暂无情绪接力数据" /></BasicContent>;
	}

	return (
		<Tabs
			defaultActiveKey="main"
			items={[
				{
					key: "main",
					label: "策略研判",
					children: (
						<BasicContent>
							<div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<Space>
									<HeartOutlined style={{ fontSize: 24, color: "#f5222d" }} />
									<Title level={4} style={{ margin: 0 }}>情绪接力</Title>
									{data.market_regime?.phase ? <Tag color={getRiskColor(data.market_regime?.risk_level)}>{data.market_regime.phase}</Tag> : null}
								</Space>
								<Space>
									{data.generated_at
										? (
											<Text type="secondary" style={{ fontSize: 12 }}>
												更新时间:
												{data.generated_at}
											</Text>
										)
										: null}
									<Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing} type="primary" ghost>
										{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新推荐"}
									</Button>
								</Space>
							</div>

							<Alert
								style={{ marginBottom: 16 }}
								message="理论依据：情绪周期 + 2板定龙头 + 龙空龙纪律"
								description={data.market_regime?.description || data.strategy_report || "冰点修复试错，升温做核心，高潮不追后排，退潮优先空仓。"}
								type="info"
								showIcon
							/>

							<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
								<Col xs={24} md={8}><Card><Statistic title="核心候选" value={coreCandidates.length} valueStyle={{ color: "#f5222d" }} /></Card></Col>
								<Col xs={24} md={8}><Card><Statistic title="观察候选" value={watchCandidates.length} valueStyle={{ color: "#1677ff" }} /></Card></Col>
								<Col xs={24} md={8}><Card><Statistic title="回避候选" value={avoidCandidates.length} valueStyle={{ color: "#8c8c8c" }} /></Card></Col>
							</Row>

							<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
								<Col xs={24} lg={12}>
									<Card title={(
										<Space>
											<FireOutlined />
											<span>主线梯队</span>
										</Space>
									)}
									>
										{(data.main_themes || []).length > 0
											? (
												<Space direction="vertical" style={{ width: "100%" }}>
													{(data.main_themes || []).map((theme: any) => (
														<Card
															key={theme.name}
															size="small"
															title={(
																<Space>
																	<Tag color={theme.role === "主线" ? "red" : theme.role === "次主线" ? "orange" : "default"}>{theme.role}</Tag>
																	<span>{theme.name}</span>
																</Space>
															)}
														>
															<Paragraph style={{ marginBottom: 8 }}>{theme.summary}</Paragraph>
															{(theme.ladder || []).map((item: any) => (
																<Tag key={`${theme.name}-${item.stock_code}`} color="purple">
																	{item.stock_name}
																	-
																	{item.ladder_role}
																</Tag>
															))}
														</Card>
													))}
												</Space>
											)
											: <Empty description="暂无梯队数据" />}
									</Card>
								</Col>
								<Col xs={24} lg={12}>
									<Card title={(
										<Space>
											<ThunderboltOutlined />
											<span>执行纪律</span>
										</Space>
									)}
									>
										<Paragraph>
											情绪阶段：
											{data.market_regime?.phase || "-"}
										</Paragraph>
										<Paragraph>
											风险等级：
											<Tag color={getRiskColor(data.market_regime?.risk_level)}>{data.market_regime?.risk_level || "-"}</Tag>
										</Paragraph>
										<Paragraph>
											行动偏好：
											{data.market_regime?.action_bias || "观察"}
										</Paragraph>
										<Paragraph>
											仓位建议：
											{data.market_regime?.position_advice || "20%-40%"}
										</Paragraph>
									</Card>
								</Col>
							</Row>

							<Card
								title={(
									<Space>
										<TrophyOutlined style={{ color: "#faad14" }} />
										<span>核心接力候选</span>
									</Space>
								)}
								style={{ marginBottom: 16 }}
							>
								{hasCoreCandidates
									? <Table dataSource={coreCandidates} rowKey="code" size="small" pagination={false} columns={columns} />
									: <Empty description={watchCandidates.length > 0 ? "当前未出现满足强核心标准的标的，建议先在观察池中等待转强确认。" : "当前暂无满足条件的核心接力候选，说明市场更偏观察或试错阶段。"} />}
							</Card>

							<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
								<Col xs={24} lg={12}>
									<Card title={watchTitle}>
										<Table dataSource={watchCandidates} rowKey="code" size="small" pagination={false} columns={columns.slice(0, 4)} />
									</Card>
								</Col>
								<Col xs={24} lg={12}>
									<Card title={avoidTitle}>
										<Table dataSource={avoidCandidates} rowKey={(record: any, idx?: number) => record.code || `avoid-${idx}`} size="small" pagination={false} columns={columns.slice(0, 4)} />
									</Card>
								</Col>
							</Row>

							<Card
								title={(
									<Space>
										<ExperimentOutlined />
										<span>策略报告</span>
									</Space>
								)}
								style={{ marginBottom: 16 }}
							>
								<Paragraph style={{ whiteSpace: "pre-wrap" }}>{data.strategy_report || data.strategy_explanation || "暂无策略报告"}</Paragraph>
							</Card>

							<RecommendationHistory strategyType="emotion_relay" />
						</BasicContent>
					),
				},
				{
					key: "follow_execution",
					label: "实盘跟投指导",
					children: <EmotionRelayFollowExecutionTab />,
				},
				{
					key: "follow",
					label: "推荐跟进",
					children: <StrategyFollowTab strategyType={"emotion_relay" as any} isOvernight={false} />,
				},
			]}
		/>
	);
}
