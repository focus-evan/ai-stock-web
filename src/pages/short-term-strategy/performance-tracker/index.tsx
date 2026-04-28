import type {
	PerformanceTrackItem,
	StrategyPerformanceSummary,
} from "#src/api/strategy";

import {
	fetchOptimizationInsights,
	fetchPerformanceSummary,
	fetchPerformanceTracker,
	triggerPerformanceEvaluation,
} from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import {
	AlertOutlined,
	AreaChartOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	ExperimentOutlined,
	FallOutlined,
	FilterOutlined,
	MinusCircleOutlined,
	QuestionCircleOutlined,
	RiseOutlined,
	RocketOutlined,
	SyncOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Empty,
	message,
	Progress,
	Row,
	Select,
	Skeleton,
	Space,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const { Title, Text } = Typography;

// ─────────────────── 常量 ───────────────────

const STRATEGY_LABELS: Record<string, string> = {
	dragon_head: "龙头战法",
	relay: "连板接力",
	sentiment: "情绪战法",
	event_driven: "事件驱动",
	breakthrough: "突破战法",
	volume_price: "量价关系",
	moving_average: "均线战法",
	overnight: "隔夜施工",
	auction: "竞价战法",
	northbound: "北向资金",
	trend_momentum: "趋势动量",
	combined: "综合战法",
};

const STRATEGY_COLORS: Record<string, string> = {
	dragon_head: "#f5222d",
	relay: "#fa8c16",
	sentiment: "#eb2f96",
	event_driven: "#722ed1",
	breakthrough: "#1890ff",
	volume_price: "#52c41a",
	moving_average: "#13c2c2",
	overnight: "#2f54eb",
	auction: "#faad14",
	northbound: "#096dd9",
	trend_momentum: "#389e0d",
	combined: "#531dab",
};

const LEVEL_COLORS: Record<string, string> = {
	强烈推荐: "#f5222d",
	推荐: "#fa8c16",
	关注: "#1890ff",
};

// ─────────────────── 工具函数 ───────────────────

function formatPct(v: number | null | undefined, digits = 2): string {
	if (v == null)
		return "—";
	return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function pctColor(v: number | null | undefined): string {
	if (v == null)
		return "#8c8c8c";
	return v > 0 ? "#f5222d" : v < 0 ? "#52c41a" : "#8c8c8c";
}

function PctCell({ v }: { v: number | null }) {
	return <span style={{ color: pctColor(v), fontWeight: 600 }}>{formatPct(v)}</span>;
}

function HitTag({ hit }: { hit: number | null }) {
	if (hit === null)
		return <Tag color="default">—</Tag>;
	return hit === 1
		? <Tag icon={<CheckCircleOutlined />} color="success">命中</Tag>
		: <Tag icon={<CloseCircleOutlined />} color="error">未中</Tag>;
}

function EvalStatusTag({ status }: { status: string }) {
	const map: Record<string, { color: string, label: string }> = {
		complete: { color: "success", label: "完整" },
		partial: { color: "processing", label: "部分" },
		pending: { color: "default", label: "待评估" },
	};
	const { color, label } = map[status] ?? { color: "default", label: status };
	return <Tag color={color}>{label}</Tag>;
}

function WinRateProgress({ rate, label }: { rate: number | null, label: string }) {
	if (rate == null)
		return <Text type="secondary" style={{ fontSize: 12 }}>—</Text>;
	const color = rate >= 60 ? "#52c41a" : rate >= 40 ? "#faad14" : "#f5222d";
	return (
		<div>
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
				<Text style={{ fontSize: 12 }}>{label}</Text>
				<Text style={{ fontSize: 12, color, fontWeight: 700 }}>
					{rate.toFixed(1)}
					%
				</Text>
			</div>
			<Progress
				percent={rate}
				size="small"
				strokeColor={color}
				showInfo={false}
				style={{ margin: 0 }}
			/>
		</div>
	);
}

// ─────────────────── 战法汇总卡片 ───────────────────

function SummaryCard({ s }: { s: StrategyPerformanceSummary }) {
	const color = STRATEGY_COLORS[s.strategy_type] ?? "#1890ff";
	const evaluated = s.evaluated_count;

	return (
		<Card
			size="small"
			hoverable
			style={{ borderTop: `4px solid ${color}`, height: "100%" }}
			styles={{ body: { padding: "16px" } }}
		>
			{/* 战法名称 */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
				<Text strong style={{ fontSize: 15, color }}>{s.strategy_label}</Text>
				<Badge count={s.total_recs} style={{ backgroundColor: color }} overflowCount={999} />
			</div>

			{/* T+1/T+3/T+5 收益 */}
			<Row gutter={8} style={{ marginBottom: 10 }}>
				{[
					{ label: "T+1", v: s.avg_day1_pct },
					{ label: "T+3", v: s.avg_day3_pct },
					{ label: "T+5", v: s.avg_day5_pct },
				].map(({ label, v }) => (
					<Col span={8} key={label}>
						<div style={{ textAlign: "center" }}>
							<div style={{ fontSize: 11, color: "#8c8c8c" }}>{label}</div>
							<div style={{ fontSize: 16, fontWeight: 700, color: pctColor(v) }}>
								{formatPct(v, 1)}
							</div>
						</div>
					</Col>
				))}
			</Row>

			{/* 胜率 */}
			{evaluated > 0 && (
				<div style={{ marginBottom: 8 }}>
					<WinRateProgress rate={s.day3_win_rate} label="T+3胜率" />
				</div>
			)}

			{/* 止盈止损 */}
			<Row gutter={8} style={{ marginBottom: 8 }}>
				<Col span={12}>
					<Text type="secondary" style={{ fontSize: 11 }}>止盈命中</Text>
					<div style={{ color: "#52c41a", fontWeight: 700, fontSize: 14 }}>
						{s.take_profit_rate != null ? `${s.take_profit_rate.toFixed(1)}%` : "—"}
					</div>
				</Col>
				<Col span={12}>
					<Text type="secondary" style={{ fontSize: 11 }}>止损触及</Text>
					<div style={{ color: "#f5222d", fontWeight: 700, fontSize: 14 }}>
						{s.stop_loss_rate != null ? `${s.stop_loss_rate.toFixed(1)}%` : "—"}
					</div>
				</Col>
			</Row>

			{/* MFE/MAE */}
			<div style={{ display: "flex", gap: 16, fontSize: 12 }}>
				<Tooltip title="最大有利波动均值（最高价相对入场价）">
					<span>
						<RiseOutlined style={{ color: "#52c41a" }} />
						{" MFE "}
						{formatPct(s.avg_mfe_pct, 1)}
					</span>
				</Tooltip>
				<Tooltip title="最大不利波动均值（最低价相对入场价）">
					<span>
						<FallOutlined style={{ color: "#f5222d" }} />
						{" MAE "}
						{formatPct(s.avg_mae_pct, 1)}
					</span>
				</Tooltip>
			</div>

			{/* 已评估数量 */}
			<div style={{ marginTop: 8, fontSize: 11, color: "#8c8c8c" }}>
				已评估
				{" "}
				{evaluated}
				{" "}
				条 / 共
				{" "}
				{s.total_recs}
				{" "}
				条
			</div>
		</Card>
	);
}

// ─────────────────── Tab1: 算法效果总览 ───────────────────

function OverviewTab({ days, onDaysChange }: { days: number, onDaysChange: (d: number) => void }) {
	const [loading, setLoading] = useState(false);
	const [summaries, setSummaries] = useState<StrategyPerformanceSummary[]>([]);
	const [insightsLoading, setInsightsLoading] = useState(false);
	const [insights, setInsights] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetchPerformanceSummary(days);
			if (res.status === "success") {
				setSummaries(res.data.summaries);
			}
		}
		catch (e: any) {
			message.error(`获取汇总数据失败: ${e?.message ?? ""}`);
		}
		finally {
			setLoading(false);
		}
	}, [days]);

	const loadInsights = useCallback(async () => {
		setInsightsLoading(true);
		setInsights(null);
		try {
			const res = await fetchOptimizationInsights(days);
			if (res.status === "success") {
				setInsights(res.data.insights);
			}
		}
		catch (e: any) {
			message.error(`获取洞察报告失败: ${e?.message ?? ""}`);
		}
		finally {
			setInsightsLoading(false);
		}
	}, [days]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	if (loading) {
		return <Skeleton active paragraph={{ rows: 8 }} />;
	}

	return (
		<div>
			{/* 筛选栏 */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space>
					<FilterOutlined />
					<Text>统计周期：</Text>
					<Select
						value={days}
						onChange={onDaysChange}
						style={{ width: 100 }}
						options={[
							{ value: 7, label: "7天" },
							{ value: 14, label: "14天" },
							{ value: 30, label: "30天" },
							{ value: 60, label: "60天" },
							{ value: 90, label: "90天" },
						]}
					/>
				</Space>
				<Button icon={<SyncOutlined />} onClick={loadData} loading={loading} size="small">刷新</Button>
			</div>

			{summaries.length === 0
				? (
					<Empty description="暂无追踪数据，请先触发评估" style={{ marginTop: 60 }}>
						<Button type="primary" icon={<ThunderboltOutlined />} onClick={() => window.scrollTo(0, 0)}>
							前往触发评估
						</Button>
					</Empty>
				)
				: (
					<>
						{/* 战法汇总卡片网格 */}
						<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
							{summaries.map(s => (
								<Col xs={24} sm={12} lg={8} xl={6} key={s.strategy_type}>
									<SummaryCard s={s} />
								</Col>
							))}
						</Row>

						{/* LLM 优化洞察 */}
						<Card
							title={(
								<Space>
									<BulbOutlined style={{ color: "#faad14" }} />
									<span>算法优化洞察</span>
									<Tag color="orange">AI 生成</Tag>
								</Space>
							)}
							extra={(
								<Button
									size="small"
									icon={<ExperimentOutlined />}
									onClick={loadInsights}
									loading={insightsLoading}
									type="primary"
									ghost
								>
									{insightsLoading ? "生成中..." : "生成洞察报告"}
								</Button>
							)}
						>
							{insightsLoading
								? <Skeleton active paragraph={{ rows: 8 }} />
								: insights
									? (
										<div className="markdown-body" style={{ lineHeight: 1.8, fontSize: 14 }}>
											<ReactMarkdown>{insights}</ReactMarkdown>
										</div>
									)
									: (
										<Empty
											description="点击「生成洞察报告」基于历史数据生成算法优化建议"
											image={<BulbOutlined style={{ fontSize: 48, color: "#faad14" }} />}
										/>
									)}
						</Card>
					</>
				)}
		</div>
	);
}

// ─────────────────── Tab2: 个股跟踪明细 ───────────────────

function TrackDetailTab({ days }: { days: number }) {
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<PerformanceTrackItem[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [strategyFilter, setStrategyFilter] = useState<string | undefined>(undefined);
	const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
	const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
	const PAGE_SIZE = 20;

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetchPerformanceTracker({
				strategy_type: strategyFilter,
				recommendation_level: levelFilter,
				eval_status: statusFilter,
				days,
				limit: PAGE_SIZE,
				offset: (page - 1) * PAGE_SIZE,
			});
			if (res.status === "success") {
				setItems(res.data.items);
				setTotal(res.data.total);
			}
		}
		catch {
			message.error("获取追踪数据失败");
		}
		finally {
			setLoading(false);
		}
	}, [strategyFilter, levelFilter, statusFilter, days, page]);

	useEffect(() => {
		setPage(1);
	}, [strategyFilter, levelFilter, statusFilter, days]);
	useEffect(() => {
		loadData();
	}, [loadData]);

	const columns = [
		{
			title: "日期",
			dataIndex: "trading_date",
			width: 100,
			render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
		},
		{
			title: "战法",
			dataIndex: "strategy_type",
			width: 90,
			render: (v: string) => (
				<Tag color={STRATEGY_COLORS[v] ?? "#1890ff"} style={{ fontSize: 11 }}>
					{STRATEGY_LABELS[v] ?? v}
				</Tag>
			),
		},
		{
			title: "等级",
			dataIndex: "recommendation_level",
			width: 80,
			render: (v: string) => v
				? <Tag color={LEVEL_COLORS[v] ?? "default"} style={{ fontSize: 11 }}>{v}</Tag>
				: <span style={{ color: "#8c8c8c" }}>—</span>,
		},
		{
			title: "股票",
			dataIndex: "stock_name",
			width: 120,
			render: (name: string, row: PerformanceTrackItem) => (
				<Space direction="vertical" size={0}>
					<Text strong style={{ fontSize: 13 }}>{name}</Text>
					<Text type="secondary" style={{ fontSize: 11 }}>{row.stock_code}</Text>
				</Space>
			),
		},
		{
			title: "入场价",
			dataIndex: "entry_price",
			width: 80,
			render: (v: number) => (
				<Text style={{ fontWeight: 600 }}>
					¥
					{v?.toFixed(2)}
				</Text>
			),
		},
		{
			title: "T+1",
			dataIndex: "day1_return_pct",
			width: 80,
			render: (v: number | null) => <PctCell v={v} />,
			sorter: (a: PerformanceTrackItem, b: PerformanceTrackItem) =>
				(a.day1_return_pct ?? -999) - (b.day1_return_pct ?? -999),
		},
		{
			title: "T+3",
			dataIndex: "day3_return_pct",
			width: 80,
			render: (v: number | null) => <PctCell v={v} />,
			sorter: (a: PerformanceTrackItem, b: PerformanceTrackItem) =>
				(a.day3_return_pct ?? -999) - (b.day3_return_pct ?? -999),
		},
		{
			title: "T+5",
			dataIndex: "day5_return_pct",
			width: 80,
			render: (v: number | null) => <PctCell v={v} />,
			sorter: (a: PerformanceTrackItem, b: PerformanceTrackItem) =>
				(a.day5_return_pct ?? -999) - (b.day5_return_pct ?? -999),
		},
		{
			title: (
				<Tooltip title="最大有利波动（5日内最高点收益）">
					MFE
					{" "}
					<QuestionCircleOutlined />
				</Tooltip>
			),
			dataIndex: "mfe_pct",
			width: 80,
			render: (v: number | null) => (
				<span style={{ color: "#52c41a", fontWeight: 600 }}>
					{v != null ? `+${v.toFixed(2)}%` : "—"}
				</span>
			),
		},
		{
			title: (
				<Tooltip title="最大不利波动（5日内最低点跌幅）">
					MAE
					{" "}
					<QuestionCircleOutlined />
				</Tooltip>
			),
			dataIndex: "mae_pct",
			width: 80,
			render: (v: number | null) => (
				<span style={{ color: "#f5222d", fontWeight: 600 }}>
					{v != null ? `${v.toFixed(2)}%` : "—"}
				</span>
			),
		},
		{
			title: "止盈",
			dataIndex: "hit_take_profit",
			width: 70,
			render: (v: number | null) => <HitTag hit={v} />,
		},
		{
			title: "止损",
			dataIndex: "hit_stop_loss",
			width: 70,
			render: (v: number | null) => <HitTag hit={v} />,
		},
		{
			title: "评估",
			dataIndex: "eval_status",
			width: 75,
			render: (v: string) => <EvalStatusTag status={v} />,
		},
	];

	return (
		<div>
			{/* 筛选栏 */}
			<Card size="small" style={{ marginBottom: 12 }}>
				<Space wrap>
					<FilterOutlined />
					<Select
						allowClear
						placeholder="全部战法"
						style={{ width: 120 }}
						value={strategyFilter}
						onChange={setStrategyFilter}
						options={Object.entries(STRATEGY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
					/>
					<Select
						allowClear
						placeholder="全部等级"
						style={{ width: 110 }}
						value={levelFilter}
						onChange={setLevelFilter}
						options={["强烈推荐", "推荐", "关注"].map(v => ({ value: v, label: v }))}
					/>
					<Select
						allowClear
						placeholder="评估状态"
						style={{ width: 110 }}
						value={statusFilter}
						onChange={setStatusFilter}
						options={[
							{ value: "complete", label: "完整" },
							{ value: "partial", label: "部分" },
							{ value: "pending", label: "待评估" },
						]}
					/>
					<Button size="small" icon={<SyncOutlined />} onClick={loadData} loading={loading}>刷新</Button>
					<Text type="secondary" style={{ fontSize: 12 }}>
						共
						{total}
						{" "}
						条
					</Text>
				</Space>
			</Card>

			<Table
				dataSource={items}
				columns={columns}
				rowKey="id"
				loading={loading}
				size="small"
				scroll={{ x: 1100 }}
				pagination={{
					current: page,
					pageSize: PAGE_SIZE,
					total,
					onChange: setPage,
					showSizeChanger: false,
					showTotal: t => `共 ${t} 条`,
				}}
				rowClassName={(row) => {
					if ((row.day3_return_pct ?? 0) > 5)
						return "row-profit";
					if ((row.day3_return_pct ?? 0) < -3)
						return "row-loss";
					return "";
				}}
			/>
		</div>
	);
}

// ─────────────────── 主页面 ───────────────────

export default function PerformanceTracker() {
	const [days, setDays] = useState(30);
	const [triggering, setTriggering] = useState(false);

	const handleTriggerEval = async () => {
		setTriggering(true);
		message.loading({ content: "正在触发评估任务...", key: "eval", duration: 0 });
		try {
			const res = await triggerPerformanceEvaluation(5);
			if (res.status === "success") {
				message.success({ content: res.message || "评估任务已启动，约1-3分钟后结果可查", key: "eval", duration: 5 });
			}
			else {
				message.error({ content: "触发评估失败", key: "eval" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || "触发失败，请稍后重试", key: "eval" });
		}
		finally {
			setTriggering(false);
		}
	};

	return (
		<BasicContent>
			<div style={{ padding: "0 0 24px 0" }}>
				{/* 页面标题 */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<Space align="center">
						<AreaChartOutlined style={{ fontSize: 24, color: "#1890ff" }} />
						<Title level={4} style={{ margin: 0 }}>推荐追踪 · 算法自优化</Title>
						<Tag color="blue">持续迭代</Tag>
					</Space>
					<Space>
						<Button
							icon={<ThunderboltOutlined />}
							type="primary"
							onClick={handleTriggerEval}
							loading={triggering}
						>
							{triggering ? "评估中..." : "立即评估"}
						</Button>
					</Space>
				</div>

				{/* 说明 */}
				<Alert
					type="info"
					showIcon
					icon={<AlertOutlined />}
					message={(
						<Space>
							<Text strong>功能说明</Text>
						</Space>
					)}
					description={(
						<Text style={{ fontSize: 13 }}>
							系统自动跟踪「强烈推荐」和「推荐」等级股票的市场表现，评估 T+1/T+3/T+5 收益率、最大有利/不利波动（MFE/MAE）、止盈止损命中率。
							每天 17:00 自动评估，也可手动触发。数据持续积累后，通过 AI 洞察报告指导算法参数优化，提升推荐准确率。
						</Text>
					)}
					style={{ marginBottom: 16 }}
				/>

				{/* 主要 Tabs */}
				<Tabs
					defaultActiveKey="overview"
					type="card"
					items={[
						{
							key: "overview",
							label: (
								<Space>
									<RocketOutlined style={{ color: "#1890ff" }} />
									算法效果总览
								</Space>
							),
							children: <OverviewTab days={days} onDaysChange={setDays} />,
						},
						{
							key: "detail",
							label: (
								<Space>
									<MinusCircleOutlined style={{ color: "#52c41a" }} />
									个股跟踪明细
								</Space>
							),
							children: <TrackDetailTab days={days} />,
						},
					]}
				/>
			</div>

			<style>
				{`
				.row-profit td { background: rgba(82, 196, 26, 0.04) !important; }
				.row-loss td { background: rgba(245, 34, 45, 0.04) !important; }
				.markdown-body h1, .markdown-body h2, .markdown-body h3 {
					margin: 16px 0 8px;
					font-weight: 700;
				}
				.markdown-body ul, .markdown-body ol { padding-left: 20px; }
				.markdown-body li { margin-bottom: 4px; }
				.markdown-body strong { color: #262626; }
				.markdown-body p { margin-bottom: 8px; }
			`}
			</style>
		</BasicContent>
	);
}
