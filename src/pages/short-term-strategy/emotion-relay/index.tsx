import type { ColumnsType } from "antd/es/table";
import { fetchEmotionRelayRecommendations, refreshEmotionRelayRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import { CompanyBasicInfo } from "#src/components/CompanyBasicInfo";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";
import { EmotionRelayFollowExecutionTab } from "#src/pages/short-term-strategy/dragon-head-follow";
import {
	ExperimentOutlined,
	FireOutlined,
	HeartOutlined,
	ReloadOutlined,
	TrophyOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Collapse,
	Descriptions,
	Empty,
	List,
	message,
	Result,
	Row,
	Skeleton,
	Space,
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
			const response = await fetchEmotionRelayRecommendations(8);
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
			const response = await refreshEmotionRelayRecommendations(8);
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
	const entrySignals = useMemo(() => data?.entry_signals || [], [data]);
	const primaryCandidate = useMemo(
		() => coreCandidates[0] || watchCandidates[0],
		[coreCandidates, watchCandidates],
	);
	const primarySignal = useMemo(
		() => entrySignals.find((signal: any) => signal?.code === primaryCandidate?.code || signal?.stock_code === primaryCandidate?.code),
		[entrySignals, primaryCandidate?.code],
	);
	const backupCandidates = useMemo(
		() => [...coreCandidates, ...watchCandidates]
			.filter((candidate: any, index: number, all: any[]) => candidate?.code !== primaryCandidate?.code && all.findIndex(item => item?.code === candidate?.code) === index)
			.slice(0, 2),
		[coreCandidates, primaryCandidate?.code, watchCandidates],
	);
	const phase = data?.market_regime?.phase || "观察";
	const riskLevel = data?.market_regime?.risk_level || "中";
	const actionBias = data?.market_regime?.action_bias || (hasCoreCandidates ? "只做最强核心" : "等待转强");
	const mainTheme = data?.main_themes?.[0]?.name || primaryCandidate?.industry || "暂无明确主线";
	const primaryAction = primaryCandidate?.candidate_pool === "core" ? "条件买入" : "只观察";

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
				<CompanyBasicInfo
					summary={record.company_basic_info}
					mainBusiness={record.main_business}
					businessTrack={record.business_track}
					maxWidth={320}
				/>
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
					label: "今日重点",
					children: (
						<BasicContent>
							<div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<Space>
									<HeartOutlined style={{ fontSize: 24, color: "#f5222d" }} />
									<Title level={4} style={{ margin: 0 }}>情绪接力 · 今日重点</Title>
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
								message={(
									<Space wrap>
										<Text strong>
											今日结论：
											{actionBias}
										</Text>
										<Tag color={getRiskColor(riskLevel)}>
											风险
											{riskLevel}
										</Tag>
									</Space>
								)}
								description={`情绪处于${phase}，只聚焦主线“${mainTheme}”的最强核心；不满足转强条件就空仓。`}
								type={riskLevel === "高" ? "warning" : "info"}
								showIcon
							/>

							<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
								<Col xs={24} xl={16}>
									<Card
										title={(
											<Space wrap>
												<TrophyOutlined style={{ color: "#faad14" }} />
												<span>第一选择</span>
												<Tag color={primaryAction === "条件买入" ? "red" : "blue"}>{primaryAction}</Tag>
											</Space>
										)}
										style={{ height: "100%", borderTop: "3px solid #fa8c16" }}
									>
										{primaryCandidate
											? (
												<>
													<Space wrap style={{ marginBottom: 12 }}>
														<Title level={3} style={{ margin: 0 }}>{primaryCandidate.name}</Title>
														<Text type="secondary">{primaryCandidate.code}</Text>
														<Tag color="volcano">{primaryCandidate.industry || mainTheme}</Tag>
														{primaryCandidate.display_board_tag ? <Tag color={getBoardColor(primaryCandidate)}>{primaryCandidate.display_board_tag}</Tag> : null}
													</Space>
													<Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
														<Descriptions.Item label="买入条件">{primarySignal?.entry_plan?.buy_price_range || primarySignal?.entry_window || primaryCandidate.entry_timing || "等待弱转强确认"}</Descriptions.Item>
														<Descriptions.Item label="仓位">{primarySignal?.entry_plan?.position_advice || data.market_regime?.position_advice || "20%-40%"}</Descriptions.Item>
														<Descriptions.Item label="目标价">{primarySignal?.entry_plan?.target_price ? `¥${Number(primarySignal.entry_plan.target_price).toFixed(2)}` : primaryCandidate.target_price ? `¥${Number(primaryCandidate.target_price).toFixed(2)}` : "-"}</Descriptions.Item>
														<Descriptions.Item label="止损价">{primarySignal?.entry_plan?.stop_loss_price ? `¥${Number(primarySignal.entry_plan.stop_loss_price).toFixed(2)}` : primaryCandidate.stop_loss_price ? `¥${Number(primaryCandidate.stop_loss_price).toFixed(2)}` : "-"}</Descriptions.Item>
														<Descriptions.Item label="失效条件" span={2}>{primarySignal?.invalid_condition || primaryCandidate.risk_warning || "情绪退潮、主线瓦解或个股失去前排地位"}</Descriptions.Item>
													</Descriptions>
													<Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
														<Text strong>只看这一条理由：</Text>
														{primarySignal?.reason_short || primaryCandidate.buy_reason || primaryCandidate.reasons?.[0] || "等待最强核心确认"}
													</Paragraph>
												</>
											)
											: <Empty description="今天没有达到核心标准的标的，保持空仓" />}
									</Card>
								</Col>
								<Col xs={24} xl={8}>
									<Card title="备选（最多2只）" style={{ height: "100%" }}>
										<List
											dataSource={backupCandidates}
											locale={{ emptyText: "无备选，不为凑数降低标准" }}
											renderItem={(candidate: any) => (
												<List.Item>
													<Space direction="vertical" size={2} style={{ width: "100%" }}>
														<Space wrap>
															<Text strong>{candidate.name}</Text>
															<Text type="secondary">{candidate.code}</Text>
															<Tag color={candidate.candidate_pool === "core" ? "red" : "blue"}>{candidate.candidate_pool === "core" ? "条件买入" : "观察"}</Tag>
														</Space>
														<Text type="secondary">{candidate.buy_reason || candidate.reasons?.[0] || candidate.theory_tag || "等待转强"}</Text>
													</Space>
												</List.Item>
											)}
										/>
									</Card>
								</Col>
							</Row>

							<Collapse
								items={[{
									key: "details",
									label: (
										<Space>
											<ExperimentOutlined />
											<span>更多详情：主线梯队、完整候选池、策略报告与历史</span>
											<Tag>
												核心
												{coreCandidates.length}
											</Tag>
											<Tag>
												观察
												{watchCandidates.length}
											</Tag>
											<Tag>
												回避
												{avoidCandidates.length}
											</Tag>
										</Space>
									),
									children: (
										<Space direction="vertical" size={16} style={{ width: "100%" }}>
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
											<Card title="完整核心候选">
												{hasCoreCandidates ? <Table dataSource={coreCandidates} rowKey="code" size="small" pagination={false} columns={columns} /> : <Empty description="当前没有达到核心标准的标的" />}
											</Card>
											<Row gutter={[16, 16]}>
												<Col xs={24} lg={12}><Card title={watchTitle}><Table dataSource={watchCandidates} rowKey="code" size="small" pagination={false} columns={columns.slice(0, 4)} /></Card></Col>
												<Col xs={24} lg={12}><Card title={avoidTitle}><Table dataSource={avoidCandidates} rowKey={(record: any, idx?: number) => record.code || `avoid-${idx}`} size="small" pagination={false} columns={columns.slice(0, 4)} /></Card></Col>
											</Row>
											<Card title="完整策略报告">
												<Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{data.strategy_report || data.strategy_explanation || "暂无策略报告"}</Paragraph>
											</Card>
											<RecommendationHistory strategyType="emotion_relay" />
										</Space>
									),
								}]}
							/>
						</BasicContent>
					),
				},
				{
					key: "follow_execution",
					label: "执行清单",
					children: (
						<BasicContent>
							<div style={{ paddingBottom: 24 }}>
								<EmotionRelayFollowExecutionTab />
							</div>
						</BasicContent>
					),
				},
				{
					key: "follow",
					label: "结果跟踪",
					children: <StrategyFollowTab strategyType={"emotion_relay" as any} isOvernight={false} />,
				},
			]}
		/>
	);
}
