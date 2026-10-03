import type { ShadowStockRecommendation, ShadowStockRecommendResponse } from "#src/api/shadow-stock";
import {
	fetchShadowStockRecommendations,
	generateShadowStockRecommendations,
} from "#src/api/shadow-stock";

import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	DatePicker,
	Empty,
	message,
	Progress,
	Row,
	Space,
	Spin,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMetric, metricValue } from "./data";
import { useLatestRequest } from "./use-latest-request";

const { Title, Text, Paragraph } = Typography;

// ======================== 样式常量 ========================

const LEVEL_CONFIG: Record<string, { color: string, bg: string, label: string, glow: string }> = {
	S: { color: "#faad14", bg: "linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)", label: "S级·重点研究", glow: "0 0 20px rgba(250,173,20,0.3)" },
	A: { color: "#1890ff", bg: "linear-gradient(135deg, #e6f7ff 0%, #d6eaff 100%)", label: "A级·优先关注", glow: "0 0 15px rgba(24,144,255,0.2)" },
	B: { color: "#52c41a", bg: "linear-gradient(135deg, #f6ffed 0%, #e8ffe0 100%)", label: "B级·可关注", glow: "0 0 10px rgba(82,196,26,0.15)" },
	C: { color: "#8c8c8c", bg: "linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)", label: "C级·观望", glow: "none" },
};

const TYPE_CONFIG: Record<string, { icon: string, color: string, bg: string }> = {
	小马拉大车: { icon: "🐴", color: "#eb2f96", bg: "#fff0f6" },
	产业链协同: { icon: "🔗", color: "#722ed1", bg: "#f9f0ff" },
	综合: { icon: "📊", color: "#1890ff", bg: "#e6f7ff" },
};

const RISK_COLORS: Record<string, string> = {
	low: "#52c41a",
	medium: "#faad14",
	high: "#f5222d",
};

// ======================== 评分雷达 ========================

function ScoreBreakdown({ rec }: { rec: ShadowStockRecommendation }) {
	const dimensions = [
		{ label: "估值", score: rec.elasticity_score, max: 30, color: "#1890ff" },
		{ label: "安全", score: rec.safety_score, max: 25, color: "#52c41a" },
		{ label: "进度", score: rec.ipo_progress_score, max: 20, color: "#722ed1" },
		{ label: "热度", score: rec.track_heat_score, max: 15, color: "#eb2f96" },
		{ label: "可信", score: rec.confidence_score, max: 10, color: "#faad14" },
	];

	return (
		<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
			{dimensions.map(d => (
				<Tooltip key={d.label} title={`${d.label}得分 ${d.score}/${d.max}`}>
					<div style={{ width: 52, textAlign: "center" }}>
						<Progress
							type="circle"
							percent={Math.max(0, Math.min(100, Math.round((metricValue(d.score) / d.max) * 100)))}
							size={40}
							strokeColor={d.color}
							format={() => formatMetric(d.score, 0)}
							strokeWidth={8}
						/>
						<div style={{ fontSize: 10, color: "#8c8c8c", marginTop: 2 }}>{d.label}</div>
					</div>
				</Tooltip>
			))}
		</div>
	);
}

// ======================== 单张推荐卡片 ========================

function RecommendCard({ rec }: { rec: ShadowStockRecommendation }) {
	const level = LEVEL_CONFIG[rec.recommend_level] || LEVEL_CONFIG.C;
	const historical = rec.is_historical || rec.recommendation_available === false;
	const typeConf = TYPE_CONFIG[rec.recommend_type] || TYPE_CONFIG["综合"];
	const riskColor = RISK_COLORS[rec.risk_level] || RISK_COLORS.medium;

	const isTopThree = rec.rank <= 3;

	return (
		<Card
			hoverable
			style={{
				borderRadius: 16,
				background: level.bg,
				border: `1px solid ${level.color}22`,
				boxShadow: isTopThree ? level.glow : "0 2px 8px rgba(0,0,0,0.04)",
				transition: "all 0.3s ease",
				position: "relative",
				overflow: "hidden",
			}}
			styles={{
				body: { padding: "20px 24px" },
			}}
		>
			{/* 排名角标 */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: 44,
					height: 44,
					background: isTopThree
						? `linear-gradient(135deg, ${level.color}, ${level.color}88)`
						: "#d9d9d9",
					borderRadius: "16px 0 16px 0",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#fff",
					fontSize: isTopThree ? 20 : 16,
					fontWeight: 800,
					textShadow: "0 1px 2px rgba(0,0,0,0.2)",
				}}
			>
				{rec.rank}
			</div>

			{/* 推荐等级徽章 */}
			<div style={{ position: "absolute", top: 12, right: 16 }}>
				<Tag
					color={level.color}
					style={{
						borderRadius: 8,
						fontWeight: 600,
						fontSize: 12,
						padding: "2px 10px",
						border: "none",
					}}
				>
					{historical ? "历史评分快照" : level.label}
				</Tag>
			</div>

			{/* 主信息 */}
			<div style={{ marginLeft: 36, marginBottom: 16 }}>
				<div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
					<Text
						strong
						style={{
							fontSize: 20,
							color: "#141414",
							letterSpacing: 0.5,
						}}
					>
						{rec.holder_name}
					</Text>
					<Text type="secondary" style={{ fontSize: 14 }}>
						{rec.holder_stock_code}
					</Text>
				</div>
				<Space size={8} style={{ marginTop: 6 }} wrap>
					<Tag
						style={{
							background: typeConf.bg,
							color: typeConf.color,
							border: `1px solid ${typeConf.color}33`,
							borderRadius: 6,
							fontWeight: 500,
						}}
					>
						{typeConf.icon}
						{" "}
						{rec.recommend_type}
					</Tag>
					<Tag color="blue" style={{ borderRadius: 6 }}>
						🎯
						{" "}
						{rec.ipo_target_name}
					</Tag>
					<Tag style={{ borderRadius: 6, color: "#595959" }}>
						{rec.track_name}
					</Tag>
				</Space>
			</div>

			{/* 核心数据 */}
			<Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
				<Col xs={12} sm={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: level.color }}>
							{formatMetric(rec.total_score, 1)}
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>综合评分</div>
					</div>
				</Col>
				<Col xs={12} sm={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{
							fontSize: 22,
							fontWeight: 700,
							color: rec.adjusted_gain_ratio > 15 ? "#f5222d" : rec.adjusted_gain_ratio > 5 ? "#fa8c16" : "#595959",
						}}
						>
							{rec.calculation_available === false ? "待核验" : formatMetric(rec.adjusted_gain_ratio, 1, "%")}
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>折价估值占比</div>
					</div>
				</Col>
				<Col xs={12} sm={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: "#595959" }}>
							{formatMetric(rec.holder_market_cap, 0, "亿", true)}
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>影子股市值</div>
					</div>
				</Col>
				<Col xs={12} sm={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: "#595959" }}>
							{formatMetric(rec.holding_ratio, 2, "%", true)}
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>持股比例</div>
					</div>
				</Col>
			</Row>

			{/* 评分明细 */}
			<div style={{
				background: "rgba(255,255,255,0.7)",
				borderRadius: 12,
				padding: "12px 16px",
				marginBottom: 16,
			}}
			>
				<ScoreBreakdown rec={rec} />
			</div>

			{/* 推荐理由 */}
			{rec.recommend_reason && (
				<div style={{
					background: "rgba(255,255,255,0.8)",
					borderRadius: 12,
					padding: "12px 16px",
					marginBottom: 12,
					borderLeft: `3px solid ${level.color}`,
				}}
				>
					<Text strong style={{ fontSize: 12, color: level.color }}>💡 推荐理由</Text>
					<Paragraph
						style={{ margin: "4px 0 0 0", fontSize: 13, color: "#262626", lineHeight: 1.6 }}
						ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}
					>
						{rec.recommend_reason}
					</Paragraph>
				</div>
			)}

			{/* 投资逻辑 */}
			{rec.investment_logic && (
				<div style={{
					background: "rgba(255,255,255,0.8)",
					borderRadius: 12,
					padding: "12px 16px",
					marginBottom: 12,
					borderLeft: `3px solid ${typeConf.color}`,
				}}
				>
					<Text strong style={{ fontSize: 12, color: typeConf.color }}>📋 投资逻辑</Text>
					<Paragraph
						style={{ margin: "4px 0 0 0", fontSize: 13, color: "#262626", lineHeight: 1.6 }}
						ellipsis={{ rows: 3, expandable: true, symbol: "展开" }}
					>
						{rec.investment_logic}
					</Paragraph>
				</div>
			)}

			<Paragraph type="secondary" style={{ fontSize: 12 }}>
				证据：
				{rec.evidence_text || "未提供持股证据摘要"}
				{" "}
				· 证据记录时间：
				{rec.verified_at || "未提供"}
				{rec.evidence_source_url ? ` · 来源：${rec.evidence_source_url}` : ""}
			</Paragraph>
			{rec.eligibility_issues?.length ? <Alert type="warning" message={rec.eligibility_issues.join("；")} style={{ marginBottom: 12 }} /> : null}
			{/* 风险 & IPO信息 */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: 8,
			}}
			>
				<Space size={6} wrap>
					<Tag style={{ borderRadius: 6 }}>
						IPO:
						{rec.ipo_status || "待核验"}
					</Tag>
					<Tag style={{ borderRadius: 6 }}>
						估值
						{formatMetric(rec.expected_valuation, 0, "亿", true)}
					</Tag>
					<Tag style={{ borderRadius: 6 }}>
						{rec.holding_type}
					</Tag>
				</Space>

				<Space size={6} wrap>
					<Badge
						color={riskColor}
						text={(
							<Text style={{ fontSize: 12, color: riskColor }}>
								{rec.risk_level === "low" ? "低风险" : rec.risk_level === "high" ? "高风险" : rec.risk_level === "medium" ? "中风险" : "风险待核验"}
							</Text>
						)}
					/>
					{rec.risk_summary && (
						<Tooltip title={rec.risk_summary}>
							<Text
								type="secondary"
								style={{
									fontSize: 12,
									cursor: "help",
									maxWidth: 200,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									display: "inline-block",
								}}
							>
								⚠️
								{" "}
								{rec.risk_summary}
							</Text>
						</Tooltip>
					)}
				</Space>
			</div>
		</Card>
	);
}

// ======================== 顶部统计 ========================

function StatsBar({ data }: { data: ShadowStockRecommendResponse }) {
	const typeColors: Record<string, string> = {
		小马拉大车: "#ffb9c5",
		产业链协同: "#ffcda8",
		综合: "#fff1f4",
	};

	return (
		<Card
			style={{
				borderRadius: 16,
				background: "var(--app-hero)",
				border: "none",
				marginBottom: 24,
			}}
			styles={{ body: { padding: "24px 32px" } }}
		>
			<Row gutter={[24, 20]} align="middle">
				<Col flex="auto">
					<div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
						<Title level={3} style={{ margin: 0, color: "#fff", fontWeight: 700 }}>
							🏆 影子股每日推荐
						</Title>
						{data.recommend_date && (
							<Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
								{data.recommend_date}
							</Text>
						)}
					</div>
					<Text style={{ color: "#efd3db", fontSize: 13, marginTop: 4, display: "block" }}>
						基于持股证据和估值条件筛选，最多展示 10 只；条件不足时保留空缺。
					</Text>
				</Col>
				<Col>
					<Row gutter={[24, 16]}>
						{/* 类型分布 */}
						{Object.entries(data.type_distribution || {}).map(([type, count]) => (
							<Col key={type}>
								<div style={{ textAlign: "center" }}>
									<div style={{
										fontSize: 28,
										fontWeight: 800,
										color: typeColors[type] || "#1890ff",
										textShadow: `0 0 12px ${typeColors[type] || "#1890ff"}40`,
									}}
									>
										{count}
									</div>
									<div style={{ fontSize: 12, color: "#efd3db" }}>
										{TYPE_CONFIG[type]?.icon || "📊"}
										{" "}
										{type}
									</div>
								</div>
							</Col>
						))}
						{/* 等级分布 */}
						{Object.entries(data.level_distribution || {}).map(([level, count]) => (
							<Col key={level}>
								<div style={{ textAlign: "center" }}>
									<div style={{
										fontSize: 28,
										fontWeight: 800,
										color: LEVEL_CONFIG[level]?.color || "#8c8c8c",
									}}
									>
										{count}
									</div>
									<div style={{ fontSize: 12, color: "#efd3db" }}>
										{level}
										级
									</div>
								</div>
							</Col>
						))}
					</Row>
				</Col>
			</Row>
		</Card>
	);
}

// ======================== 主页面 ========================

export default function ShadowStockRecommendPage() {
	const { data, loading, error, run } = useLatestRequest<ShadowStockRecommendResponse>();
	const generationController = useRef<AbortController | null>(null);
	const [generating, setGenerating] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

	const loadData = useCallback((dateStr?: string) => run(signal => fetchShadowStockRecommendations(dateStr ? { date: dateStr } : undefined, signal)), [run]);

	useEffect(() => {
		loadData(selectedDate);
	}, [loadData, selectedDate]);

	useEffect(() => () => generationController.current?.abort(), []);

	const handleGenerate = async () => {
		if (generationController.current)
			return;
		const controller = new AbortController();
		generationController.current = controller;
		setGenerating(true);
		try {
			const resp = await generateShadowStockRecommendations(controller.signal);
			if (controller.signal.aborted)
				return;
			if (resp.status === "completed") {
				message.success(`推荐生成完成，共 ${resp.count ?? 0} 只影子股`);
				if (selectedDate)
					setSelectedDate(undefined);
				else
					await loadData();
			}
			else if (resp.status === "no_data" || resp.status === "no_eligible") {
				message.warning(resp.message || "暂无符合条件的影子股数据");
				if (selectedDate)
					setSelectedDate(undefined);
				else
					await loadData();
			}
			else if (resp.status === "running") {
				message.info(resp.message || "推荐正在后台生成，请稍后刷新查看");
			}
			else {
				message.error(resp.error || resp.message || "生成失败");
			}
		}
		catch (err) {
			if (!controller.signal.aborted) {
				console.error("Generate failed:", err);
				message.error("生成推荐失败，请刷新检查结果后再重试");
			}
		}
		finally {
			if (!controller.signal.aborted)
				setGenerating(false);
			generationController.current = null;
		}
	};

	const recommendations = data?.recommendations || [];
	const hasData = data?.status === "ok" && recommendations.length > 0;

	return (
		<div style={{ padding: "0 16px 32px" }}>
			<Alert type="info" showIcon message="股权估值占比不是投资收益率；研究排序不代表买入信号。仅展示符合证据及计算条件的候选，不强凑数量。" style={{ marginBottom: 12 }} />
			{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
			{data?.historical_only && <Alert type="warning" showIcon message="当前为历史评分快照，不代表今天仍符合推荐条件。" style={{ marginBottom: 12 }} />}
			{data?.message && <Alert type={data.status === "error" || data.status === "failed" ? "error" : "info"} message={data.message} style={{ marginBottom: 12 }} />}
			{!!data?.excluded_count && (
				<Text type="secondary">
					已过滤
					{data.excluded_count}
					{" "}
					条不符合当前条件的记录
				</Text>
			)}
			{/* 统计头部 */}
			{hasData && data && <StatsBar data={data} />}

			{/* 工具栏 */}
			<Card
				style={{
					borderRadius: 12,
					marginBottom: 24,
					background: "#fafafa",
					border: "1px solid #f0f0f0",
				}}
				styles={{ body: { padding: "12px 20px" } }}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
					<Space wrap>
						<Text strong>📅 选择日期：</Text>
						<DatePicker
							aria-label="推荐日期"
							disabled={generating}
							disabledDate={date => date.isAfter(dayjs(), "day")}
							value={selectedDate ? dayjs(selectedDate) : undefined}
							onChange={d => setSelectedDate(d ? d.format("YYYY-MM-DD") : undefined)}
							allowClear
							placeholder="最新推荐"
							style={{ width: 160 }}
						/>
						{selectedDate && (
							<Button
								size="small"
								onClick={() => setSelectedDate(undefined)}
							>
								查看最新
							</Button>
						)}
					</Space>
					<Space>
						<Button
							type="primary"
							onClick={handleGenerate}
							loading={generating}
							icon={<span>🔄</span>}
							style={{
								borderRadius: 8,
								fontWeight: 600,
								background: "var(--app-accent)",
								border: "none",
							}}
						>
							{generating ? "生成中..." : "立即生成推荐"}
						</Button>
						<Button
							onClick={() => loadData(selectedDate)}
							loading={loading}
							style={{ borderRadius: 8 }}
						>
							刷新
						</Button>
					</Space>
				</div>
			</Card>

			{/* 主内容 */}
			<Spin spinning={loading} size="large">
				{hasData
					? (
						<Row gutter={[20, 20]}>
							{recommendations.map(rec => (
								<Col key={rec.id || rec.rank} xs={24} lg={12} xxl={8}>
									<RecommendCard rec={rec} />
								</Col>
							))}
						</Row>
					)
					: (
						!loading && (
							<Card
								style={{
									borderRadius: 16,
									textAlign: "center",
									padding: "60px 0",
									background: "linear-gradient(135deg, #fafafa, #f5f5f5)",
								}}
							>
								<Empty
									image={Empty.PRESENTED_IMAGE_SIMPLE}
									description={(
										<Space direction="vertical" size={8}>
											<Text type="secondary" style={{ fontSize: 16 }}>
												{data?.message || "暂无影子股推荐数据"}
											</Text>
											<Text type="secondary" style={{ fontSize: 13 }}>
												自动任务按调度配置运行，也可手动生成今日推荐；历史日期不会被重写
											</Text>
										</Space>
									)}
								>
									<Button
										type="primary"
										size="large"
										onClick={handleGenerate}
										loading={generating}
										style={{
											borderRadius: 10,
											height: 44,
											paddingInline: 32,
											fontWeight: 600,
											background: "var(--app-accent)",
											border: "none",
										}}
									>
										🚀 立即生成今日推荐
									</Button>
								</Empty>
							</Card>
						)
					)}
			</Spin>
		</div>
	);
}
