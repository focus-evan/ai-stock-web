import type { PortfolioAnalysisData, PortfolioStockAnalysis } from "#src/api/strategy";
import { fetchPortfolioAnalysis, fetchPortfolioAnalysisJob, triggerPortfolioAnalysis } from "#src/api/strategy";
import {
	ClockCircleOutlined,
	FundProjectionScreenOutlined,
	LoadingOutlined,
	ReloadOutlined,
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

function fmtPnl(v: number): string {
	return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

function fmtMetric(value?: number | null, suffix = "%"): string {
	return value == null || !Number.isFinite(value) ? "-" : `${value.toFixed(2)}${suffix}`;
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
export const ShortTermSection: React.FC<{ stock: PortfolioStockAnalysis }> = ({ stock }) => {
	const t = stock.short_term;
	if (!t) {
		return <Alert type="info" showIcon message="这是旧版基本面报告，请点击重新分析生成短线解析。" />;
	}
	const price = (v: number | null) => v == null ? "数据不足" : `${currencySymbol(stock)}${v.toFixed(3)}`;
	return (
		<div style={{ fontSize: 12, lineHeight: 1.7 }}>
			<Text strong>短线价量解析</Text>
			<div style={{ color: "#8c8c8c", margin: "4px 0 12px" }}>
				{t.timeframe}
				{" "}
				· 收盘截至
				{t.as_of || "未知"}
				{" "}
				·
				{t.bar_count}
				{" "}
				根日线
				<br />
				分析收盘价
				{" "}
				{price(t.close)}
				{" "}
				·
				{" "}
				{t.adjustment === "qfq" ? "前复权" : t.adjustment === "raw" ? "不复权" : "复权口径未知"}
				<br />
				顶部报价与日线分析时间独立；以下均线位置按分析收盘价判断。
			</div>
			{t.status !== "ready" && <Alert type="warning" showIcon message="日线待更新或核验，不能确认当前交易信号" style={{ marginBottom: 12 }} />}
			<div style={{ background: "#fafafa", borderRadius: 8, padding: 12, marginBottom: 12 }}>
				<Text strong>是否站上均线</Text>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
					{t.moving_averages.map(ma => (
						<div key={ma.period}>
							<div>
								MA
								{ma.period}
								{" "}
								·
								{price(ma.value)}
							</div>
							<Tag color={ma.position === "站上" ? "blue" : ma.position === "跌破" ? "orange" : "default"}>{ma.position}</Tag>
							<span>{ma.slope}</span>
						</div>
					))}
				</div>
				<div style={{ marginTop: 8 }}>
					MA16 乖离：
					{fmtMetric(t.bias16_pct)}
				</div>
			</div>
			<div style={{ background: "#f0f5ff", borderRadius: 8, padding: 12, marginBottom: 12 }}>
				<Text strong>量能与关键价位</Text>
				<div>
					相对前 5 日均量：
					{fmtMetric(t.volume_ratio_5, " 倍")}
					{" "}
					·
					{t.volume_label}
				</div>
				<div style={{ color: "#8c8c8c" }}>本日完整成交量 ÷ 前 5 日均量，不含本日；不是盘中量比。</div>
				<div>
					前 20 日高点：
					{price(t.resistance_20)}
				</div>
				<div>
					前 5 日低点：
					{price(t.support_5)}
				</div>
				<div>
					ATR14：
					{price(t.atr14)}
				</div>
				<div>
					收盘价 − 1.5×ATR：
					{price(t.atr_reference)}
				</div>
				<div style={{ color: "#8c8c8c" }}>高低点均不含本日；ATR 线只作波动风险参考。</div>
			</div>
			{t.signals.map(signal => (
				<div key={signal.name} style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 0" }}>
					<Text strong>{signal.name}</Text>
					<Tag style={{ marginLeft: 6 }} color={signal.state === "风险触发" ? "red" : signal.state === "条件成立" ? "blue" : "default"}>{signal.state}</Tag>
					<div style={{ marginTop: 6 }}>{signal.evidence}</div>
					<div style={{ marginTop: 6 }}>
						<Text strong>触发条件：</Text>
						{signal.trigger}
					</div>
					<div style={{ marginTop: 6 }}>
						<Text strong type="danger">失效条件：</Text>
						{signal.invalidation}
					</div>
				</div>
			))}
			{t.warnings.length > 0 && (
				<div style={{ marginTop: 12, color: "#ad6800" }}>
					{t.warnings.map(w => (
						<div key={w}>
							•
							{w}
						</div>
					))}
				</div>
			)}
			<details style={{ marginTop: 12, color: "#8c8c8c" }}>
				<summary>方法依据与数据口径</summary>
				<div>{t.rule_note}</div>
				<div>
					行情来源：
					{t.source}
				</div>
				{t.sources.map(source => <div key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></div>)}
			</details>
		</div>
	);
};

/* ========== Stock Card ========== */
const StockAnalysisCard: React.FC<{ stock: PortfolioStockAnalysis }> = ({ stock }) => {
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
						{stock.short_term ? "短线日线解析" : "旧版报告"}
					</Tag>
					{stockCurrency(stock) === "HKD" && (
						<Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>港股 · HKD</Tag>
					)}
					{stock.quote_stale && (
						<Tooltip title={stock.quote_as_of ? `行情时间：${stock.quote_as_of}` : "实时行情不可用，当前展示最近收盘价"}>
							<Tag color="orange" style={{ margin: 0, fontSize: 10 }}>非实时行情</Tag>
						</Tooltip>
					)}
					{stock.short_term && stock.action_verdict && (
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
				<ShortTermSection stock={stock} />
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
					{stock.short_term?.guidance || "重新分析后查看短线触发与失效条件"}
				</Paragraph>
				{stock.short_term && stock.verdict_reason && (
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
									日线价量计算 · 均线趋势 / 量价确认 / ATR 风险
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
						<Text type="secondary">正在生成短线解析（获取日线 + 计算量价指标），请稍候...</Text>
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
