import type { PortfolioAnalysisData, PortfolioStockAnalysis } from "#src/api/strategy";
import { fetchPortfolioAnalysis, fetchPortfolioAnalysisJob, triggerPortfolioAnalysis } from "#src/api/strategy";
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
	Alert,
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

const CASH_COLORS: Record<string, string> = {
	充裕: "#52c41a",
	一般: "#faad14",
	紧张: "#f5222d",
};

function fmtPnl(v: number): string {
	return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

function fmtMetric(value?: number | null, suffix = "%"): string {
	return value == null || !Number.isFinite(value) ? "-" : `${value.toFixed(2)}${suffix}`;
}

function fmtMoney(value?: number | null): string {
	if (value == null || !Number.isFinite(value))
		return "-";
	const absoluteValue = Math.abs(value);
	const sign = value < 0 ? "-" : "";
	if (absoluteValue >= 1e8)
		return `${sign}${(absoluteValue / 1e8).toFixed(2)}亿`;
	if (absoluteValue >= 1e4)
		return `${sign}${(absoluteValue / 1e4).toFixed(2)}万`;
	return `${value.toFixed(0)}元`;
}

function joinText(values?: string[]): string {
	return values?.filter(Boolean).join("、") || "-";
}

function stockCurrency(stock: PortfolioStockAnalysis): "CNY" | "HKD" {
	if (stock.currency === "HKD" || stock.market === "hk" || /^\d{5}$/.test(stock.stock_code))
		return "HKD";
	return "CNY";
}

function currencySymbol(stock: PortfolioStockAnalysis): string {
	return stockCurrency(stock) === "HKD" ? "HK$" : "¥";
}

function currencyBreakdown(
	stocks: PortfolioStockAnalysis[],
	valueOf: (stock: PortfolioStockAnalysis) => number,
	options: { inWan?: boolean, signed?: boolean } = {},
): string {
	const totals = stocks.reduce((result, stock) => {
		const currency = stockCurrency(stock);
		result[currency] += valueOf(stock) || 0;
		return result;
	}, { CNY: 0, HKD: 0 });

	const values = (["CNY", "HKD"] as const)
		.filter(currency => Math.abs(totals[currency]) > 0)
		.map((currency) => {
			const raw = totals[currency];
			const scaled = options.inWan ? raw / 10000 : raw;
			const sign = options.signed ? (raw >= 0 ? "+" : "-") : "";
			const symbol = currency === "HKD" ? "HK$" : "¥";
			const amount = Math.abs(scaled);
			return `${sign}${symbol}${options.inWan ? amount.toFixed(1) : amount.toFixed(0)}${options.inWan ? "万" : ""}`;
		});
	return values.join(" / ") || "-";
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

/* ========== Three-framework research detail ========== */
const SkillAnalysisSection: React.FC<{ stock: PortfolioStockAnalysis }> = ({ stock }) => {
	const skill = stock.skill_analysis;
	if (!skill)
		return null;

	const v231 = skill.stock_v231_selector;
	const s5d = skill.s_quant_5d_subtraction;
	const s40 = skill.s40_tech_growth_stock;
	const domestic = v231?.domestic_substitution;
	const moat = v231?.competitor_moat;
	const periods = s5d?.latest_four_reported_periods || [];
	const s40Moat = s40?.true_technology_and_customer;
	const scoreItems = [
		{ label: "V2.3.1", score: v231?.score, note: v231?.strategy_label },
		{ label: "S五维", score: s5d?.score, note: s5d?.operating_world_conclusion },
		{ label: "S40科技", score: s40?.score, note: s40?.conclusion },
	];

	return (
		<div style={{
			border: "1px solid #d3adf7",
			borderRadius: 8,
			background: "linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)",
			marginBottom: 10,
			overflow: "hidden",
		}}
		>
			<div style={{ padding: "10px 12px", borderBottom: "1px solid #efdbff" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
					<Space size={4}>
						<FundProjectionScreenOutlined style={{ color: "#722ed1", fontSize: 13 }} />
						<Text style={{ fontSize: 12, fontWeight: 700, color: "#531dab" }}>三框架深度研判</Text>
					</Space>
					{skill.data_as_of && (
						<Text type="secondary" style={{ fontSize: 10 }}>
							数据截至
							{skill.data_as_of}
						</Text>
					)}
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
					{scoreItems.map(item => (
						<div key={item.label} style={{ padding: "6px 5px", textAlign: "center", borderRadius: 6, background: "#fff", border: "1px solid #efdbff" }}>
							<div style={{ color: "#8c8c8c", fontSize: 9 }}>{item.label}</div>
							<div style={{ color: "#722ed1", fontSize: 16, lineHeight: "20px", fontWeight: 800 }}>
								{item.score == null ? "-" : item.score}
								<span style={{ fontSize: 9, marginLeft: 1 }}>分</span>
							</div>
							<div style={{ color: "#595959", fontSize: 9, lineHeight: "13px" }}>{item.note || "-"}</div>
						</div>
					))}
				</div>
				{v231?.direct_action && (
					<div style={{ marginTop: 8, padding: "7px 9px", borderRadius: 6, background: "#f0e8ff", borderLeft: "3px solid #722ed1" }}>
						<Text style={{ fontSize: 11, color: "#391085", fontWeight: 600 }}>
							直接结论：
							{v231.direct_action}
						</Text>
					</div>
				)}
			</div>

			<details style={{ padding: "0 12px 10px" }}>
				<summary style={{ cursor: "pointer", padding: "9px 0 0", color: "#722ed1", fontSize: 11, fontWeight: 600 }}>
					展开查看每只股票的完整分析逻辑
				</summary>

				<div style={{ marginTop: 9 }}>
					<div style={{ background: "#fff", borderRadius: 7, border: "1px solid #e8e8e8", padding: "9px 10px", marginBottom: 8 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
							<Text style={{ fontSize: 11, fontWeight: 700, color: "#531dab" }}>V2.3.1｜风险门与利润池择优</Text>
							{skill.risk_gate?.status && (
								<Tag color={skill.risk_gate.status === "通过" ? "success" : "warning"} style={{ margin: 0, fontSize: 9 }}>
									风险门：
									{skill.risk_gate.status}
								</Tag>
							)}
							{v231?.recommendation_level && <Tag color="purple" style={{ margin: 0, fontSize: 9 }}>{v231.recommendation_level}</Tag>}
						</div>
						{domestic && (
							<div style={{ marginBottom: 7 }}>
								<Text style={{ fontSize: 10, fontWeight: 700 }}>卡脖子 / 国产替代：</Text>
								<Text style={{ fontSize: 10, lineHeight: "16px" }}>
									{domestic.bottleneck || "-"}
									；阶段为
									{domestic.stage || "-"}
									；海外对标
									{joinText(domestic.benchmarks)}
									。
									{domestic.judgement || ""}
								</Text>
								{domestic.score != null && (
									<Tag color="geekblue" style={{ margin: "0 0 0 4px", fontSize: 9 }}>
										{domestic.score}
										/20
									</Tag>
								)}
							</div>
						)}
						{moat && (
							<div style={{ fontSize: 10, lineHeight: "16px", marginBottom: 7 }}>
								<div>
									<Text strong style={{ fontSize: 10 }}>竞对：</Text>
									国内
									{" "}
									{joinText(moat.domestic)}
									；海外
									{" "}
									{joinText(moat.overseas)}
									；护城河
									{" "}
									{moat.grade || "-"}
									级
								</div>
								<div>
									<Text strong style={{ fontSize: 10 }}>我有你没有：</Text>
									{moat.unique || "-"}
								</div>
								<div>
									<Text strong style={{ fontSize: 10 }}>你有我更强：</Text>
									{moat.stronger || "-"}
								</div>
								<div>
									<Text strong style={{ fontSize: 10 }}>对手比我强：</Text>
									{moat.weaker || "-"}
								</div>
							</div>
						)}
						{v231?.new_strategic_business && (
							<div style={{ fontSize: 10, lineHeight: "16px", marginBottom: 5 }}>
								<Text strong style={{ fontSize: 10 }}>新战略业务：</Text>
								{v231.new_strategic_business}
							</div>
						)}
						{v231?.valuation_odds && (
							<div style={{ fontSize: 10, lineHeight: "16px", marginBottom: 6 }}>
								<Text strong style={{ fontSize: 10 }}>估值与赔率：</Text>
								{v231.valuation_odds}
							</div>
						)}
						{v231?.dimension_scores && v231.dimension_scores.length > 0 && (
							<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
								{v231.dimension_scores.map(item => (
									<Tag key={item.dimension} color={(item.score || 0) >= 70 ? "blue" : "default"} style={{ margin: 0, fontSize: 9 }}>
										{item.dimension}
										{" "}
										{item.score ?? "-"}
									</Tag>
								))}
							</div>
						)}
					</div>

					<div style={{ background: "#fff", borderRadius: 7, border: "1px solid #e8e8e8", padding: "9px 10px", marginBottom: 8 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
							<Text style={{ fontSize: 11, fontWeight: 700, color: "#096dd9" }}>S量化五维｜经营世界验证</Text>
							{s5d?.operating_world_conclusion && <Tag color="blue" style={{ margin: 0, fontSize: 9 }}>{s5d.operating_world_conclusion}</Tag>}
						</div>
						{s5d?.method && <Paragraph style={{ fontSize: 10, color: "#595959", lineHeight: "16px", margin: "0 0 6px" }}>{s5d.method}</Paragraph>}
						{periods.map(period => (
							<div key={period.period} style={{ fontSize: 10, lineHeight: "16px", padding: "5px 0", borderTop: "1px dashed #f0f0f0" }}>
								<Text strong style={{ fontSize: 10 }}>{period.period || "报告期"}</Text>
								：营收
								{" "}
								{fmtMoney(period.revenue_yuan)}
								（同比
								{" "}
								{fmtMetric(period.revenue_yoy_pct)}
								）；归母净利
								{" "}
								{fmtMoney(period.net_profit_yuan)}
								（同比
								{" "}
								{fmtMetric(period.net_profit_yoy_pct)}
								）；毛利率
								{" "}
								{fmtMetric(period.gross_margin_pct)}
								；净利率
								{" "}
								{fmtMetric(period.net_margin_pct)}
								；ROE
								{" "}
								{fmtMetric(period.roe_pct)}
								；经营现金流
								{" "}
								{fmtMoney(period.operating_cash_flow_yuan)}
								{period.margin_scope && (
									<Text type="secondary" style={{ fontSize: 9 }}>
										（
										{period.margin_scope}
										）
									</Text>
								)}
							</div>
						))}
						<div style={{ marginTop: 6, fontSize: 10, color: "#595959" }}>
							估值快照：
							{typeof s5d?.pe_ttm === "number" ? `PE(TTM) ${s5d.pe_ttm.toFixed(1)}倍` : "PE -"}
							，市值
							{" "}
							{s5d?.market_cap || "-"}
							；市值与PE仅展示，未进入默认量化评分。
						</div>
						{s5d?.limitations && s5d.limitations.length > 0 && (
							<div style={{ marginTop: 6, fontSize: 9, lineHeight: "14px", color: "#8c8c8c" }}>
								口径限制：
								{s5d.limitations.join("；")}
							</div>
						)}
					</div>

					<div style={{ background: "#fff", borderRadius: 7, border: "1px solid #e8e8e8", padding: "9px 10px", marginBottom: 8 }}>
						<div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
							<Text style={{ fontSize: 11, fontWeight: 700, color: "#389e0d" }}>S40科技成长｜九重真验证</Text>
							{s40?.applicability && <Tag color="green" style={{ margin: 0, fontSize: 9 }}>{s40.applicability}</Tag>}
						</div>
						<div style={{ fontSize: 10, lineHeight: "16px" }}>
							<div>
								<Text strong style={{ fontSize: 10 }}>真赛道：</Text>
								{s40?.true_track || "-"}
							</div>
							<div>
								<Text strong style={{ fontSize: 10 }}>真技术/真客户：</Text>
								{s40Moat?.unique || "-"}
								；
								{s40Moat?.stronger || "-"}
							</div>
							<div>
								<Text strong style={{ fontSize: 10 }}>真财务：</Text>
								{s40?.true_finance?.operating_conclusion || "-"}
							</div>
							<div>
								<Text strong style={{ fontSize: 10 }}>真估值：</Text>
								{s40?.true_valuation || "-"}
							</div>
							<div>
								<Text strong style={{ fontSize: 10 }}>真能力圈：</Text>
								{s40?.ability_circle || "-"}
							</div>
							<div>
								<Text strong style={{ fontSize: 10 }}>最终判断：</Text>
								{s40?.conclusion || "-"}
							</div>
						</div>
					</div>

					<div style={{ background: "#fff", borderRadius: 7, border: "1px solid #ffe7ba", padding: "9px 10px", marginBottom: 8 }}>
						<div style={{ fontSize: 10, lineHeight: "16px", marginBottom: 4 }}>
							<Text strong style={{ fontSize: 10, color: "#d46b08" }}>触发条件：</Text>
							{joinText(v231?.triggers || s40?.triggers)}
						</div>
						<div style={{ fontSize: 10, lineHeight: "16px" }}>
							<Text strong style={{ fontSize: 10, color: "#cf1322" }}>失效条件：</Text>
							{joinText(v231?.invalidations || s40?.failure_conditions)}
						</div>
					</div>

					{skill.sources && skill.sources.length > 0 && (
						<div style={{ fontSize: 9, lineHeight: "15px", color: "#8c8c8c" }}>
							数据/来源：
							{skill.sources.map((source, index) => (
								<React.Fragment key={`${source.name}-${source.url || source.as_of || "source"}`}>
									{index > 0 && "、"}
									{source.url
										? <a href={source.url} target="_blank" rel="noreferrer">{source.name || "原始来源"}</a>
										: source.name}
								</React.Fragment>
							))}
						</div>
					)}
				</div>
			</details>
		</div>
	);
};

/* ========== Stock Card ========== */
const StockAnalysisCard: React.FC<{ stock: PortfolioStockAnalysis }> = ({ stock }) => {
	const growthColor = GROWTH_COLORS[stock.growth_type] || "#8c8c8c";
	// PE 颜色：<15绿 15-30蓝 >30橙
	const peColor = stock.pe_ttm == null ? "#8c8c8c" : stock.pe_ttm < 15 ? "#52c41a" : stock.pe_ttm < 30 ? "#1890ff" : "#fa8c16";
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
							{currencySymbol(stock)}
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

				{/* 持仓信息条 */}
				<div style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr 1fr 1fr",
					gap: 4,
					marginTop: 10,
					background: "rgba(0,0,0,0.15)",
					borderRadius: 6,
					padding: "8px 10px",
				}}
				>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>成本价</div>
						<div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
							{stock.buy_price > 0 ? `${currencySymbol(stock)}${stock.buy_price.toFixed(2)}` : "-"}
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>持有</div>
						<div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
							{stock.buy_shares > 0 ? `${stock.buy_shares}股` : "-"}
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>市值</div>
						<div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
							{stock.current_price > 0 && stock.buy_shares > 0
								? `${currencySymbol(stock)}${(stock.current_price * stock.buy_shares).toFixed(0)}`
								: "-"}
						</div>
					</div>
					<div style={{ textAlign: "center" }}>
						<div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>盈亏</div>
						<div style={{
							fontSize: 13,
							fontWeight: 700,
							color: (stock.pnl_amount || 0) >= 0 ? "#ffa39e" : "#b7eb8f",
						}}
						>
							{stock.pnl_amount != null
								? `${stock.pnl_amount >= 0 ? "+" : "-"}${currencySymbol(stock)}${Math.abs(stock.pnl_amount).toFixed(0)}`
								: "-"}
						</div>
					</div>
				</div>

				<div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
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
					{stockCurrency(stock) === "HKD" && (
						<Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>港股 · HKD</Tag>
					)}
					{stock.quote_stale && (
						<Tooltip title={stock.quote_as_of ? `行情时间：${stock.quote_as_of}` : "实时行情不可用，当前展示最近收盘价"}>
							<Tag color="orange" style={{ margin: 0, fontSize: 10 }}>非实时行情</Tag>
						</Tooltip>
					)}
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
					{stock.action_verdict && (
						<Tag style={{
							margin: 0,
							fontSize: 12,
							fontWeight: 800,
							padding: "2px 12px",
							lineHeight: "20px",
							borderRadius: 4,
							background: stock.action_verdict === "买入"
								? "#ff4d4f"
								: stock.action_verdict === "卖出"
									? "#52c41a"
									: stock.action_verdict === "继续持有"
										? "#1890ff"
										: "#faad14",
							border: "none",
							color: "#fff",
						}}
						>
							{stock.action_verdict === "买入" ? "🔥 " : stock.action_verdict === "卖出" ? "⚠️ " : stock.action_verdict === "继续持有" ? "💎 " : "👀 "}
							{stock.action_verdict}
						</Tag>
					)}
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
							<Text type="secondary" style={{ fontSize: 10 }}>PE(TTM)</Text>
							<div>
								<Text style={{ fontSize: 11, color: peColor, fontWeight: 600 }}>
									{stock.pe_ttm != null ? stock.pe_ttm.toFixed(1) : "-"}
								</Text>
							</div>
						</div>
						<div>
							<Text type="secondary" style={{ fontSize: 10 }}>市值</Text>
							<div>
								<Text style={{ fontSize: 11, color: "#d46b08", fontWeight: 600 }}>
									{stock.total_market_cap || "-"}
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

				{/* 三套自研框架产出：增量展示，不改动原有分析区域 */}
				<SkillAnalysisSection stock={stock} />
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
				{stock.verdict_reason && (
					<div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 6, borderLeft: "3px solid #a78bfa" }}>
						<Text style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: "16px" }}>{stock.verdict_reason}</Text>
					</div>
				)}
			</div>
		</Card>
	);
};

/* ========== Main Panel ========== */
const PortfolioAnalysisPanel: React.FC = () => {
	const [data, setData] = useState<PortfolioAnalysisData | null>(null);
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);
	const [jobId, setJobId] = useState<string | null>(null);
	const [jobNotice, setJobNotice] = useState<string | null>(null);
	const [generatedAt, setGeneratedAt] = useState<string | null>(null);
	const [sentimentTrigger, setSentimentTrigger] = useState<any>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await fetchPortfolioAnalysis();
			if (resp.status === "success" && resp.data) {
				setData(resp.data);
				setGeneratedAt(resp.data.generated_at || resp.generated_at || null);
				setSentimentTrigger((resp as any).sentiment_trigger || null);
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
		let active = true;
		fetchPortfolioAnalysisJob().then((job) => {
			if (active && job.status === "running" && job.job_id) {
				setJobId(job.job_id);
				setGenerating(true);
			}
		}).catch(() => {});
		return () => {
			active = false;
		};
	}, [loadData]);

	useEffect(() => {
		if (!jobId)
			return;
		let active = true;
		let timer: ReturnType<typeof setTimeout>;
		const poll = async () => {
			try {
				const job = await fetchPortfolioAnalysisJob(jobId);
				if (!active)
					return;
				setJobNotice(null);
				if (job.status === "success" && job.data) {
					setData(job.data);
					setGeneratedAt(job.data.generated_at || null);
					setGenerating(false);
					setJobId(null);
					message.success("持仓分析已生成");
					return;
				}
				if (job.status !== "running") {
					setGenerating(false);
					setJobId(null);
					setJobNotice(job.message || "任务状态已失效，请刷新查看最新报告");
					return;
				}
			}
			catch {
				if (active)
					setJobNotice("暂时无法获取进度，正在重连；后台任务可能仍在运行，请勿重复提交。");
			}
			if (active)
				timer = setTimeout(poll, 5000);
		};
		poll();
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [jobId]);

	const handleGenerate = async () => {
		setGenerating(true);
		setJobNotice(null);
		try {
			const resp = await triggerPortfolioAnalysis();
			if (resp.status === "running" && resp.job_id) {
				setJobId(resp.job_id);
				return;
			}
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
			try {
				const job = await fetchPortfolioAnalysisJob();
				if (job.status === "running" && job.job_id) {
					setJobId(job.job_id);
					return;
				}
			}
			catch { /* Keep submission uncertainty visible; do not auto-resubmit. */ }
			setJobNotice("提交结果未确认，请刷新检查后台任务或最新报告后再重试。");
		}
		setGenerating(false);
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
	const totalCost = currencyBreakdown(
		stocks,
		stock => (stock.buy_price || 0) * (stock.buy_shares || 0),
		{ inWan: true },
	);
	const totalValue = currencyBreakdown(
		stocks,
		stock => (stock.current_price || 0) * (stock.buy_shares || 0),
		{ inWan: true },
	);
	const totalPnl = currencyBreakdown(
		stocks,
		stock => stock.pnl_amount || 0,
		{ signed: true },
	);

	return (
		<>
			{/* Header Card */}
			{generating && <Alert type="info" showIcon message="正在后台生成持仓分析，通常需要数分钟。完成后自动更新，刷新页面也可继续查看进度。" style={{ marginTop: 16 }} />}
			{jobNotice && <Alert type="warning" showIcon message={jobNotice} style={{ marginTop: 16 }} />}
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
					<Row gutter={16}>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>持仓数量</Text>
								<div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>{stocks.length}</div>
							</div>
						</Col>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>分币种总成本</Text>
								<div style={{ color: "#fff", fontSize: 17, fontWeight: 700 }}>
									{totalCost}
								</div>
							</div>
						</Col>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>分币种总市值</Text>
								<div style={{ color: "#e0d4ff", fontSize: 17, fontWeight: 700 }}>
									{totalValue}
								</div>
							</div>
						</Col>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>分币种总盈亏</Text>
								<div style={{
									fontSize: 17,
									fontWeight: 700,
									color: "#e0d4ff",
								}}
								>
									{totalPnl}
								</div>
							</div>
						</Col>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>平均盈亏</Text>
								<div style={{
									fontSize: 22,
									fontWeight: 700,
									color: avgPnl >= 0 ? "#ff7875" : "#95de64",
								}}
								>
									{fmtPnl(avgPnl)}
									%
								</div>
							</div>
						</Col>
						<Col span={4}>
							<div style={{ textAlign: "center" }}>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>盈/亏</Text>
								<div style={{ fontSize: 22, fontWeight: 700 }}>
									<span style={{ color: "#ff7875" }}>{stocks.filter(s => (s.pnl_pct || 0) > 0).length}</span>
									<span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>/</span>
									<span style={{ color: "#95de64" }}>{stocks.filter(s => (s.pnl_pct || 0) < 0).length}</span>
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

			{/* 盘前情绪预警触发标记 */}
			{sentimentTrigger && sentimentTrigger.triggered_by_sentiment && (
				<Alert
					style={{ marginTop: 16, borderRadius: 10 }}
					type={sentimentTrigger.risk_level === "high" || sentimentTrigger.risk_level === "extreme" ? "error" : "warning"}
					showIcon
					icon={<WarningOutlined />}
					message={(
						<Space wrap>
							<Text strong>🛡️ 盘前预警触发刷新</Text>
							<Tag color={sentimentTrigger.risk_level === "high" || sentimentTrigger.risk_level === "extreme" ? "red" : "orange"}>
								风险:
								{" "}
								{sentimentTrigger.risk_level}
							</Tag>
						</Space>
					)}
					description={(
						<>
							{sentimentTrigger.advice && (
								<div>
									💡
									{sentimentTrigger.advice}
								</div>
							)}
							{sentimentTrigger.trigger_reason && (
								<div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
									触发原因:
									{" "}
									{sentimentTrigger.trigger_reason}
								</div>
							)}
							{sentimentTrigger.triggered_at && (
								<div style={{ marginTop: 2, fontSize: 11, color: "#bfbfbf" }}>
									触发时间:
									{" "}
									{sentimentTrigger.triggered_at}
								</div>
							)}
						</>
					)}
				/>
			)}

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
