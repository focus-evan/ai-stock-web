import type { PortfolioAnalysisData, PortfolioStockAnalysis } from "#src/api/strategy";
import { fetchPortfolioAnalysis, triggerPortfolioAnalysis } from "#src/api/strategy";
import {
	BarChartOutlined,
	BulbOutlined,
	ClockCircleOutlined,
	ExperimentOutlined,
	FundProjectionScreenOutlined,
	LineChartOutlined,
	LoadingOutlined,
	ReloadOutlined,
	SafetyCertificateOutlined,
	ThunderboltOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
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
import React, { useCallback, useEffect, useState } from "react";

const { Text, Paragraph } = Typography;

/* ========== Colors & Configs ========== */

const GROWTH_COLORS: Record<string, string> = {
	高成长: "#f5222d",
	稳定成长: "#1890ff",
	周期型: "#faad14",
	价值型: "#722ed1",
	困境反转: "#eb2f96",
};

const MOAT_ICONS: Record<string, string> = {
	技术壁垒: "🔬",
	品牌优势: "👑",
	规模效应: "🏭",
	网络效应: "🌐",
	成本优势: "💰",
};

const DEBT_COLORS: Record<string, string> = {
	健康: "#52c41a",
	偏高: "#faad14",
	危险: "#f5222d",
};

const CASH_COLORS: Record<string, string> = {
	充裕: "#52c41a",
	一般: "#faad14",
	紧张: "#f5222d",
};

function fmtPnl(v: number): string {
	return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

/* ========== Mini Sparkline ========== */
const MiniSparkline: React.FC<{ prices: PortfolioStockAnalysis["prices_7d"] }> = ({ prices }) => {
	if (!prices || prices.length === 0)
		return <Text type="secondary" style={{ fontSize: 11 }}>无数据</Text>;

	const closes = prices.map(p => p.close || 0).filter(v => v > 0);
	if (closes.length < 2)
		return <Text type="secondary" style={{ fontSize: 11 }}>数据不足</Text>;

	const min = Math.min(...closes);
	const max = Math.max(...closes);
	const range = max - min || 1;
	const w = 120;
	const h = 32;
	const points = closes.map((v, i) => {
		const x = (i / (closes.length - 1)) * w;
		const y = h - ((v - min) / range) * (h - 4) - 2;
		return `${x},${y}`;
	}).join(" ");

	const trend = closes[closes.length - 1] >= closes[0];

	return (
		<svg width={w} height={h} style={{ display: "block" }}>
			<polyline
				points={points}
				fill="none"
				stroke={trend ? "#f5222d" : "#52c41a"}
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
};

/* ========== Stock Card ========== */
const StockAnalysisCard: React.FC<{ stock: PortfolioStockAnalysis }> = ({ stock }) => {
	const growthColor = GROWTH_COLORS[stock.growth_type] || "#8c8c8c";
	const debtColor = DEBT_COLORS[stock.financial_analysis?.debt_ratio_assessment] || "#8c8c8c";
	const cashColor = CASH_COLORS[stock.financial_analysis?.cash_flow_quality] || "#8c8c8c";

	return (
		<Card
			bordered={false}
			style={{
				borderRadius: 12,
				overflow: "hidden",
				height: "100%",
				boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
				transition: "all 0.3s ease",
			}}
			styles={{
				body: { padding: 0 },
			}}
			hoverable
		>
			{/* Header */}
			<div style={{
				background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
				padding: "14px 18px",
				color: "#fff",
			}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
					<div>
						<Text style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{stock.stock_name}</Text>
						<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginLeft: 6 }}>{stock.stock_code}</Text>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
							¥
							{stock.current_price?.toFixed(2) || "-"}
						</div>
						<div style={{
							fontSize: 12,
							color: stock.pnl_pct >= 0 ? "#ffa39e" : "#b7eb8f",
							fontWeight: 600,
						}}
						>
							{fmtPnl(stock.pnl_pct)}
							%
						</div>
					</div>
				</div>
				<div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
					<Tag style={{
						margin: 0,
						background: "rgba(255,255,255,0.2)",
						border: "none",
						color: "#fff",
						fontSize: 10,
						borderRadius: 3,
					}}
					>
						{stock.sector || "未知赛道"}
					</Tag>
					<Tag style={{
						margin: 0,
						background: growthColor,
						border: "none",
						color: "#fff",
						fontSize: 10,
						borderRadius: 3,
					}}
					>
						{stock.growth_type || "未知"}
					</Tag>
				</div>
			</div>

			{/* Body */}
			<div style={{ padding: "12px 18px" }}>
				{/* 主营业务 */}
				<div style={{ marginBottom: 10 }}>
					<Space size={4} style={{ marginBottom: 4 }}>
						<BulbOutlined style={{ color: "#faad14", fontSize: 12 }} />
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>主营业务</Text>
					</Space>
					<div>
						<Text style={{ fontSize: 12 }}>{stock.main_business || "-"}</Text>
					</div>
				</div>

				{/* 财务分析 */}
				<div style={{
					background: "#fafafa",
					borderRadius: 8,
					padding: "10px 12px",
					marginBottom: 10,
				}}
				>
					<Space size={4} style={{ marginBottom: 6 }}>
						<BarChartOutlined style={{ color: "#1890ff", fontSize: 12 }} />
						<Text style={{ fontSize: 11, fontWeight: 600 }}>财务分析</Text>
					</Space>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
						<div>
							<Text type="secondary" style={{ fontSize: 10 }}>营收</Text>
							<div><Text style={{ fontSize: 11 }}>{stock.financial_analysis?.revenue_trend || "-"}</Text></div>
						</div>
						<div>
							<Text type="secondary" style={{ fontSize: 10 }}>利润</Text>
							<div><Text style={{ fontSize: 11 }}>{stock.financial_analysis?.profit_trend || "-"}</Text></div>
						</div>
						<div>
							<Text type="secondary" style={{ fontSize: 10 }}>负债率</Text>
							<div>
								<Text style={{ fontSize: 11, color: debtColor, fontWeight: 600 }}>
									{stock.financial_analysis?.debt_ratio_assessment || "-"}
								</Text>
							</div>
						</div>
						<div>
							<Text type="secondary" style={{ fontSize: 10 }}>现金流</Text>
							<div>
								<Text style={{ fontSize: 11, color: cashColor, fontWeight: 600 }}>
									{stock.financial_analysis?.cash_flow_quality || "-"}
								</Text>
							</div>
						</div>
					</div>
				</div>

				{/* 护城河 */}
				<div style={{ marginBottom: 10 }}>
					<Space size={4} style={{ marginBottom: 4 }}>
						<SafetyCertificateOutlined style={{ color: "#722ed1", fontSize: 12 }} />
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>护城河</Text>
					</Space>
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						<Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
							{MOAT_ICONS[stock.moat] || "🏰"}
							{" "}
							{stock.moat || "未知"}
						</Tag>
					</div>
					<Paragraph style={{ fontSize: 11, color: "#595959", margin: "4px 0 0" }} ellipsis={{ rows: 2 }}>
						{stock.moat_detail || ""}
					</Paragraph>
				</div>

				{/* 成长性 */}
				<div style={{ marginBottom: 10 }}>
					<Space size={4} style={{ marginBottom: 4 }}>
						<ExperimentOutlined style={{ color: "#52c41a", fontSize: 12 }} />
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>成长性依据</Text>
					</Space>
					<div>
						<Text style={{ fontSize: 11 }}>{stock.growth_evidence || "-"}</Text>
					</div>
				</div>

				{/* 7日走势 */}
				<div style={{ marginBottom: 10 }}>
					<Space size={4} style={{ marginBottom: 4 }}>
						<LineChartOutlined style={{ color: "#1890ff", fontSize: 12 }} />
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>近7日走势</Text>
					</Space>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						<MiniSparkline prices={stock.prices_7d} />
						<Text style={{ fontSize: 11 }}>{stock.price_analysis || ""}</Text>
					</div>
				</div>

				{/* 风险因素 */}
				{stock.risk_factors && stock.risk_factors.length > 0 && (
					<div style={{ marginBottom: 10 }}>
						<Space size={4} style={{ marginBottom: 4 }}>
							<WarningOutlined style={{ color: "#faad14", fontSize: 12 }} />
							<Text style={{ fontSize: 11, color: "#8c8c8c" }}>风险因素</Text>
						</Space>
						<div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
							{stock.risk_factors.map(f => (
								<Tag key={`risk-${f}`} color="warning" style={{ margin: 0, fontSize: 10, borderRadius: 3 }}>{f}</Tag>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Footer: 操作指导 */}
			<div style={{
				background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
				padding: "10px 18px",
				borderTop: "1px solid rgba(255,255,255,0.05)",
			}}
			>
				<Space size={4} style={{ marginBottom: 4 }}>
					<ThunderboltOutlined style={{ color: "#faad14", fontSize: 12 }} />
					<Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>操作指导</Text>
				</Space>
				<Paragraph style={{
					fontSize: 12,
					color: "rgba(255,255,255,0.85)",
					margin: 0,
					lineHeight: "18px",
				}}
				>
					{stock.operation_guidance || "暂无指导"}
				</Paragraph>
			</div>
		</Card>
	);
};

/* ========== Main Panel ========== */
const PortfolioAnalysisPanel: React.FC = () => {
	const [data, setData] = useState<PortfolioAnalysisData | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await fetchPortfolioAnalysis();
			if (resp.status === "success" && resp.data) {
				setData(resp.data);
				setGeneratedAt(resp.data.generated_at || resp.generated_at || null);
			}
		}
		catch (e) {
			console.error("Failed to load portfolio analysis", e);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleGenerate = async () => {
		setGenerating(true);
		try {
			const resp = await triggerPortfolioAnalysis();
			if (resp.status === "success" && resp.data) {
				setData(resp.data);
				setGeneratedAt(resp.data.generated_at || null);
				message.success("持仓分析已生成");
			}
			else {
				message.error(resp.message || "生成失败");
			}
		}
		catch {
			message.error("生成持仓分析失败");
		}
		finally {
			setGenerating(false);
		}
	};

	if (loading) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
					<Spin size="large" tip="加载持仓分析..." />
				</div>
			</Card>
		);
	}

	const stocks = data?.stocks || [];
	const hasData = stocks.length > 0;

	// 计算平均盈亏
	const avgPnl = stocks.length > 0
		? stocks.reduce((sum, s) => sum + (s.pnl_pct || 0), 0) / stocks.length
		: 0;

	return (
		<>
			{/* Header Card */}
			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					marginTop: 20,
					overflow: "hidden",
					background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
				}}
				styles={{ body: { padding: "20px 28px" } }}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<Space size={12}>
						<FundProjectionScreenOutlined style={{ fontSize: 24, color: "#a78bfa" }} />
						<div>
							<Text style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>整体持仓分析</Text>
							<div>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
									基于理杏仁财务数据 + AI 深度分析
								</Text>
							</div>
						</div>
					</Space>
					<Space>
						{generatedAt && (
							<Tooltip title={`生成时间: ${generatedAt}`}>
								<Tag
									icon={<ClockCircleOutlined />}
									style={{
										background: "rgba(255,255,255,0.1)",
										border: "none",
										color: "rgba(255,255,255,0.6)",
										fontSize: 10,
									}}
								>
									{generatedAt}
								</Tag>
							</Tooltip>
						)}
						<Button
							icon={generating ? <LoadingOutlined /> : <ReloadOutlined />}
							loading={generating}
							onClick={handleGenerate}
							style={{
								background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
								border: "none",
								color: "#fff",
								borderRadius: 6,
								fontWeight: 600,
							}}
						>
							{hasData ? "重新分析" : "生成分析"}
						</Button>
					</Space>
				</div>

				{/* 总览 */}
				{hasData && (
					<Row gutter={24}>
						<Col span={6}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>持仓数量</Text>
								<div style={{ color: "#fff", fontSize: 24, fontWeight: 700 }}>{stocks.length}</div>
							</div>
						</Col>
						<Col span={6}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>平均盈亏</Text>
								<div style={{
									fontSize: 24,
									fontWeight: 700,
									color: avgPnl >= 0 ? "#ff7875" : "#95de64",
								}}
								>
									{fmtPnl(avgPnl)}
									%
								</div>
							</div>
						</Col>
						<Col span={6}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>盈利个股</Text>
								<div style={{ color: "#ff7875", fontSize: 24, fontWeight: 700 }}>
									{stocks.filter(s => (s.pnl_pct || 0) > 0).length}
								</div>
							</div>
						</Col>
						<Col span={6}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>亏损个股</Text>
								<div style={{ color: "#95de64", fontSize: 24, fontWeight: 700 }}>
									{stocks.filter(s => (s.pnl_pct || 0) < 0).length}
								</div>
							</div>
						</Col>
					</Row>
				)}

				{/* 整体总结 */}
				{data?.overall_summary && (
					<div style={{
						marginTop: 16,
						padding: "12px 16px",
						background: "rgba(255,255,255,0.06)",
						borderRadius: 8,
						borderLeft: "3px solid #a78bfa",
					}}
					>
						<Paragraph style={{
							color: "rgba(255,255,255,0.85)",
							fontSize: 13,
							margin: 0,
							lineHeight: "22px",
						}}
						>
							{data.overall_summary}
						</Paragraph>
					</div>
				)}
			</Card>

			{/* Generating State */}
			{generating && (
				<Card bordered={false} style={{ borderRadius: 12, marginTop: 16, textAlign: "center", padding: 40 }}>
					<Spin size="large" />
					<div style={{ marginTop: 16 }}>
						<Text type="secondary">正在生成持仓分析（获取财务数据 + AI 分析），请稍候...</Text>
					</div>
					<Progress percent={99} status="active" showInfo={false} style={{ maxWidth: 300, margin: "16px auto 0" }} />
				</Card>
			)}

			{/* No Data */}
			{!hasData && !generating && (
				<Card bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
					<Empty
						description="暂无持仓分析数据"
						image={Empty.PRESENTED_IMAGE_SIMPLE}
					>
						<Button
							type="primary"
							icon={<ThunderboltOutlined />}
							onClick={handleGenerate}
							loading={generating}
							style={{
								background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
								border: "none",
								borderRadius: 6,
							}}
						>
							立即生成分析
						</Button>
					</Empty>
				</Card>
			)}

			{/* Stock Cards Grid */}
			{hasData && !generating && (
				<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
					{stocks.map(stock => (
						<Col key={stock.stock_code} xs={24} md={12} xl={8}>
							<StockAnalysisCard stock={stock} />
						</Col>
					))}
				</Row>
			)}
		</>
	);
};

export default PortfolioAnalysisPanel;
