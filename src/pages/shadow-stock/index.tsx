import type {
	ShadowStockDashboardResponse,
	ShadowStockHolding,
	ShadowStockIPOTarget,
	ShadowStockReport,
	ShadowStockTrack,
} from "#src/api/shadow-stock";
import {
	fetchShadowStockDashboard,
	fetchShadowStockReportHistory,
	fetchShadowStockReportStatus,
	refreshShadowStockReport,
} from "#src/api/shadow-stock";

import { BasicContent } from "#src/components/basic-content";
import {
	BankOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	ExclamationCircleOutlined,
	FireOutlined,
	HistoryOutlined,
	InfoCircleOutlined,
	ReloadOutlined,
	RiseOutlined,
	RocketOutlined,
	SafetyCertificateOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Descriptions,
	Empty,
	message,
	Progress,
	Result,
	Row,
	Select,
	Space,
	Spin,
	Steps,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatComparableMetric, normalizeComparableCompanies } from "./comparables";
import { formatMetric } from "./data";
import { pollReport } from "./poll-report";
import { useLatestRequest } from "./use-latest-request";
import "#src/pages/home/business.css";

const { Title, Text, Paragraph } = Typography;

const IPO_STATUS_MAP: Record<string, { step: number, color: string }> = {
	辅导中: { step: 0, color: "#1677ff" },
	辅导备案: { step: 0, color: "#1677ff" },
	已受理: { step: 1, color: "#faad14" },
	问询中: { step: 2, color: "#fa8c16" },
	问询: { step: 2, color: "#fa8c16" },
	已过会: { step: 3, color: "#52c41a" },
	上市委审议: { step: 3, color: "#52c41a" },
	已注册: { step: 4, color: "#722ed1" },
	即将上市: { step: 4, color: "#722ed1" },
	已上市: { step: 5, color: "#13c2c2" },
};

const CONFIDENCE_COLORS: Record<string, string> = {
	high: "#52c41a",
	medium: "#faad14",
	low: "#ff4d4f",
};

const RISK_COLORS: Record<string, string> = {
	low: "green",
	medium: "orange",
	high: "red",
};

const TRACK_ICONS = [
	<RocketOutlined key="r" />,
	<ThunderboltOutlined key="t" />,
	<FireOutlined key="f" />,
	<SafetyCertificateOutlined key="s" />,
	<RiseOutlined key="ri" />,
];

const TRACK_GRADIENTS = ["var(--app-hero)"];

function formatValuation(v: number): string {
	return formatMetric(v, 1, "亿", true);
}

function formatConfidence(c: string): string {
	if (c === "high")
		return "高确信";
	if (c === "medium")
		return "中确信";
	return c === "low" ? "低确信" : "待核验";
}

function getElasticityColor(v: number): string {
	if (v >= 20)
		return "#52c41a";
	if (v >= 10)
		return "#faad14";
	return "#999";
}

function formatRiskText(v: string): string {
	if (v === "low")
		return "低";
	if (v === "medium")
		return "中";
	return v === "high" ? "高" : "待核验";
}

function formatBizColor(v: string): string {
	if (v === "良好")
		return "green";
	if (v === "较差")
		return "red";
	return "default";
}

/* =========================================================
 *  主组件
 * ========================================================= */
export default function ShadowStockPage() {
	const { data: dashboard, loading, error: loadError, run: runDashboard } = useLatestRequest<ShadowStockDashboardResponse>();
	const { data: historyResponse, run: runHistory } = useLatestRequest<{ data: ShadowStockReport[] }>();
	const [refreshing, setRefreshing] = useState(false);
	const [refreshError, setRefreshError] = useState<string | null>(null);
	const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
	const [selectedBatchId, setSelectedBatchId] = useState<string | undefined>();
	const refreshController = useRef<AbortController | null>(null);
	const reportHistory = historyResponse?.data || [];

	const loadData = useCallback(async (batchId?: string) => {
		const resp = await runDashboard(signal => fetchShadowStockDashboard(batchId ? { batch_id: batchId } : undefined, signal));
		if (resp) {
			setSelectedTrackId(null);
			setSelectedTargetId(resp.status === "ok" ? resp.top_ipo_targets?.[0]?.id || null : null);
		}
	}, [runDashboard]);
	const loadHistory = useCallback(() => runHistory(signal => fetchShadowStockReportHistory({ page: 1, page_size: 50 }, signal)), [runHistory]);

	useEffect(() => {
		void loadData();
		void loadHistory();
		return () => refreshController.current?.abort();
	}, [loadData, loadHistory]);

	const watchReport = useCallback(async (batchId: string, controller: AbortController) => {
		const status = await pollReport(signal => fetchShadowStockReportStatus(batchId, signal), controller.signal);
		if (controller.signal.aborted)
			return;
		if (status.status === "completed") {
			setSelectedBatchId(batchId);
			await Promise.all([loadData(batchId), loadHistory()]);
			if (!controller.signal.aborted)
				message.success("影子股报告刷新完成");
		}
		else {
			throw new Error(status.error || status.message || (status.status === "not_found" ? "报告批次不存在，请重新查询" : "影子股报告刷新失败"));
		}
	}, [loadData, loadHistory]);

	const startRefresh = useCallback(async (existingBatchId?: string) => {
		if (refreshController.current && !refreshController.current.signal.aborted)
			return;
		const controller = new AbortController();
		refreshController.current = controller;
		setRefreshing(true);
		setRefreshError(null);
		try {
			let batchId = existingBatchId;
			if (!batchId) {
				const resp = await refreshShadowStockReport(controller.signal);
				if (controller.signal.aborted)
					return;
				if (resp.status === "failed")
					throw new Error(resp.error || resp.message || "刷新启动失败");
				batchId = resp.batch_id;
				if (!batchId)
					throw new Error("后端未返回批次号，请重新查询状态");
				message.info(resp.message || "刷新已启动");
			}
			await watchReport(batchId, controller);
		}
		catch (error) {
			if (!controller.signal.aborted)
				setRefreshError(error instanceof Error ? error.message : "刷新状态查询失败，请重试");
		}
		finally {
			if (!controller.signal.aborted)
				setRefreshing(false);
			if (refreshController.current === controller)
				refreshController.current = null;
		}
	}, [watchReport]);
	const handleRefresh = () => {
		void startRefresh();
	};

	const runningBatchId = dashboard?.running_report?.batch_id || (dashboard?.report?.status === "running" ? dashboard.report.batch_id : undefined);
	useEffect(() => {
		if (runningBatchId)
			void startRefresh(runningBatchId);
	}, [runningBatchId, startRefresh]);

	const filteredTargets = useMemo(() => {
		if (!dashboard?.top_ipo_targets)
			return [];
		if (selectedTrackId === null)
			return dashboard.top_ipo_targets;
		return dashboard.top_ipo_targets.filter(t => t.track_id === selectedTrackId);
	}, [dashboard, selectedTrackId]);

	const selectedTarget = useMemo(() => filteredTargets.find(target => target.id === selectedTargetId) || filteredTargets[0] || null, [filteredTargets, selectedTargetId]);
	const comparableCompanies = useMemo(() => normalizeComparableCompanies(selectedTarget?.comparable_companies), [selectedTarget]);

	const selectedHoldings = useMemo(() => {
		return selectedTarget?.holdings || [];
	}, [selectedTarget]);

	const detailRef = useRef<HTMLDivElement>(null);

	// 移动端点击IPO标的后，自动滚动到详情面板
	useEffect(() => {
		if (selectedTarget && detailRef.current && window.innerWidth < 992) {
			const timer = setTimeout(() => {
				detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [selectedTarget]);

	if (!loading && (loadError || !dashboard || dashboard.status !== "ok")) {
		return (
			<BasicContent className="h-full" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
				<Result
					icon={<RocketOutlined style={{ color: "var(--app-accent-text)", fontSize: 72 }} />}
					title="影子股套利分析"
					subTitle={loadError || refreshError || dashboard?.message || (refreshing ? "报告正在后台生成，可停留本页等待完成" : "暂无可展示的完整报告")}
					extra={(
						<Space wrap>
							{selectedBatchId && (
								<Button onClick={() => {
									setSelectedBatchId(undefined);
									void loadData();
								}}
								>
									查看最新完整报告
								</Button>
							)}
							<Button onClick={() => { void loadData(selectedBatchId); }} loading={loading}>重新查询</Button>
							<Button type="primary" size="large" icon={<ReloadOutlined />} loading={refreshing} onClick={handleRefresh}>生成影子股报告</Button>
						</Space>
					)}
				/>
			</BasicContent>
		);
	}

	return (
		<BasicContent className="h-full">
			<Spin spinning={loading} tip="加载中...">
				<div style={{ padding: "0 4px" }}>
					{refreshError && <Alert type="warning" showIcon message={refreshError} style={{ marginBottom: 12 }} />}
					<Alert type="info" showIcon message="影子股估值研究：股权估值占比不是预期收益或股价涨幅，需结合持股证据、摊薄、账面价值和退出约束核验。" style={{ marginBottom: 12 }} />
					{/* 顶部信息栏 */}
					<div className="app-page-hero business-inline-hero" style={{ marginBottom: 20 }}>
						<div style={{ minWidth: 0 }}>
							<Title level={4} style={{ margin: 0, marginBottom: 4, fontSize: 18 }}>
								<RocketOutlined style={{ marginRight: 8, color: "#ffb9c5" }} />
								影子股套利策略
							</Title>
							{dashboard?.report && (
								<Space size={8} wrap>
									<Text type="secondary" style={{ fontSize: 12 }}>
										<ClockCircleOutlined style={{ marginRight: 4 }} />
										{`更新于 ${dashboard.report.created_at ? new Date(dashboard.report.created_at).toLocaleString("zh-CN") : "未知"}`}
									</Text>
									<Text type="secondary" style={{ fontSize: 12 }}>
										{`耗时 ${dashboard.report.duration_seconds}s`}
									</Text>
									{dashboard.needs_refresh && (
										<Tag color="warning" icon={<ExclamationCircleOutlined />}>
											建议刷新
										</Tag>
									)}
								</Space>
							)}
						</div>
						<Space wrap>
							{reportHistory.length > 1 && (
								<Select
									value={selectedBatchId || dashboard?.batch_id}
									disabled={refreshing}
									aria-label="历史报告批次"
									style={{ width: "min(220px, 50vw)" }}
									placeholder="选择历史报告"
									suffixIcon={<HistoryOutlined />}
									onChange={(val) => {
										setSelectedBatchId(val);
										setSelectedTrackId(null);
										loadData(val);
									}}
									options={reportHistory.map((r, idx) => ({
										value: r.batch_id,
										disabled: r.status !== "completed",
										label: `${r.created_at ? new Date(r.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "未知"} (${r.track_count}赛道/${r.target_count}标的)${r.status === "running" ? " 生成中" : r.status === "failed" ? " 失败" : idx === 0 ? " 最新" : ""}`,
									}))}
								/>
							)}
							<Button type="primary" icon={<ReloadOutlined />} loading={refreshing} onClick={handleRefresh} size="middle">
								{refreshing ? "刷新中..." : "刷新报告"}
							</Button>
						</Space>
					</div>

					{/* 赛道卡片区 */}
					<div style={{ marginBottom: 20 }}>
						<div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
							<Card
								hoverable
								onClick={() => setSelectedTrackId(null)}
								style={{
									minWidth: 120,
									flex: "0 0 auto",
									cursor: "pointer",
									border: selectedTrackId === null ? "2px solid var(--app-accent)" : "1px solid #f0f0f0",
									borderRadius: 12,
									background: selectedTrackId === null ? "var(--app-accent-soft)" : undefined,
									transition: "all 0.3s ease",
								}}
								bodyStyle={{ padding: "12px 16px", textAlign: "center" }}
							>
								<BankOutlined style={{ fontSize: 24, color: "var(--app-accent-text)", marginBottom: 4 }} />
								<div style={{ fontWeight: 600 }}>全部赛道</div>
								<Text type="secondary" style={{ fontSize: 12 }}>
									{`${dashboard?.top_ipo_targets?.length || 0} 个标的`}
								</Text>
							</Card>

							{dashboard?.tracks?.map((track, idx) => (
								<TrackCard
									key={track.id}
									track={track}
									index={idx}
									isSelected={selectedTrackId === track.id}
									targetCount={dashboard.top_ipo_targets?.filter(t => t.track_id === track.id).length || 0}
									onClick={() => setSelectedTrackId(track.id === selectedTrackId ? null : track.id)}
								/>
							))}
						</div>
					</div>

					{/* 主内容区 */}
					<Row gutter={[16, 16]}>
						<Col xs={24} lg={10} xl={9}>
							<Card
								title={(
									<Space>
										<FireOutlined style={{ color: "#f5576c" }} />
										<span>{`IPO 进展 (${filteredTargets.length})`}</span>
									</Space>
								)}
								bodyStyle={{ padding: 0, maxHeight: "min(50vh, calc(100vh - 340px))", overflowY: "auto" }}
								style={{ borderRadius: 12, marginBottom: 0 }}
							>
								{filteredTargets.length === 0 && (
									<Empty description="暂无数据" style={{ padding: 40 }} />
								)}
								{filteredTargets.length > 0 && filteredTargets.map(target => (
									<IPOTargetCard
										key={target.id}
										target={target}
										isSelected={selectedTarget?.id === target.id}
										onClick={() => setSelectedTargetId(target.id)}
									/>
								))}
							</Card>
						</Col>

						<Col xs={24} lg={14} xl={15}>
							<div ref={detailRef} />
							{selectedTarget && (
								<Card
									title={(
										<Space>
											<RiseOutlined style={{ color: "#52c41a" }} />
											<span>{`${selectedTarget.company_name} — 影子股分析`}</span>
											<Tag color={CONFIDENCE_COLORS[selectedTarget.valuation_confidence]}>
												{formatConfidence(selectedTarget.valuation_confidence)}
											</Tag>
										</Space>
									)}
									style={{ borderRadius: 12 }}
									bodyStyle={{ maxHeight: "min(70vh, calc(100vh - 340px))", overflowY: "auto" }}
								>
									<Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered style={{ marginBottom: 16, overflowX: "auto" }}>
										<Descriptions.Item label="目标市场">{selectedTarget.target_market || "-"}</Descriptions.Item>
										<Descriptions.Item label="预期市值">
											<Text strong style={{ color: "#1677ff", fontSize: 16 }}>
												{formatValuation(selectedTarget.expected_valuation)}
											</Text>
										</Descriptions.Item>
										<Descriptions.Item label="估值方法">{selectedTarget.valuation_method || "-"}</Descriptions.Item>
										<Descriptions.Item label="行业PE">{formatMetric(selectedTarget.industry_pe, 1, "倍", true)}</Descriptions.Item>
										<Descriptions.Item label="IPO状态">
											<Tag color={IPO_STATUS_MAP[selectedTarget.ipo_status]?.color || "#999"}>
												{selectedTarget.ipo_status}
											</Tag>
										</Descriptions.Item>
										<Descriptions.Item label="进展日期">{selectedTarget.progress_date || "未提供"}</Descriptions.Item>
										<Descriptions.Item label="资料来源" span={3}>{selectedTarget.data_source || "未提供，待核验"}</Descriptions.Item>
										<Descriptions.Item label="重要性评分">
											<Progress percent={selectedTarget.importance_score} size="small" strokeColor="var(--app-accent)" style={{ width: 100 }} />
										</Descriptions.Item>
									</Descriptions>

									{selectedTarget.latest_progress && (
										<Alert
											message="最新进展"
											description={selectedTarget.latest_progress}
											type="info"
											showIcon
											icon={<InfoCircleOutlined />}
											style={{ marginBottom: 16, borderRadius: 8 }}
										/>
									)}

									<Table<ShadowStockHolding>
										dataSource={selectedHoldings}
										rowKey="id"
										size="small"
										pagination={false}
										scroll={{ x: 900 }}
										columns={getHoldingsColumns()}
										locale={{ emptyText: "暂无影子股数据" }}
									/>

									{comparableCompanies.length > 0 && (
										<div style={{ marginTop: 16 }}>
											<Text type="secondary" strong>可比公司参考：</Text>
											<div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
												{comparableCompanies.map((c, index) => (
													<Tag key={`${c.name}-${index}`} color="blue">
														{`${c.name}（市值${formatComparableMetric(c.market_cap, "亿")}，PE ${formatComparableMetric(c.pe, "x")}）`}
													</Tag>
												))}
											</div>
										</div>
									)}
								</Card>
							)}
							{!selectedTarget && (
								<Card style={{ borderRadius: 12, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
									<Empty description="请从左侧选择一个 IPO 标的查看影子股分析" />
								</Card>
							)}
						</Col>
					</Row>
				</div>
			</Spin>
		</BasicContent>
	);
}

/* =========================================================
 *  影子股表格列定义（提取以避免 JSX 内联过深）
 * ========================================================= */
function getHoldingsColumns() {
	return [
		{
			title: "影子股",
			key: "holder",
			width: 160,
			fixed: "left" as const,
			render: (_: unknown, r: ShadowStockHolding) => (
				<div>
					<Text strong>{r.holder_name}</Text>
					{r.holder_stock_code && (
						<div>
							<Text type="secondary" style={{ fontSize: 12 }}>{r.holder_stock_code}</Text>
						</div>
					)}
				</div>
			),
		},
		{
			title: "持股比例",
			dataIndex: "holding_ratio",
			key: "ratio",
			width: 90,
			align: "right" as const,
			render: (v: number) => (
				<Text strong>{v > 0 ? `${v}%` : "-"}</Text>
			),
		},
		{
			title: "持股类型",
			dataIndex: "holding_type",
			key: "type",
			width: 100,
			render: (v: string) => <Tag>{v}</Tag>,
		},
		{
			title: "当前市值(亿)",
			dataIndex: "holder_market_cap",
			key: "cap",
			width: 110,
			align: "right" as const,
			render: (v: number) => (v > 0 ? v.toFixed(1) : "-"),
		},
		{
			title: "股权估值(亿)",
			dataIndex: "expected_gain",
			key: "gain",
			width: 110,
			align: "right" as const,
			render: (v: number, row: ShadowStockHolding) => (
				<Text>
					{row.calculation_available === false ? "待核验" : formatMetric(v, 2, "", true)}
				</Text>
			),
		},
		{
			title: (
				<Tooltip title="折价股权估值占比 = IPO股权估值 / 持有人市值 × 折价系数；未扣除原有账面价值，不代表收益率或股价上涨空间。">
					<span>
						{"折价估值占比 "}
						<InfoCircleOutlined />
					</span>
				</Tooltip>
			),
			dataIndex: "adjusted_gain_ratio",
			key: "elasticity",
			width: 110,
			align: "right" as const,
			defaultSortOrder: "descend" as const,
			sorter: (a: ShadowStockHolding, b: ShadowStockHolding) => a.adjusted_gain_ratio - b.adjusted_gain_ratio,
			render: (v: number, row: ShadowStockHolding) => (
				<Text strong style={{ color: getElasticityColor(v), fontSize: 15 }}>
					{row.calculation_available === false ? "待核验" : formatMetric(v, 1, "%")}
				</Text>
			),
		},
		{
			title: "证据与计算",
			key: "evidence",
			width: 220,
			render: (_: unknown, row: ShadowStockHolding) => <Tooltip title={[row.evidence_text, row.evidence_source_url, row.evidence_confidence ? `证据置信：${row.evidence_confidence}` : "", ...(row.calculation_issues || [])].filter(Boolean).join("；") || "未提供持股证据"}><span>{row.calculation_available === false ? "计算条件不足" : row.evidence_text && row.evidence_source_url && row.verified_at ? `记录于 ${row.verified_at}` : "证据待核验"}</span></Tooltip>,
		},
		{
			title: "风险",
			dataIndex: "risk_level",
			key: "risk",
			width: 60,
			align: "center" as const,
			render: (v: string) => (
				<Badge color={RISK_COLORS[v] || "gray"} text={formatRiskText(v)} />
			),
		},
		{
			title: "主业状态",
			dataIndex: "holder_business_status",
			key: "biz",
			width: 80,
			render: (v: string) => <Tag color={formatBizColor(v)}>{v}</Tag>,
		},
	];
}

/* =========================================================
 *  子组件：赛道卡片
 * ========================================================= */
interface TrackCardProps {
	track: ShadowStockTrack
	index: number
	isSelected: boolean
	targetCount: number
	onClick: () => void
}

function TrackCard({ track, index, isSelected, targetCount, onClick }: TrackCardProps) {
	return (
		<Card
			hoverable
			onClick={onClick}
			style={{
				minWidth: 150,
				flex: "0 0 auto",
				cursor: "pointer",
				border: isSelected ? "2px solid var(--app-accent)" : "1px solid #f0f0f0",
				borderRadius: 12,
				overflow: "hidden",
				transition: "all 0.3s ease",
				transform: isSelected ? "scale(1.02)" : "scale(1)",
			}}
			bodyStyle={{ padding: 0 }}
		>
			<div
				style={{
					background: TRACK_GRADIENTS[index % TRACK_GRADIENTS.length],
					padding: "10px 16px 6px",
					color: "#fff",
					display: "flex",
					alignItems: "center",
					gap: 8,
				}}
			>
				{TRACK_ICONS[index % TRACK_ICONS.length]}
				<span style={{ fontWeight: 700, fontSize: 14 }}>{track.track_name}</span>
			</div>
			<div style={{ padding: "8px 16px 12px" }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
					<Text type="secondary" style={{ fontSize: 11 }}>热度</Text>
					<Text strong style={{ fontSize: 13 }}>{track.heat_score}</Text>
				</div>
				<Progress
					percent={track.heat_score}
					showInfo={false}
					size="small"
					strokeColor="var(--app-accent)"
				/>
				<Text type="secondary" style={{ fontSize: 11 }}>
					{`${targetCount} 个IPO标的`}
				</Text>
			</div>
		</Card>
	);
}

/* =========================================================
 *  子组件：IPO 标的卡片
 * ========================================================= */
interface IPOTargetCardProps {
	target: ShadowStockIPOTarget
	isSelected: boolean
	onClick: () => void
}

function IPOTargetCard({ target, isSelected, onClick }: IPOTargetCardProps) {
	const statusInfo = IPO_STATUS_MAP[target.ipo_status] || { step: -1, color: "#999" };

	return (
		<div
			onClick={onClick}
			style={{
				padding: "12px 16px",
				cursor: "pointer",
				borderBottom: "1px solid #f5f5f5",
				background: isSelected ? "var(--app-accent-soft)" : "transparent",
				borderLeft: isSelected ? "3px solid var(--app-accent)" : "3px solid transparent",
				transition: "all 0.2s ease",
			}}
			onMouseEnter={(e) => {
				if (!isSelected)
					e.currentTarget.style.background = "#fafafa";
			}}
			onMouseLeave={(e) => {
				if (!isSelected)
					e.currentTarget.style.background = "transparent";
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div style={{ flex: 1 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
						<Text strong style={{ fontSize: 14 }}>{target.company_name}</Text>
						<Tag color={statusInfo.color} style={{ fontSize: 11, lineHeight: "18px", padding: "0 4px" }}>
							{target.ipo_status}
						</Tag>
					</div>
					{target.track && (
						<Tag color="default" style={{ fontSize: 10, marginBottom: 4 }}>
							{target.track.track_name}
						</Tag>
					)}
					{target.target_market && (
						<Tag color="blue" style={{ fontSize: 10, marginBottom: 4 }}>
							{target.target_market}
						</Tag>
					)}
				</div>
				<div style={{ textAlign: "right", minWidth: 90 }}>
					{target.expected_valuation > 0 && (
						<div>
							<Text type="secondary" style={{ fontSize: 11 }}>预期市值</Text>
							<div>
								<Text strong style={{ color: "#1677ff", fontSize: 16 }}>
									{target.expected_valuation}
								</Text>
								<Text type="secondary" style={{ fontSize: 11 }}>亿</Text>
							</div>
						</div>
					)}
				</div>
			</div>

			<div style={{ overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>
				<Steps
					size="small"
					current={statusInfo.step}
					style={{ minWidth: 360 }}
					items={[
						{ title: "辅导" },
						{ title: "受理" },
						{ title: "问询" },
						{ title: "过会" },
						{ title: "注册" },
						{ title: "上市" },
					]}
				/>
			</div>

			{target.ipo_status_detail && (
				<Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }} ellipsis={{ rows: 2 }}>
					{target.ipo_status_detail}
				</Paragraph>
			)}

			{target.holdings?.length > 0 && (
				<div style={{ marginTop: 4 }}>
					<Text type="secondary" style={{ fontSize: 11 }}>
						<CheckCircleOutlined style={{ color: "#52c41a", marginRight: 4 }} />
						{`${target.holdings.length} 个影子股关联`}
					</Text>
				</div>
			)}
		</div>
	);
}
