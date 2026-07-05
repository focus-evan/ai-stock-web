import type {
	SkillTacticsCandidate,
	SkillTacticsReport,
	SkillTacticsStrategyType,
	StrategyFollowType,
} from "#src/api/strategy";
import type { ColumnsType } from "antd/es/table";
import {
	fetchSkillTacticsDashboard,
	refreshAllSkillTactics,
	refreshSkillTacticsFramework,
} from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";
import {
	BarChartOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	ExperimentOutlined,
	FireOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
	ThunderboltOutlined,
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
	Tabs,
	Tag,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Paragraph, Text, Title } = Typography;

interface TacticConfig {
	type: SkillTacticsStrategyType
	label: string
	color: string
	description: string
}

const TACTICS: TacticConfig[] = [
	{
		type: "yangjia_emotion_cycle",
		label: "炒股养家情绪周期",
		color: "red",
		description: "先判断赚钱效应和亏钱效应，只做情绪确认后的核心标的。",
	},
	{
		type: "kobe92_cycle_speculation",
		label: "92科比周期投机",
		color: "purple",
		description: "围绕低位试错、主升、高位震荡、主跌做龙头和补涨切换。",
	},
	{
		type: "a_share_leader_tactics",
		label: "A股龙头战法",
		color: "volcano",
		description: "筛选市场辨识度、题材正宗度、资金合力同时成立的龙头样本。",
	},
	{
		type: "beijing_chaogu_first_board",
		label: "北京炒家首板",
		color: "orange",
		description: "只跟踪有板块效应、封板质量和回封确认的前排首板样本。",
	},
];

function actionColor(action?: string, decision?: string) {
	const text = `${action || ""}${decision || ""}`;
	if (text.includes("空仓") || text.includes("淘汰") || text.includes("回避"))
		return "default";
	if (text.includes("不追") || text.includes("不做") || text.includes("不打"))
		return "red";
	if (text.includes("可排") || text.includes("介入") || text.includes("试错") || text.includes("分歧"))
		return "green";
	if (text.includes("等") || text.includes("观察") || text.includes("回封"))
		return "blue";
	return "gold";
}

function riskColor(risk?: string) {
	if (!risk)
		return "default";
	if (risk.toLowerCase().includes("red") || risk.includes("高"))
		return "red";
	if (risk.toLowerCase().includes("green") || risk.includes("低"))
		return "green";
	return "orange";
}

function formatPrice(value?: number) {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
		return "-";
	return `¥${value.toFixed(2)}`;
}

function findReport(reports: SkillTacticsReport[], type: SkillTacticsStrategyType) {
	return reports.find(item => item.strategy_type === type);
}

function SkillTacticPanel({ report }: { report: SkillTacticsReport }) {
	const candidateColumns: ColumnsType<SkillTacticsCandidate> = [
		{
			title: "标的",
			key: "stock",
			width: 150,
			render: (_, record) => (
				<Space direction="vertical" size={0}>
					<Text strong>{record.name}</Text>
					<Text type="secondary">{record.code}</Text>
				</Space>
			),
		},
		{
			title: "角色/赛道",
			key: "role",
			width: 180,
			render: (_, record) => (
				<Space direction="vertical" size={4}>
					<Tag color="cyan">{record.role || "待确认角色"}</Tag>
					<Text type="secondary">{record.theme || "-"}</Text>
				</Space>
			),
		},
		{
			title: "价格",
			key: "price",
			width: 120,
			render: (_, record) => (
				<Space direction="vertical" size={0}>
					<Text>{formatPrice(record.current_price)}</Text>
					<Text type={record.change_pct && record.change_pct < 0 ? "success" : "danger"}>
						{typeof record.change_pct === "number" ? `${record.change_pct > 0 ? "+" : ""}${record.change_pct.toFixed(2)}%` : "-"}
					</Text>
				</Space>
			),
		},
		{
			title: "战法动作",
			key: "action",
			width: 150,
			render: (_, record) => (
				<Space direction="vertical" size={4}>
					<Tag color={actionColor(record.native_action, record.decision)}>{record.native_action || "观察"}</Tag>
					<Text type="secondary">{record.decision || "-"}</Text>
				</Space>
			),
		},
		{
			title: "交易触发",
			key: "execution",
			render: (_, record) => (
				<Space direction="vertical" size={4}>
					<Text>{record.buy_method || "-"}</Text>
					<Text type="secondary">{record.price_trigger || "-"}</Text>
					{record.invalid_condition ? <Text type="warning">{record.invalid_condition}</Text> : null}
				</Space>
			),
		},
		{
			title: "评分/理由",
			key: "score",
			width: 240,
			render: (_, record) => (
				<Space direction="vertical" size={6} style={{ width: "100%" }}>
					<Progress percent={Math.max(0, Math.min(100, Math.round(record.score || 0)))} size="small" />
					<Text>{record.reason || "-"}</Text>
				</Space>
			),
		},
	];

	const yieldRows = Array.isArray(report.yield_tracking) ? report.yield_tracking : [];
	const strategyReport = Array.isArray(report.strategy_report)
		? report.strategy_report
		: report.strategy_report ? [String(report.strategy_report)] : [];
	const summary = report.yield_summary;
	const avgScore = summary?.avg_score ?? (
		report.candidates.length > 0
			? report.candidates.reduce((sum, item) => sum + (item.score || 0), 0) / report.candidates.length
			: 0
	);

	return (
		<Space direction="vertical" size={16} style={{ width: "100%" }}>
			<Row gutter={[16, 16]}>
				<Col xs={24} lg={16}>
					<Alert
						type="info"
						showIcon
						message={report.top_verdict || report.mode}
						description={(
							<Space direction="vertical" size={6}>
								<Text>{report.source?.note || "候选池复用情绪接力底座，再按当前战法改写动作、仓位和触发条件。"}</Text>
								<Space wrap>
									{(report.mainlines || []).map(item => <Tag key={item} color="processing">{item}</Tag>)}
								</Space>
							</Space>
						)}
					/>
				</Col>
				<Col xs={24} lg={8}>
					<Card size="small">
						<Space direction="vertical" size={4}>
							<Text type="secondary">底座更新</Text>
							<Text>{report.source?.base_generated_at || report.generated_at || report.timestamp}</Text>
							<Text type="secondary">下一检查点</Text>
							<Text>{report.next_checkpoint || "-"}</Text>
						</Space>
					</Card>
				</Col>
			</Row>

			<Row gutter={[16, 16]}>
				<Col xs={12} md={6}>
					<Card size="small"><Statistic title="当前检查点" value={report.checkpoint || "-"} prefix={<ClockCircleOutlined />} /></Card>
				</Col>
				<Col xs={12} md={6}>
					<Card size="small"><Statistic title="直接可做" value={report.direct_buy_count || 0} prefix={<CheckCircleOutlined />} /></Card>
				</Col>
				<Col xs={12} md={6}>
					<Card size="small"><Statistic title="平均评分" value={avgScore.toFixed(1)} prefix={<BarChartOutlined />} /></Card>
				</Col>
				<Col xs={12} md={6}>
					<Card size="small">
						<Statistic
							title="风险阀门"
							value={report.risk_gate || "-"}
							prefix={<SafetyCertificateOutlined />}
							valueStyle={{ color: riskColor(report.risk_gate) === "red" ? "#cf1322" : undefined }}
						/>
					</Card>
				</Col>
			</Row>

			<Tabs
				items={[
					{
						key: "recommend",
						label: "推荐策略",
						children: (
							<Space direction="vertical" size={16} style={{ width: "100%" }}>
								<Table
									rowKey={(record, index) => `${record.code}-${index}`}
									size="small"
									columns={candidateColumns}
									dataSource={report.candidates || []}
									pagination={false}
									scroll={{ x: 1120 }}
								/>
								<Row gutter={[16, 16]}>
									<Col xs={24} lg={12}>
										<Card
											size="small"
											title={(
												<Space>
													<ExperimentOutlined />
													<span>策略复盘口径</span>
												</Space>
											)}
										>
											{strategyReport.length > 0
												? strategyReport.map(item => <Paragraph key={item} style={{ marginBottom: 8 }}>{item}</Paragraph>)
												: <Empty description="暂无策略报告" />}
										</Card>
									</Col>
									<Col xs={24} lg={12}>
										<Card
											size="small"
											title={(
												<Space>
													<FireOutlined />
													<span>收益跟踪摘要</span>
												</Space>
											)}
										>
											<Row gutter={[12, 12]}>
												<Col span={8}><Statistic title="跟踪数" value={summary?.tracked_count || 0} /></Col>
												<Col span={8}><Statistic title="观察数" value={summary?.watch_count || 0} /></Col>
												<Col span={8}><Statistic title="空仓席位" value={summary?.empty_seat_count || 0} /></Col>
											</Row>
											{yieldRows.length > 0
												? (
													<Table
														size="small"
														style={{ marginTop: 12 }}
														rowKey={(record: any, index) => `${record.code || "yield"}-${index}`}
														dataSource={yieldRows}
														pagination={false}
														columns={[
															{ title: "标的", key: "stock", render: (_, record: any) => `${record.name || "-"} ${record.code || ""}` },
															{ title: "动作", dataIndex: "native_action", key: "native_action" },
															{ title: "评分", dataIndex: "score", key: "score" },
															{ title: "状态", dataIndex: "status", key: "status" },
														]}
													/>
												)
												: null}
										</Card>
									</Col>
								</Row>
							</Space>
						),
					},
					{
						key: "follow",
						label: "交易跟进",
						children: <StrategyFollowTab strategyType={report.strategy_type as StrategyFollowType} title={`${report.short_name || report.strategy_name} 交易跟进`} />,
					},
					{
						key: "history",
						label: "历史推荐/复盘",
						children: <RecommendationHistory strategyType={report.strategy_type} />,
					},
				]}
			/>
		</Space>
	);
}

export default function SkillTacticsPage() {
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [activeType, setActiveType] = useState<SkillTacticsStrategyType>("yangjia_emotion_cycle");
	const [reports, setReports] = useState<SkillTacticsReport[]>([]);
	const [generatedAt, setGeneratedAt] = useState<string>("");
	const [error, setError] = useState<string | null>(null);

	const loadDashboard = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetchSkillTacticsDashboard(5);
			if (res.status === "success") {
				setReports(res.frameworks || []);
				setGeneratedAt(res.generated_at || "");
			}
			else {
				setError("短线四法数据获取失败");
			}
		}
		catch (err: any) {
			setError(err?.message || "短线四法数据获取失败");
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadDashboard();
	}, [loadDashboard]);

	const handleRefreshCurrent = useCallback(async () => {
		setRefreshing(true);
		message.loading({ content: "正在刷新当前战法...", key: "skill-tactics-refresh", duration: 0 });
		try {
			const res = await refreshSkillTacticsFramework(activeType, 5);
			if (res.status === "success" && res.data) {
				setReports((prev) => {
					const next = prev.filter(item => item.strategy_type !== activeType);
					return [...next, res.data].sort((a, b) => TACTICS.findIndex(t => t.type === a.strategy_type) - TACTICS.findIndex(t => t.type === b.strategy_type));
				});
				setGeneratedAt(res.data.generated_at || res.data.timestamp || "");
				message.success({ content: res.message || "刷新完成", key: "skill-tactics-refresh" });
			}
			else {
				message.error({ content: "刷新失败", key: "skill-tactics-refresh" });
			}
		}
		catch (err: any) {
			message.error({ content: err?.message || "刷新失败", key: "skill-tactics-refresh" });
		}
		finally {
			setRefreshing(false);
		}
	}, [activeType]);

	const handleRefreshAll = useCallback(async () => {
		setRefreshing(true);
		message.loading({ content: "正在刷新四个短线 skill 战法...", key: "skill-tactics-refresh", duration: 0 });
		try {
			const res = await refreshAllSkillTactics(5);
			if (res.status === "success") {
				setReports(res.frameworks || []);
				setGeneratedAt(res.generated_at || "");
				message.success({ content: res.message || "四个战法刷新完成", key: "skill-tactics-refresh" });
			}
			else {
				message.error({ content: "刷新失败", key: "skill-tactics-refresh" });
			}
		}
		catch (err: any) {
			message.error({ content: err?.message || "刷新失败", key: "skill-tactics-refresh" });
		}
		finally {
			setRefreshing(false);
		}
	}, []);

	const activeReport = useMemo(() => findReport(reports, activeType), [reports, activeType]);

	if (loading && reports.length === 0)
		return <BasicContent><Skeleton active paragraph={{ rows: 12 }} /></BasicContent>;

	if (error && reports.length === 0) {
		return (
			<BasicContent>
				<Result
					status="error"
					title="短线四法加载失败"
					subTitle={error}
					extra={<Button type="primary" icon={<ReloadOutlined />} onClick={loadDashboard}>重新加载</Button>}
				/>
			</BasicContent>
		);
	}

	return (
		<BasicContent>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space>
					<ThunderboltOutlined style={{ color: "#1677ff", fontSize: 24 }} />
					<div>
						<Title level={4} style={{ margin: 0 }}>短线四法跟踪</Title>
						<Text type="secondary">以情绪接力候选池为底座，按四个 skill 的交易、复盘、推荐口径分别映射。</Text>
					</div>
				</Space>
				<Space>
					{generatedAt
						? (
							<Text type="secondary">
								更新于
								{generatedAt}
							</Text>
						)
						: null}
					<Button icon={<ReloadOutlined />} onClick={handleRefreshCurrent} loading={refreshing}>刷新当前</Button>
					<Button type="primary" icon={<ReloadOutlined />} onClick={handleRefreshAll} loading={refreshing}>刷新全部</Button>
				</Space>
			</div>

			<Tabs
				activeKey={activeType}
				onChange={key => setActiveType(key as SkillTacticsStrategyType)}
				items={TACTICS.map((tactic) => {
					const report = findReport(reports, tactic.type);
					return {
						key: tactic.type,
						label: (
							<Space>
								<Tag color={tactic.color}>{report?.direct_buy_count || 0}</Tag>
								<span>{tactic.label}</span>
							</Space>
						),
						children: report
							? <SkillTacticPanel report={report} />
							: (
								<Card>
									<Empty description={`${tactic.label} 暂无数据`} />
								</Card>
							),
					};
				})}
			/>

			{activeReport
				? (
					<Card size="small" style={{ marginTop: 16 }}>
						<Space direction="vertical" size={4}>
							<Text strong>{activeReport.strategy_name}</Text>
							<Text type="secondary">{TACTICS.find(item => item.type === activeReport.strategy_type)?.description}</Text>
						</Space>
					</Card>
				)
				: null}
		</BasicContent>
	);
}
