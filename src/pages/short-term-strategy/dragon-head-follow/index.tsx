import type { DragonEntrySignal, DragonHeadFollowItem, DragonHeadFollowStock, DragonThemeV2, RelayStock } from "#src/api/strategy";

import {
	fetchDragonHeadFollow,
	fetchEmotionRelayFollow,
	triggerDragonHeadFollow,
	triggerEmotionRelayFollow,
} from "#src/api/strategy";
import RecommendationHistory from "#src/components/RecommendationHistory";
import {
	AlertOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CrownOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	MinusCircleOutlined,
	PlusCircleOutlined,
	ReloadOutlined,
	SafetyOutlined,
	TeamOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Collapse,
	Descriptions,
	Empty,
	List,
	message,
	Progress,
	Result,
	Row,
	Skeleton,
	Space,
	Statistic,
	Steps,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text } = Typography;

/** 操作动作颜色 */
function getActionColor(action: string): string {
	switch (action) {
		case "买入": case "加仓": return "#f5222d";
		case "卖出": case "减仓": case "清仓": return "#52c41a";
		case "持有": case "继续持有": return "#1890ff";
		case "观望": case "回避": case "跳过": return "#8c8c8c";
		default: return "#faad14";
	}
}

/** 操作动作图标 */
function getActionIcon(action: string) {
	switch (action) {
		case "买入": case "加仓": return <PlusCircleOutlined />;
		case "卖出": case "减仓": case "清仓": return <MinusCircleOutlined />;
		case "持有": case "继续持有": return <CheckCircleOutlined />;
		case "观望": case "回避": case "跳过": return <EyeOutlined />;
		default: return <ExclamationCircleOutlined />;
	}
}

/** 置信度颜色 */
function getConfidenceColor(score: number): string {
	if (score >= 80)
		return "#52c41a";
	if (score >= 60)
		return "#faad14";
	if (score >= 40)
		return "#fa8c16";
	return "#f5222d";
}

function getRiskColor(level?: string): string {
	switch (level) {
		case "低": return "green";
		case "中": return "orange";
		case "高": return "red";
		default: return "default";
	}
}

function getPoolTagColor(pool?: string): string {
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

type DisplayStock = DragonHeadFollowStock & Partial<RelayStock> & {
	name: string
	code: string
	stop_loss?: number
	current_price?: number
	action: string
	reason?: string
	action_detail?: string
	invalid_condition?: string
	related_themes?: string[]
	holding_period?: string
	position_advice?: string
	candidate_pool?: string
	signal_type?: string
	target_price?: number
	position_pct?: number
	confidence?: number
	risk_warning?: string
	change_pct?: number
};

/** 标准化股票字段名（兼容 dragon_head 和 relay 两种数据格式） */
function normalizeStock(stock: DragonHeadFollowStock | RelayStock): DisplayStock {
	const rawPosition = (stock as any).position_pct;
	const normalizedPosition = typeof rawPosition === "string"
		? Number(String(rawPosition).replace("%", "")) || undefined
		: rawPosition;
	return {
		...(stock as any),
		name: stock.name || (stock as DragonHeadFollowStock).stock_name || "",
		code: stock.code || (stock as DragonHeadFollowStock).stock_code || "",
		stop_loss: (stock as DragonHeadFollowStock).stop_loss ?? stock.stop_loss_price ?? undefined,
		current_price: (stock as DragonHeadFollowStock).current_price ?? (stock as any).price,
		action: (stock as DragonHeadFollowStock).action || "观望",
		reason: (stock as DragonHeadFollowStock).reason || (stock as RelayStock).buy_reason || (stock as any).reasons?.[0],
		action_detail: (stock as DragonHeadFollowStock).action_detail,
		invalid_condition: (stock as DragonHeadFollowStock).invalid_condition,
		related_themes: (stock as DragonHeadFollowStock).related_themes,
		holding_period: (stock as DragonHeadFollowStock).holding_period,
		position_advice: (stock as DragonHeadFollowStock).position_advice,
		candidate_pool: (stock as DragonHeadFollowStock).candidate_pool,
		signal_type: (stock as DragonHeadFollowStock).signal_type,
		target_price: (stock as DragonHeadFollowStock).target_price ?? stock.target_price,
		position_pct: normalizedPosition,
		confidence: (stock as DragonHeadFollowStock).confidence ?? (stock as RelayStock).confidence,
		risk_warning: (stock as DragonHeadFollowStock).risk_warning ?? (stock as RelayStock).risk_warning,
		change_pct: (stock as DragonHeadFollowStock).change_pct ?? stock.change_pct,
	};
}

function RelayThemeCard({ theme }: { theme: DragonThemeV2 }) {
	return (
		<Card
			size="small"
			title={(
				<Space>
					<Tag color={theme.role === "主线" || theme.role === "main" ? "red" : theme.role === "次主线" || theme.role === "secondary" ? "orange" : "default"}>{theme.role}</Tag>
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
					板
				</Tag>
			</Space>
			<div style={{ marginBottom: 8, color: "#595959", lineHeight: 1.7 }}>{theme.summary}</div>
			{theme.ladder.length > 0
				? (
					<Space wrap>
						{theme.ladder.map(item => (
							<Tag key={`${theme.name}-${item.stock_code}-${item.ladder_role}`} color="purple">
								{item.stock_name}
								-
								{item.ladder_role}
							</Tag>
						))}
					</Space>
				)
				: <Text type="secondary">暂无梯队数据</Text>}
		</Card>
	);
}

function RelayCandidateList({ title, items, color }: { title: string, items: Array<DragonHeadFollowStock | RelayStock>, color: string }) {
	return (
		<Card size="small" title={title} styles={{ header: { borderLeft: `4px solid ${color}` } }}>
			{items.length > 0
				? (
					<List
						size="small"
						dataSource={items}
						renderItem={(raw: DragonHeadFollowStock | RelayStock, index) => {
							const item = normalizeStock(raw);
							return (
								<List.Item key={`${item.code || index}-${title}`}>
									<Space direction="vertical" size={2} style={{ width: "100%" }}>
										<Space wrap>
											<Text strong>{item.name || item.stock_name}</Text>
											<Text type="secondary">{item.code || item.stock_code}</Text>
											<Tag color={getPoolTagColor(item.candidate_pool)}>{getPoolLabel(item.candidate_pool)}</Tag>
											{item.signal_type ? <Tag color="purple">{item.signal_type}</Tag> : null}
											{(item as any).recommendation_level ? <Tag color="gold">{(item as any).recommendation_level}</Tag> : null}
										</Space>
										<Text style={{ fontSize: 12, color: "#595959" }}>{item.action_detail || item.reason || "暂无说明"}</Text>
										{item.invalid_condition
											? (
												<Text type="secondary" style={{ fontSize: 11 }}>
													失效：
													{item.invalid_condition}
												</Text>
											)
											: null}
									</Space>
								</List.Item>
							);
						}}
					/>
				)
				: <Empty description={`暂无${title}`} image={Empty.PRESENTED_IMAGE_SIMPLE} />}
		</Card>
	);
}

function DragonHeadExtraSections({ latest }: { latest: DragonHeadFollowItem }) {
	const dragonRiskLevel = latest.recommendations.find(stock => stock.risk_level)?.risk_level;
	const themeTags = Array.from(new Set(latest.recommendations.flatMap(stock => stock.related_themes || []).filter(Boolean))).slice(0, 8);
	const industries = Array.from(new Set(latest.recommendations.map(stock => stock.industry).filter(Boolean))).slice(0, 6);
	const actionableStocks = latest.recommendations.filter(stock => ["买入", "加仓", "待验证"].includes(stock.action)).slice(0, 5);

	if (!dragonRiskLevel && themeTags.length === 0 && industries.length === 0 && actionableStocks.length === 0)
		return null;

	return (
		<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
			<Col xs={24} lg={12}>
				<Card
					size="small"
					title={(
						<Space>
							<SafetyOutlined style={{ color: "#722ed1" }} />
							<span>市场背景</span>
						</Space>
					)}
				>
					<Descriptions column={1} size="small">
						<Descriptions.Item label="风险等级">
							<Tag color={getRiskColor(dragonRiskLevel)}>{dragonRiskLevel || "待确认"}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label="动作偏好">主做龙头确认，分歧看承接</Descriptions.Item>
						<Descriptions.Item label="题材聚焦">{industries.length > 0 ? industries.join(" / ") : "待确认"}</Descriptions.Item>
					</Descriptions>
					{themeTags.length > 0 && (
						<Space wrap style={{ marginTop: 12 }}>
							{themeTags.map(theme => <Tag key={theme} color="volcano">{theme}</Tag>)}
						</Space>
					)}
				</Card>
			</Col>
			<Col xs={24} lg={12}>
				<Card
					size="small"
					title={(
						<Space>
							<CheckCircleOutlined style={{ color: "#52c41a" }} />
							<span>关注焦点</span>
						</Space>
					)}
				>
					{actionableStocks.length > 0
						? (
							<List
								size="small"
								dataSource={actionableStocks}
								renderItem={(raw: DragonHeadFollowStock) => {
									const stock = normalizeStock(raw);
									return (
										<List.Item key={`${stock.code}-${stock.action}`}>
											<Space direction="vertical" size={2} style={{ width: "100%" }}>
												<Space wrap>
													<Text strong>{stock.name}</Text>
													<Text type="secondary">{stock.code}</Text>
													<Tag color={getActionColor(stock.action)}>{stock.action}</Tag>
													{stock.related_themes && stock.related_themes.length > 0
														? stock.related_themes.slice(0, 3).map(theme => (
															<Tag key={`${stock.code}-${theme}`} color="volcano">{theme}</Tag>
														))
														: null}
												</Space>
												<Text style={{ fontSize: 12, color: "#595959" }}>{stock.action_detail || stock.reason || "等待竞价确认"}</Text>
												{stock.holding_period
													? (
														<Text type="secondary" style={{ fontSize: 11 }}>
															周期：
															{stock.holding_period}
														</Text>
													)
													: null}
												{stock.position_advice
													? (
														<Text type="secondary" style={{ fontSize: 11 }}>
															仓位：
															{stock.position_advice}
														</Text>
													)
													: null}
												{stock.invalid_condition
													? (
														<Text type="secondary" style={{ fontSize: 11 }}>
															失效：
															{stock.invalid_condition}
														</Text>
													)
													: null}
											</Space>
										</List.Item>
									);
								}}
							/>
						)
						: <Empty description="暂无重点关注个股" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
				</Card>
			</Col>
		</Row>
	);
}

function RelayExtraSections({ latest }: { latest: DragonHeadFollowItem }) {
	const relayContext = latest.relay_context;
	const marketRegime = relayContext?.market_regime;
	const themeLadders = relayContext?.main_themes || [];
	const coreCandidates = relayContext?.core_candidates || [];
	const watchCandidates = relayContext?.watch_candidates || [];
	const avoidCandidates = relayContext?.avoid_candidates || [];
	const entrySignals = Array.from(new Map((relayContext?.entry_signals || []).map(signal => [`${signal.code}-${signal.signal_type}`, signal])).values());

	if (!relayContext)
		return null;

	return (
		<>
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} lg={12}>
					<Card
						size="small"
						title={(
							<Space>
								<SafetyOutlined style={{ color: "#722ed1" }} />
								<span>执行纪律</span>
							</Space>
						)}
					>
						<Descriptions column={1} size="small">
							<Descriptions.Item label="情绪阶段">{marketRegime?.phase || "-"}</Descriptions.Item>
							<Descriptions.Item label="风险等级"><Tag color={getRiskColor(marketRegime?.risk_level)}>{marketRegime?.risk_level || "-"}</Tag></Descriptions.Item>
							<Descriptions.Item label="动作偏好">{marketRegime?.action_bias || "观察"}</Descriptions.Item>
							<Descriptions.Item label="仓位建议">{marketRegime?.position_advice || "20%-40%"}</Descriptions.Item>
						</Descriptions>
						{marketRegime?.description ? <div style={{ marginTop: 12, color: "#595959", lineHeight: 1.7 }}>{marketRegime.description}</div> : null}
					</Card>
				</Col>
				<Col xs={24} lg={12}>
					<Card
						size="small"
						title={(
							<Space>
								<CrownOutlined style={{ color: "#fa8c16" }} />
								<span>候选分层</span>
							</Space>
						)}
					>
						<Row gutter={12}>
							<Col span={8}><Statistic title="核心" value={coreCandidates.length} valueStyle={{ color: "#f5222d", fontSize: 20 }} /></Col>
							<Col span={8}><Statistic title="观察" value={watchCandidates.length} valueStyle={{ color: "#1677ff", fontSize: 20 }} /></Col>
							<Col span={8}><Statistic title="回避" value={avoidCandidates.length} valueStyle={{ color: "#8c8c8c", fontSize: 20 }} /></Col>
						</Row>
					</Card>
				</Col>
			</Row>

			{themeLadders.length > 0 && (
				<Card
					size="small"
					title={(
						<Space>
							<TeamOutlined style={{ color: "#1677ff" }} />
							<span>主线梯队</span>
						</Space>
					)}
					style={{ marginBottom: 16 }}
				>
					<Row gutter={[16, 16]}>
						{themeLadders.map(theme => (
							<Col xs={24} xl={12} key={theme.name}>
								<RelayThemeCard theme={theme} />
							</Col>
						))}
					</Row>
				</Card>
			)}

			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} xl={8}><RelayCandidateList title="核心池" items={coreCandidates} color="#f5222d" /></Col>
				<Col xs={24} xl={8}><RelayCandidateList title="观察池" items={watchCandidates} color="#1677ff" /></Col>
				<Col xs={24} xl={8}><RelayCandidateList title="回避池" items={avoidCandidates} color="#8c8c8c" /></Col>
			</Row>

			{entrySignals.length > 0 && (
				<Card
					size="small"
					title={(
						<Space>
							<CheckCircleOutlined style={{ color: "#52c41a" }} />
							<span>入场信号</span>
						</Space>
					)}
					style={{ marginBottom: 16 }}
				>
					<List
						size="small"
						dataSource={entrySignals}
						renderItem={(signal: DragonEntrySignal) => (
							<List.Item key={`${signal.code}-${signal.signal_type}`}>
								<Space direction="vertical" size={2} style={{ width: "100%" }}>
									<Space wrap>
										<Text strong>{signal.name}</Text>
										<Text type="secondary">{signal.code}</Text>
										<Tag color={getPoolTagColor(signal.candidate_pool)}>{getPoolLabel(signal.candidate_pool)}</Tag>
										<Tag color="purple">{signal.signal_type}</Tag>
										<Tag color={getRiskColor(signal.risk_level)}>{signal.risk_level}</Tag>
									</Space>
									<Text>
										入场窗口：
										{signal.entry_window}
									</Text>
									<Text type="secondary">
										持仓周期：
										{signal.holding_horizon}
									</Text>
									<Text type="secondary">
										失效条件：
										{signal.invalid_condition}
									</Text>
								</Space>
							</List.Item>
						)}
					/>
				</Card>
			)}
		</>
	);
}

/** ================== 通用跟投面板组件 ================== */
export function FollowPanel({
	strategyLabel,
	strategyIcon,
	fetchFn,
	triggerFn,
	pipelineSteps,
	renderExtraSections,
	renderBottomContent,
}: {
	strategyLabel: string
	strategyIcon: React.ReactNode
	fetchFn: (limit: number) => Promise<{ status: string, data: { latest: DragonHeadFollowItem | null, history: DragonHeadFollowItem[], total: number } }>
	triggerFn: () => Promise<{ status: string, message: string }>
	pipelineSteps: { title: string, description: string, status: "finish" | "process" | "wait" }[]
	renderExtraSections?: (latest: DragonHeadFollowItem) => React.ReactNode
	renderBottomContent?: React.ReactNode
}) {
	const [loading, setLoading] = useState(false);
	const [triggering, setTriggering] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [latest, setLatest] = useState<DragonHeadFollowItem | null>(null);
	const [history, setHistory] = useState<DragonHeadFollowItem[]>([]);

	const panelTitle = strategyLabel === "情绪接力" ? "推荐池" : "跟投指导";
	const actionNoun = strategyLabel === "情绪接力" ? "推荐池" : "跟投指导";
	const extraSections = useMemo(() => latest && renderExtraSections ? renderExtraSections(latest) : null, [latest, renderExtraSections]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchFn(10);
			if (response.status === "success" && response.data) {
				setLatest(response.data.latest);
				setHistory(response.data.history);
			}
			else {
				setError(`获取${strategyLabel}推荐数据失败`);
			}
		}
		catch (err: any) {
			setError(err?.message || "网络请求失败");
		}
		finally {
			setLoading(false);
		}
	}, [fetchFn, strategyLabel]);

	const handleTrigger = useCallback(async () => {
		setTriggering(true);
		message.loading({ content: `正在刷新${strategyLabel}${actionNoun}...`, key: "trigger", duration: 0 });
		try {
			const response = await triggerFn();
			if (response.status === "success") {
				message.success({ content: response.message || `${strategyLabel}${actionNoun}已刷新`, key: "trigger" });
				await fetchData();
			}
			else {
				message.error({ content: `${actionNoun}刷新失败`, key: "trigger" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || `${actionNoun}刷新失败，请稍后重试`, key: "trigger" });
		}
		finally {
			setTriggering(false);
		}
	}, [actionNoun, fetchData, triggerFn, strategyLabel]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	if (loading && !latest) {
		return (
			<div style={{ padding: 24 }}>
				<Skeleton active paragraph={{ rows: 3 }} />
				<div style={{ marginTop: 24 }}>
					<Skeleton active paragraph={{ rows: 8 }} />
				</div>
			</div>
		);
	}

	if (error && !latest) {
		return (
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
		);
	}

	if (!latest) {
		return (
			<Empty
				description={`暂无${strategyLabel}${actionNoun}数据，点击下方按钮刷新`}
				style={{ marginTop: 60 }}
			>
				<Space>
					<Button onClick={fetchData} icon={<ReloadOutlined />}>刷新</Button>
					<Button type="primary" onClick={handleTrigger} loading={triggering} icon={<ThunderboltOutlined />}>
						刷新
						{actionNoun}
					</Button>
				</Space>
			</Empty>
		);
	}

	const buyStocks = latest.recommendations?.filter(s => ["买入", "加仓"].includes(s.action)) || [];
	const holdStocks = latest.recommendations?.filter(s => ["持有", "继续持有"].includes(s.action)) || [];
	const sellStocks = latest.recommendations?.filter(s => ["卖出", "减仓", "清仓"].includes(s.action)) || [];
	const watchStocks = latest.recommendations?.filter(s => ["观望", "回避", "跳过", "待定"].includes(s.action)) || [];

	return (
		<div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space align="center">
					{strategyIcon}
					<Title level={5} style={{ margin: 0 }}>
						{strategyLabel}
						{" "}
						{panelTitle}
					</Title>
					<Tag color="processing">{latest.trading_date}</Tag>
					<Text type="secondary" style={{ fontSize: 12 }}>
						生成于
						{" "}
						{latest.generated_at}
					</Text>
				</Space>
				<Space>
					<Button size="small" icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>刷新</Button>
					<Button size="small" type="primary" icon={<ThunderboltOutlined />} onClick={handleTrigger} loading={triggering}>
						{triggering ? `刷新${actionNoun}中...` : `刷新${actionNoun}`}
					</Button>
				</Space>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} md={6}>
					<Card size="small" styles={{ body: { textAlign: "center", padding: "16px" } }}>
						<Progress
							type="circle"
							percent={latest.confidence_score}
							size={72}
							strokeColor={getConfidenceColor(latest.confidence_score)}
							format={pct => <span style={{ fontSize: 16, fontWeight: 700 }}>{pct}</span>}
						/>
						<div style={{ marginTop: 6 }}>
							<Text strong style={{ fontSize: 12 }}>整体置信度</Text>
						</div>
					</Card>
				</Col>
				<Col xs={24} md={18}>
					<Card
						size="small"
						title={(
							<Space>
								<CrownOutlined style={{ color: "#faad14" }} />
								<span>{strategyLabel === "情绪接力" ? "推荐概览" : "操作概览"}</span>
							</Space>
						)}
					>
						<Row gutter={16}>
							<Col span={6}>
								<Statistic title="买入信号" value={buyStocks.length} valueStyle={{ color: "#f5222d", fontWeight: 700 }} suffix="只" />
							</Col>
							<Col span={6}>
								<Statistic title="持有" value={holdStocks.length} valueStyle={{ color: "#1890ff", fontWeight: 700 }} suffix="只" />
							</Col>
							<Col span={6}>
								<Statistic title="卖出信号" value={sellStocks.length} valueStyle={{ color: "#52c41a", fontWeight: 700 }} suffix="只" />
							</Col>
							<Col span={6}>
								<Statistic title="观望/跳过" value={watchStocks.length} valueStyle={{ color: "#8c8c8c", fontWeight: 700 }} suffix="只" />
							</Col>
						</Row>
					</Card>
				</Col>
			</Row>

			{latest.market_overview && (
				<Alert style={{ marginBottom: 16 }} type="info" showIcon icon={<AlertOutlined />} message={<Text strong>市场概览</Text>} description={latest.market_overview} />
			)}

			{latest.strategy_summary && (
				<Card
					size="small"
					title={(
						<Space>
							<SafetyOutlined style={{ color: "#722ed1" }} />
							<span>策略研判</span>
						</Space>
					)}
					style={{ marginBottom: 16 }}
				>
					<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{latest.strategy_summary}</div>
				</Card>
			)}

			{extraSections}

			{latest.risk_warning && (
				<Alert style={{ marginBottom: 16 }} type="warning" showIcon message={<Text strong>风险提示</Text>} description={latest.risk_warning} />
			)}

			{latest.recommendations && latest.recommendations.length > 0 && (
				<Card
					title={(
						<Space>
							<ThunderboltOutlined style={{ color: "#fa541c" }} />
							<span>个股操作指令</span>
							<Tag>
								{latest.stock_count}
								{" "}
								只
							</Tag>
						</Space>
					)}
					style={{ marginBottom: 16 }}
				>
					<Row gutter={[16, 16]}>
						{latest.recommendations.map((raw: DragonHeadFollowStock, idx: number) => {
							const stock = normalizeStock(raw);
							return (
								<Col xs={24} sm={12} lg={8} xl={6} key={stock.code || idx}>
									<Card
										size="small"
										hoverable
										style={{ borderLeft: `4px solid ${getActionColor(stock.action)}`, height: "100%" }}
										styles={{ body: { padding: "12px 16px" } }}
									>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
											<Space>
												<Text strong style={{ fontSize: 15 }}>{stock.name}</Text>
												<Text type="secondary" style={{ fontSize: 12 }}>{stock.code}</Text>
											</Space>
											<Tag color={getActionColor(stock.action)} icon={getActionIcon(stock.action)} style={{ fontWeight: 700, fontSize: 13 }}>
												{stock.action}
											</Tag>
										</div>

										{stock.current_price != null && (
											<div style={{ marginBottom: 6 }}>
												<Text style={{ color: "#f5222d", fontWeight: 600, fontSize: 16 }}>
													¥
													{stock.current_price.toFixed(2)}
												</Text>
												{stock.change_pct != null && (
													<Text style={{ marginLeft: 8, color: stock.change_pct >= 0 ? "#f5222d" : "#52c41a", fontWeight: 600 }}>
														{stock.change_pct >= 0 ? "+" : ""}
														{stock.change_pct.toFixed(2)}
														%
													</Text>
												)}
											</div>
										)}

										<Row gutter={8} style={{ marginBottom: 6 }}>
											{stock.target_price != null && stock.target_price > 0 && (
												<Col span={12}>
													<Text type="secondary" style={{ fontSize: 11 }}>目标价</Text>
													<div>
														<Text style={{ color: "#f5222d", fontWeight: 600 }}>
															¥
															{stock.target_price.toFixed(2)}
														</Text>
													</div>
												</Col>
											)}
											{stock.stop_loss != null && stock.stop_loss > 0 && (
												<Col span={12}>
													<Text type="secondary" style={{ fontSize: 11 }}>止损价</Text>
													<div>
														<Text style={{ color: "#52c41a", fontWeight: 600 }}>
															¥
															{stock.stop_loss.toFixed(2)}
														</Text>
													</div>
												</Col>
											)}
										</Row>

										{stock.position_pct != null && (
											<div style={{ marginBottom: 6 }}>
												<Text type="secondary" style={{ fontSize: 11 }}>建议仓位</Text>
												<Progress percent={stock.position_pct} size="small" strokeColor={getActionColor(stock.action)} format={pct => `${pct}%`} />
											</div>
										)}

										{stock.confidence != null && (
											<div style={{ marginBottom: 6 }}>
												<Space>
													<Text type="secondary" style={{ fontSize: 11 }}>置信度</Text>
													<Tag color={getConfidenceColor(stock.confidence)} style={{ fontSize: 11 }}>
														{stock.confidence}
														%
													</Tag>
												</Space>
											</div>
										)}

										{stock.reason && (
											<div style={{ marginBottom: 4 }}>
												<Text style={{ fontSize: 12, color: "#595959" }}>
													💡
													{" "}
													{stock.reason}
												</Text>
											</div>
										)}

										{(stock as any).action_detail && (
											<div style={{ marginBottom: 4 }}>
												<Text style={{ fontSize: 12, color: "#595959" }}>{(stock as any).action_detail}</Text>
											</div>
										)}

										{stock.risk_warning && (
											<Text type="warning" style={{ fontSize: 11 }}>
												⚠️
												{" "}
												{stock.risk_warning}
											</Text>
										)}
									</Card>
								</Col>
							);
						})}
					</Row>
				</Card>
			)}

			{history.length > 1 && (
				<Card
					title={(
						<Space>
							<ClockCircleOutlined style={{ color: "#1890ff" }} />
							<span>历史跟投指导</span>
							<Tag color="blue">
								{history.length}
								条
							</Tag>
						</Space>
					)}
				>
					<Collapse
						accordion
						ghost
						items={history.slice(1).map(item => ({
							key: item.id,
							label: (
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<Text strong>{item.trading_date}</Text>
									<Tag color={item.session_type === "morning" ? "blue" : item.session_type === "afternoon" ? "orange" : "default"}>
										{item.session_type === "morning" ? "上午" : item.session_type === "afternoon" ? "下午" : item.session_type}
									</Tag>
									<Badge count={item.stock_count} style={{ backgroundColor: "#1890ff" }} overflowCount={99} />
									<Text type="secondary" style={{ fontSize: 12 }}>
										置信度:
										{item.confidence_score}
										%
									</Text>
								</div>
							),
							children: (
								<div>
									{item.strategy_summary && (
										<Alert type="info" showIcon={false} message={item.strategy_summary} style={{ marginBottom: 12, fontSize: 13 }} />
									)}
									{item.recommendations && item.recommendations.length > 0
										? (
											<Row gutter={[12, 12]}>
												{item.recommendations.map((raw: DragonHeadFollowStock, i: number) => {
													const s = normalizeStock(raw);
													return (
														<Col xs={24} sm={12} lg={8} key={s.code || i}>
															<Card
																size="small"
																style={{ borderLeft: `3px solid ${getActionColor(s.action)}` }}
																styles={{ body: { padding: "8px 12px" } }}
															>
																<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
																	<Space size={4}>
																		<Text strong style={{ fontSize: 13 }}>{s.name}</Text>
																		<Text type="secondary" style={{ fontSize: 11 }}>{s.code}</Text>
																	</Space>
																	<Tag color={getActionColor(s.action)} icon={getActionIcon(s.action)} style={{ fontSize: 11, marginRight: 0 }}>{s.action}</Tag>
																</div>
																<div style={{ marginTop: 4, display: "flex", gap: 12, fontSize: 12 }}>
																	{s.current_price != null && (
																		<Text style={{ color: "#f5222d", fontWeight: 600 }}>
																			¥
																			{s.current_price.toFixed(2)}
																		</Text>
																	)}
																	{s.target_price != null && s.target_price > 0 && (
																		<Text type="secondary">
																			目标¥
																			{s.target_price.toFixed(2)}
																		</Text>
																	)}
																	{s.stop_loss != null && s.stop_loss > 0 && (
																		<Text type="secondary">
																			止损¥
																			{s.stop_loss.toFixed(2)}
																		</Text>
																	)}
																</div>
																{s.reason && (
																	<Text style={{ fontSize: 11, color: "#8c8c8c", display: "block", marginTop: 2 }}>
																		💡
																		{s.reason}
																	</Text>
																)}
															</Card>
														</Col>
													);
												})}
											</Row>
										)
										: (
											<Text type="secondary" style={{ fontSize: 12 }}>无个股操作记录</Text>
										)}
								</div>
							),
						}))}
					/>
				</Card>
			)}

			{renderBottomContent}

			<Card
				title={(
					<Space>
						<SafetyOutlined style={{ color: "#52c41a" }} />
						<span>生成流程</span>
					</Space>
				)}
				style={{ marginTop: 16 }}
				size="small"
			>
				<Steps size="small" items={pipelineSteps} />
			</Card>
		</div>
	);
}

export const dragonHeadSteps = [
	{ title: "08:30 盘前候选池", description: "昨日涨停数据生成观察池", status: "finish" as const },
	{ title: "09:35 竞价确认", description: "开盘5分钟后确认主线龙头", status: "finish" as const },
	{ title: "09:36 ★跟投指导", description: "竞价确认后立即生成操作指令", status: "process" as const },
	{ title: "14:30 调仓(T+1)", description: "仅卖昨日持仓", status: "finish" as const },
	{ title: "15:30 盘后复盘", description: "次日预判（非实盘）", status: "wait" as const },
];

const emotionRelaySteps = [
	{ title: "情绪择时", description: "结合情绪周期判断试错、主做或空仓", status: "finish" as const },
	{ title: "主线梯队", description: "融合接力候选与主线板块梯队", status: "finish" as const },
	{ title: "候选分层", description: "输出核心、观察、回避三类推荐池", status: "process" as const },
	{ title: "盘后刷新", description: "手动刷新后同步最新情绪接力推荐", status: "wait" as const },
];

export function DragonHeadFollowExecutionTab() {
	return (
		<FollowPanel
			strategyLabel="龙头战法"
			strategyIcon={<CrownOutlined style={{ fontSize: 20, color: "#f5222d" }} />}
			fetchFn={fetchDragonHeadFollow}
			triggerFn={triggerDragonHeadFollow}
			pipelineSteps={dragonHeadSteps}
			renderExtraSections={latest => <DragonHeadExtraSections latest={latest} />}
		/>
	);
}

export function EmotionRelayFollowExecutionTab() {
	return (
		<FollowPanel
			strategyLabel="情绪接力"
			strategyIcon={<ThunderboltOutlined style={{ fontSize: 20, color: "#fa8c16" }} />}
			fetchFn={fetchEmotionRelayFollow}
			triggerFn={triggerEmotionRelayFollow}
			pipelineSteps={emotionRelaySteps}
			renderExtraSections={latest => <RelayExtraSections latest={latest} />}
			renderBottomContent={<RecommendationHistory strategyType="emotion_relay" title="历史跟投指令" />}
		/>
	);
}

export default function DragonHeadFollow() {
	return (
		<div style={{ paddingBottom: 24 }}>
			<div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
				<TeamOutlined style={{ fontSize: 24, color: "#1890ff", marginRight: 8 }} />
				<Title level={4} style={{ margin: 0 }}>实盘跟投指导</Title>
			</div>

			<Tabs
				defaultActiveKey="dragon_head"
				type="card"
				items={[
					{
						key: "dragon_head",
						label: (
							<Space>
								<CrownOutlined style={{ color: "#f5222d" }} />
								龙头战法
							</Space>
						),
						children: <DragonHeadFollowExecutionTab />,
					},
					{
						key: "relay",
						label: (
							<Space>
								<ThunderboltOutlined style={{ color: "#fa8c16" }} />
								情绪接力
							</Space>
						),
						children: <EmotionRelayFollowExecutionTab />,
					},
				]}
			/>

			<style>
				{`
				.ant-card-hoverable:hover {
					box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
					transform: translateY(-2px);
					transition: all 0.3s;
				}
				`}
			</style>
		</div>
	);
}
