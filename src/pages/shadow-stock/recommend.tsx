import type { ShadowStockRecommendation, ShadowStockRecommendResponse } from "#src/api/shadow-stock";
import {
	fetchShadowStockRecommendations,
	generateShadowStockRecommendations,
} from "#src/api/shadow-stock";

import {
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
import { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

// ======================== 样式常量 ========================

const LEVEL_CONFIG: Record<string, { color: string, bg: string, label: string, glow: string }> = {
	S: { color: "#faad14", bg: "linear-gradient(135deg, #fff8e1 0%, #fff3cd 100%)", label: "S级·强烈推荐", glow: "0 0 20px rgba(250,173,20,0.3)" },
	A: { color: "#1890ff", bg: "linear-gradient(135deg, #e6f7ff 0%, #d6eaff 100%)", label: "A级·优质推荐", glow: "0 0 15px rgba(24,144,255,0.2)" },
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
		{ label: "弹性", score: rec.elasticity_score, max: 30, color: "#1890ff" },
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
							percent={Math.round((d.score / d.max) * 100)}
							size={40}
							strokeColor={d.color}
							format={() => d.score.toFixed(0)}
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
					{level.label}
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
				<Col span={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: level.color }}>
							{rec.total_score.toFixed(1)}
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>综合评分</div>
					</div>
				</Col>
				<Col span={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{
							fontSize: 22,
							fontWeight: 700,
							color: rec.adjusted_gain_ratio > 15 ? "#f5222d" : rec.adjusted_gain_ratio > 5 ? "#fa8c16" : "#595959",
						}}
						>
							{rec.adjusted_gain_ratio.toFixed(1)}
							%
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>市值弹性</div>
					</div>
				</Col>
				<Col span={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: "#595959" }}>
							{rec.holder_market_cap.toFixed(0)}
							<span style={{ fontSize: 12, fontWeight: 400 }}>亿</span>
						</div>
						<div style={{ fontSize: 11, color: "#8c8c8c" }}>影子股市值</div>
					</div>
				</Col>
				<Col span={6}>
					<div style={{ textAlign: "center", padding: "8px 0" }}>
						<div style={{ fontSize: 22, fontWeight: 700, color: "#595959" }}>
							{rec.holding_ratio.toFixed(2)}
							%
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

			{/* 风险 & IPO信息 */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: 8,
			}}
			>
				<Space size={6}>
					<Tag style={{ borderRadius: 6 }}>
						IPO:
						{rec.ipo_status || "辅导中"}
					</Tag>
					<Tag style={{ borderRadius: 6 }}>
						估值
						{rec.expected_valuation.toFixed(0)}
						亿
					</Tag>
					<Tag style={{ borderRadius: 6 }}>
						{rec.holding_type}
					</Tag>
				</Space>

				<Space size={6}>
					<Badge
						color={riskColor}
						text={(
							<Text style={{ fontSize: 12, color: riskColor }}>
								{rec.risk_level === "low" ? "低风险" : rec.risk_level === "high" ? "高风险" : "中风险"}
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
		小马拉大车: "#eb2f96",
		产业链协同: "#722ed1",
		综合: "#1890ff",
	};

	return (
		<Card
			style={{
				borderRadius: 16,
				background: "linear-gradient(135deg, #141414 0%, #1f1f1f 50%, #262626 100%)",
				border: "none",
				marginBottom: 24,
			}}
			styles={{ body: { padding: "24px 32px" } }}
		>
			<Row gutter={24} align="middle">
				<Col flex="auto">
					<div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
						<Title level={3} style={{ margin: 0, color: "#fff", fontWeight: 700 }}>
							🏆 影子股每日推荐
						</Title>
						{data.recommend_date && (
							<Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
								{data.recommend_date}
							</Text>
						)}
					</div>
					<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4, display: "block" }}>
						基于重估价值法，挖掘小马拉大车 & 产业链协同两大维度，每日精选 Top 10 影子股
					</Text>
				</Col>
				<Col>
					<Row gutter={32}>
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
									<div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
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
									<div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
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
	const [data, setData] = useState<ShadowStockRecommendResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

	const loadData = useCallback(async (dateStr?: string) => {
		setLoading(true);
		try {
			const resp = await fetchShadowStockRecommendations(
				dateStr ? { date: dateStr } : undefined,
			);
			setData(resp);
		}
		catch (err) {
			console.error("Load recommendations failed:", err);
			message.error("加载推荐数据失败");
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData(selectedDate);
	}, [loadData, selectedDate]);

	const handleGenerate = async () => {
		setGenerating(true);
		try {
			const resp = await generateShadowStockRecommendations();
			if (resp.status === "completed") {
				message.success(`推荐生成成功，共 ${resp.count} 只影子股`);
				await loadData(selectedDate);
			}
			else if (resp.status === "no_data") {
				message.warning(resp.message || "暂无影子股数据");
			}
			else {
				message.error(resp.error || resp.message || "生成失败");
			}
		}
		catch (err) {
			console.error("Generate failed:", err);
			message.error("生成推荐失败");
		}
		finally {
			setGenerating(false);
		}
	};

	const recommendations = data?.recommendations || [];
	const hasData = data?.status === "ok" && recommendations.length > 0;

	return (
		<div style={{ padding: "0 16px 32px" }}>
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
					<Space>
						<Text strong>📅 选择日期：</Text>
						<DatePicker
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
								background: "linear-gradient(135deg, #1890ff, #096dd9)",
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
												每天凌晨 6:00 自动生成推荐，也可点击下方按钮手动生成
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
											background: "linear-gradient(135deg, #1890ff, #096dd9)",
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
