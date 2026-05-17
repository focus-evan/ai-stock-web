import type {
	DragonEntrySignal,
	DragonHeadData,
	DragonThemeLadderItem,
	DragonThemeV2,
	StockRecommendation,
} from "#src/api/strategy";
import type { ColumnsType } from "antd/es/table";
import { fetchDragonHeadRecommendations, refreshDragonHeadRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";
import {
	AlertOutlined,
	CrownOutlined,
	ExperimentOutlined,
	FireOutlined,
	ReloadOutlined,
	RiseOutlined,
	SafetyOutlined,
	StockOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Descriptions,
	Empty,
	List,
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

function asNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number" && Number.isFinite(value))
		return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed))
			return parsed;
	}
	return fallback;
}

function getRiskColor(level?: string): string {
	switch (level) {
		case "低": return "green";
		case "中": return "orange";
		case "高": return "red";
		default: return "default";
	}
}

function getPoolColor(pool?: string): string {
	switch (pool) {
		case "core": return "red";
		case "watch": return "blue";
		case "avoid": return "default";
		default: return "default";
	}
}

function getPoolLabel(pool?: string): string {
	switch (pool) {
		case "core": return "核心";
		case "watch": return "观察";
		case "avoid": return "回避";
		default: return "未分类";
	}
}

function getSignalAction(signal: DragonEntrySignal): { label: string, color: string } {
	const pool = signal?.candidate_pool;
	const risk = String(signal?.risk_level || "");
	const type = String(signal?.signal_type || "");

	if (pool === "core") {
		if (risk === "高")
			return { label: "谨慎买入", color: "orange" };
		return { label: "建议买入", color: "red" };
	}
	if (pool === "avoid")
		return { label: "回避", color: "default" };
	if (type.includes("观察") || type.includes("低吸"))
		return { label: "观望", color: "blue" };
	return { label: "观望", color: "blue" };
}

function isThemeV2(theme: DragonHeadData["main_themes"][number]): theme is DragonThemeV2 {
	return typeof (theme as DragonThemeV2).role === "string" && Array.isArray((theme as DragonThemeV2).ladder);
}

function signalPriority(signal: DragonEntrySignal): number {
	const poolScore = signal.candidate_pool === "core" ? 3 : signal.candidate_pool === "watch" ? 2 : 1;
	return poolScore * 1000 + Number(signal.signal_strength || 0);
}

function normalizeSignals(data: DragonHeadData): DragonEntrySignal[] {
	const signals = data.entry_signals || [];
	const deduped = new Map<string, DragonEntrySignal>();
	for (const signal of signals) {
		const key = signal.code || `${signal.name}-${signal.signal_type}-${signal.entry_window}`;
		const existing = deduped.get(key);
		if (!existing || signalPriority(signal) > signalPriority(existing))
			deduped.set(key, signal);
	}
	return Array.from(deduped.values()).sort((a, b) => signalPriority(b) - signalPriority(a));
}

function normalizeThemeLadders(data: DragonHeadData): DragonThemeV2[] {
	if (data.theme_ladders?.length)
		return data.theme_ladders;
	return (data.main_themes || []).filter(isThemeV2);
}

function normalizeCoreLeaders(data: DragonHeadData): StockRecommendation[] {
	if (data.core_leaders?.length)
		return data.core_leaders;
	return (data.recommendations || []).filter(item => item.candidate_pool === "core" || item.recommendation_level === "强烈推荐");
}

function normalizeWatchCandidates(data: DragonHeadData): StockRecommendation[] {
	if (data.watch_candidates?.length)
		return data.watch_candidates;
	return (data.recommendations || []).filter(item => item.candidate_pool === "watch" || item.recommendation_level === "推荐" || item.recommendation_level === "关注");
}

function normalizeAvoidCandidates(data: DragonHeadData): StockRecommendation[] {
	if (data.avoid_candidates?.length)
		return data.avoid_candidates;
	return (data.recommendations || []).filter(item => item.candidate_pool === "avoid" || item.recommendation_level === "回避");
}

function ThemeLadderCard({ theme }: { theme: DragonThemeV2 }) {
	return (
		<Card
			size="small"
			title={(
				<Space>
					<Tag color={theme.role === "main" ? "red" : theme.role === "secondary" ? "orange" : "default"}>{theme.role}</Tag>
					<span>{theme.name}</span>
				</Space>
			)}
		>
			<Space wrap style={{ marginBottom: 8 }}>
				<Tag>
					涨停
					{theme.limit_up_count}
				</Tag>
				<Tag>
					核心
					{theme.leader_count}
				</Tag>
				<Tag>
					最高
					{theme.max_limit_up_days}
					{" "}
					板
				</Tag>
			</Space>
			<Paragraph>{theme.summary}</Paragraph>
			<List
				size="small"
				dataSource={theme.ladder || []}
				renderItem={(item: DragonThemeLadderItem) => (
					<List.Item>
						<Space wrap>
							<Text strong>{item.stock_name}</Text>
							<Text type="secondary">{item.stock_code}</Text>
							<Tag color="purple">{item.ladder_role}</Tag>
							<Tag>
								{item.limit_up_days}
								{" "}
								板
							</Tag>
						</Space>
					</List.Item>
				)}
			/>
		</Card>
	);
}

function SignalList({ entrySignals }: { entrySignals: DragonEntrySignal[] }) {
	if (entrySignals.length === 0)
		return null;

	return (
		<List
			header={<Text strong>买点信号</Text>}
			style={{ marginTop: 16 }}
			dataSource={entrySignals}
			renderItem={(signal) => {
				const action = getSignalAction(signal);
				return (
					<List.Item>
						<Space direction="vertical" size={2} style={{ width: "100%" }}>
							<Space wrap>
								<Text strong>{signal.name}</Text>
								<Text type="secondary">{signal.code}</Text>
								<Tag color={action.color}>{action.label}</Tag>
								<Tag color={getPoolColor(signal.candidate_pool)}>{getPoolLabel(signal.candidate_pool)}</Tag>
								<Tag color="purple">{signal.signal_type}</Tag>
								<Tag color={getRiskColor(signal.risk_level)}>{signal.risk_level}</Tag>
								<Tag>
									{Math.round(signal.signal_strength || 0)}
									分
								</Tag>
							</Space>
							<Text>
								结论：
								<Text strong style={{ marginLeft: 4 }}>{action.label}</Text>
							</Text>
							<Text>
								买点窗口：
								{signal.entry_window}
							</Text>
							{signal.entry_plan?.position_advice
								? (
									<Text type="secondary">
										仓位建议：
										{signal.entry_plan.position_advice}
									</Text>
								)
								: null}
							{signal.entry_plan?.buy_price_range
								? (
									<Text type="secondary">
										参考买点：
										{String(signal.entry_plan.buy_price_range)}
									</Text>
								)
								: null}
							<Text type="secondary">
								失效条件：
								{signal.invalid_condition}
							</Text>
							<Text type="secondary">
								持仓周期：
								{signal.holding_horizon}
							</Text>
						</Space>
					</List.Item>
				);
			}}
		/>
	);
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
			if (response.status === "success" && response.data)
				setData(response.data);
			else
				setError(response.message || "获取推荐数据失败");
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
		message.loading({ content: "正在刷新龙头战法，需要1-3分钟...", key: "refresh", duration: 0 });
		const timer = setInterval(() => {
			setRefreshSeconds(prev => prev + 1);
		}, 1000);
		try {
			const response = await refreshDragonHeadRecommendations(13);
			if (response.status === "success" && response.data) {
				setData(response.data);
				message.success({ content: "刷新完成", key: "refresh" });
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

	const coreLeaders = useMemo(() => data ? normalizeCoreLeaders(data) : [], [data]);
	const watchCandidates = useMemo(() => data ? normalizeWatchCandidates(data) : [], [data]);
	const avoidCandidates = useMemo(() => data ? normalizeAvoidCandidates(data) : [], [data]);
	const themeLadders = useMemo(() => data ? normalizeThemeLadders(data) : [], [data]);
	const entrySignals = useMemo(() => data ? normalizeSignals(data) : [], [data]);

	const coreColumns: ColumnsType<StockRecommendation> = [
		{
			title: "股票",
			key: "stock",
			render: (_, record) => (
				<Space direction="vertical" size={0}>
					<Text strong>{record.name}</Text>
					<Text type="secondary">{record.code}</Text>
				</Space>
			),
		},
		{
			title: "题材/梯队",
			key: "theme",
			render: (_, record) => (
				<Space wrap>
					{record.theme_name ? <Tag color="volcano">{record.theme_name}</Tag> : null}
					{record.ladder_role ? <Tag color="purple">{record.ladder_role}</Tag> : null}
					<Tag color={getPoolColor(record.candidate_pool)}>{getPoolLabel(record.candidate_pool)}</Tag>
				</Space>
			),
		},
		{
			title: "连板/封板",
			key: "board",
			render: (_, record) => (
				<Space direction="vertical" size={0}>
					<Text>
						{record.limit_up_days || 0}
						{" "}
						连板
					</Text>
					<Text type="secondary">{record.first_limit_time || "-"}</Text>
				</Space>
			),
		},
		{
			title: "价格/换手",
			key: "price",
			render: (_, record) => {
				const price = asNumber(record.price, Number.NaN);
				const turnoverRate = asNumber(record.turnover_rate, Number.NaN);
				return (
					<Space direction="vertical" size={0}>
						<Text>{Number.isFinite(price) ? `¥${price.toFixed(2)}` : "-"}</Text>
						<Text type="secondary">
							换手
							{Number.isFinite(turnoverRate) ? `${turnoverRate.toFixed(2)}%` : "-"}
						</Text>
					</Space>
				);
			},
		},
		{
			title: "理由",
			dataIndex: "reasons",
			key: "reasons",
			render: (reasons: string[]) => (
				<Space direction="vertical" size={0}>
					{(reasons || []).slice(0, 3).map(reason => (
						<Text key={reason} style={{ fontSize: 12 }}>
							•
							{reason}
						</Text>
					))}
				</Space>
			),
		},
	];

	if (loading && !data) {
		return <BasicContent><div style={{ padding: 24 }}><Skeleton active paragraph={{ rows: 10 }} /></div></BasicContent>;
	}

	if (error && !data) {
		return <BasicContent><Result status="error" title="数据获取失败" subTitle={error} extra={<Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>重新加载</Button>} /></BasicContent>;
	}

	if (!data) {
		return <BasicContent><Empty description="暂无龙头战法推荐数据" style={{ marginTop: 80 }} /></BasicContent>;
	}

	return (
		<Tabs
			defaultActiveKey="main"
			items={[
				{
					key: "main",
					label: "龙头战法V2",
					children: (
						<BasicContent>
							<div style={{ paddingBottom: 24 }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
									<Space align="center">
										<CrownOutlined style={{ fontSize: 24, color: "#f5222d" }} />
										<Title level={4} style={{ margin: 0 }}>龙头战法 V2</Title>
										<Tag color="processing">{data.trading_date}</Tag>
										<Tag color={data.schema_version === "v2" ? "purple" : "default"}>{data.schema_version || "legacy"}</Tag>
										{data.llm_enhanced ? <Tag color="purple" icon={<ExperimentOutlined />}>AI增强</Tag> : null}
									</Space>
									<Button type="primary" icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} loading={refreshing}>{refreshing ? `刷新中 ${refreshSeconds}s` : "刷新推荐"}</Button>
								</div>

								{data.data_quality?.degraded && <Alert style={{ marginBottom: 16 }} type="warning" showIcon icon={<WarningOutlined />} message="当前结果使用了降级数据，请勿将其视为完全实时的龙头接力信号" description={`数据来源: ${data.data_quality?.source || "unknown"}，fallback: ${data.data_quality?.fallback_level || "none"}`} />}

								<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
									<Col xs={24} lg={8}>
										<Card title={(
											<Space>
												<SafetyOutlined />
												<span>市场阶段</span>
											</Space>
										)}
										>
											<Descriptions column={1} size="small">
												<Descriptions.Item label="阶段">{data.market_regime?.phase || data.market_sentiment?.phase || "-"}</Descriptions.Item>
												<Descriptions.Item label="风险"><Tag color={getRiskColor(data.market_regime?.risk_level || data.market_sentiment?.risk_level)}>{data.market_regime?.risk_level || data.market_sentiment?.risk_level || "-"}</Tag></Descriptions.Item>
												<Descriptions.Item label="动作偏好">{data.market_regime?.action_bias || "观察"}</Descriptions.Item>
												<Descriptions.Item label="最高连板">
													{data.market_regime?.max_limit_up_days || 0}
													{" "}
													板
												</Descriptions.Item>
											</Descriptions>
											{data.market_regime?.description ? <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>{data.market_regime.description}</Paragraph> : null}
										</Card>
									</Col>
									<Col xs={24} lg={8}>
										<Card title={(
											<Space>
												<FireOutlined />
												<span>核心统计</span>
											</Space>
										)}
										>
											<Row gutter={12}>
												<Col span={8}><Statistic title="核心" value={coreLeaders.length} valueStyle={{ color: "#f5222d", fontSize: 20 }} /></Col>
												<Col span={8}><Statistic title="观察" value={watchCandidates.length} valueStyle={{ color: "#1890ff", fontSize: 20 }} /></Col>
												<Col span={8}><Statistic title="回避" value={avoidCandidates.length} valueStyle={{ color: "#8c8c8c", fontSize: 20 }} /></Col>
											</Row>
										</Card>
									</Col>
									<Col xs={24} lg={8}>
										<Card title={(
											<Space>
												<ExperimentOutlined />
												<span>AI摘要</span>
											</Space>
										)}
										>
											<Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>{data.ai_summary?.market_summary || data.ai_summary?.strategy_report || data.strategy_explanation || "暂无 AI 摘要"}</Paragraph>
											<Text type="secondary">{data.generated_at}</Text>
										</Card>
									</Col>
								</Row>

								<Card
									title={(
										<Space>
											<RiseOutlined />
											<span>主线题材与梯队</span>
										</Space>
									)}
									style={{ marginBottom: 16 }}
								>
									{themeLadders.length === 0 ? <Empty description="暂无题材梯队数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : <Row gutter={[16, 16]}>{themeLadders.map(theme => <Col xs={24} xl={12} key={theme.name}><ThemeLadderCard theme={theme} /></Col>)}</Row>}
								</Card>

								<Card
									title={(
										<Space>
											<CrownOutlined />
											<span>核心龙头与结构化买点</span>
										</Space>
									)}
									style={{ marginBottom: 16 }}
								>
									<Table<StockRecommendation> columns={coreColumns} dataSource={coreLeaders} rowKey="code" pagination={false} size="middle" />
									<SignalList entrySignals={entrySignals} />
								</Card>

								<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
									<Col xs={24} lg={12}>
										<Card title={(
											<Space>
												<StockOutlined />
												<span>观察池</span>
											</Space>
										)}
										>
											<List
												dataSource={watchCandidates}
												locale={{ emptyText: "暂无观察池" }}
												renderItem={item => (
													<List.Item>
														<Space wrap>
															<Text strong>{item.name}</Text>
															<Text type="secondary">{item.code}</Text>
															<Tag color="blue">{item.theme_name || "无题材"}</Tag>
															<Tag>
																{item.limit_up_days}
																{" "}
																板
															</Tag>
														</Space>
													</List.Item>
												)}
											/>
										</Card>
									</Col>
									<Col xs={24} lg={12}>
										<Card title={(
											<Space>
												<AlertOutlined />
												<span>回避池</span>
											</Space>
										)}
										>
											<List
												dataSource={avoidCandidates}
												locale={{ emptyText: "暂无回避池" }}
												renderItem={item => (
													<List.Item>
														<Space direction="vertical" size={0}>
															<Space wrap>
																<Text strong>{item.name}</Text>
																<Text type="secondary">{item.code}</Text>
																<Tag color="default">{item.theme_name || "无题材"}</Tag>
															</Space>
															<Text type="warning">{item.risk_warning || item.operation_suggestion || "高位/后排/非核心，建议回避"}</Text>
														</Space>
													</List.Item>
												)}
											/>
										</Card>
									</Col>
								</Row>

								<Card title={(
									<Space>
										<ExperimentOutlined />
										<span>AI解读 / 历史回看</span>
									</Space>
								)}
								>
									<Paragraph style={{ whiteSpace: "pre-wrap" }}>{data.ai_summary?.strategy_report || data.strategy_explanation || "暂无 AI 解读"}</Paragraph>
								</Card>
								<RecommendationHistory strategyType="dragon_head" />
							</div>
						</BasicContent>
					),
				},
				{ key: "follow", label: "推荐跟进", children: <StrategyFollowTab strategyType="dragon_head" isOvernight={false} /> },
			]}
		/>
	);
}
