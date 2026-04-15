import type { StockAnalysisData, StrategySignal } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { deleteAnalysisRecord, fetchAnalysisDetail, fetchAnalysisHistory, fetchStockAnalysis } from "#src/api/strategy";
import PortfolioAnalysisPanel from "#src/components/PortfolioAnalysisPanel";
import WatchlistModal from "#src/components/WatchlistModal";
import WatchlistPanel from "#src/components/WatchlistPanel";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	DashboardOutlined,
	DeleteOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	FireOutlined,
	FundOutlined,
	FundProjectionScreenOutlined,
	HistoryOutlined,
	InfoCircleOutlined,
	LineChartOutlined,
	ReloadOutlined,
	SafetyOutlined,
	SearchOutlined,
	StarOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Divider,
	Empty,
	Input,
	message,
	Modal,
	Pagination,
	Popconfirm,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tabs,
	Tag,
	Typography,
} from "antd";
import React, { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

const actionConfig: Record<string, { color: string, bg: string, icon: React.ReactNode }> = {
	买入: { color: "#f5222d", bg: "linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)", icon: <ArrowUpOutlined /> },
	持有: { color: "#1890ff", bg: "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)", icon: <InfoCircleOutlined /> },
	卖出: { color: "#52c41a", bg: "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)", icon: <ArrowDownOutlined /> },
	观望: { color: "#faad14", bg: "linear-gradient(135deg, #faad14 0%, #ffc53d 100%)", icon: <ExclamationCircleOutlined /> },
};

const signalConfig: Record<string, { color: string, tag: string }> = {
	看多: { color: "#f5222d", tag: "red" },
	看空: { color: "#52c41a", tag: "green" },
	中性: { color: "#faad14", tag: "orange" },
	无数据: { color: "#8c8c8c", tag: "default" },
};

function directionTag(d?: string) {
	if (d === "看涨") {
		return (
			<Tag color="red">
				<ArrowUpOutlined />
				{" "}
				看涨
			</Tag>
		);
	}
	if (d === "看跌") {
		return (
			<Tag color="green">
				<ArrowDownOutlined />
				{" "}
				看跌
			</Tag>
		);
	}
	return (
		<Tag color="orange">
			<DashboardOutlined />
			{" "}
			震荡
		</Tag>
	);
}

/* ====================== InfoCard ====================== */
function InfoCard({ icon, title, children }: {
	icon: React.ReactNode
	title: string
	children: React.ReactNode
}) {
	return (
		<Card size="small" style={{ borderRadius: 10, height: "100%" }} bodyStyle={{ padding: "16px 20px" }}>
			<Space style={{ marginBottom: 10 }}>
				{icon}
				<Text strong style={{ fontSize: 14 }}>{title}</Text>
			</Space>
			<div>{children}</div>
		</Card>
	);
}

/* ====================== Analysis Result Display ====================== */
function AnalysisResultView({ data }: { data: StockAnalysisData }) {
	const act = actionConfig[data.action] || actionConfig["观望"];
	const [watchlistOpen, setWatchlistOpen] = useState(false);

	const strategyColumns: ColumnsType<StrategySignal> = [
		{ title: "战法", dataIndex: "strategy", key: "strategy", width: 100, render: (n: string) => <Text strong>{n}</Text> },
		{
			title: "信号",
			dataIndex: "signal",
			key: "signal",
			width: 80,
			align: "center",
			render: (s: string) => {
				const cfg = signalConfig[s] || signalConfig["无数据"];
				return <Tag color={cfg.tag} style={{ fontWeight: "bold" }}>{s}</Tag>;
			},
		},
		{ title: "分析详情", dataIndex: "detail", key: "detail", render: (d: string) => <Text style={{ fontSize: 13 }}>{d}</Text> },
	];

	return (
		<>
			{/* Hero Card */}
			<Card bordered={false} style={{ marginBottom: 16, borderRadius: 12, background: act.bg }} bodyStyle={{ padding: "24px 32px" }}>
				<Row gutter={[32, 16]} align="middle">
					<Col xs={24} sm={8} style={{ textAlign: "center" }}>
						<div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 100, height: 100, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", flexDirection: "column" }}>
							<span style={{ fontSize: 32, color: "#fff" }}>{act.icon}</span>
							<Text style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginTop: 2 }}>{data.action}</Text>
						</div>
						<div style={{ marginTop: 8 }}>
							{(data as any).market === "hk"
								? (
									<Tag color="#c41d7f" style={{ fontWeight: 600 }}>🇭🇰 港股</Tag>
								)
								: (
									<Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
										命中
										{data.strategies_hit}
										/
										{data.strategies_total}
										{" "}
										策略
									</Text>
								)}
						</div>
					</Col>
					<Col xs={24} sm={16}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
							<Title level={3} style={{ color: "#fff", margin: 0 }}>
								{data.stock_name}
								{" "}
								(
								{data.stock_code}
								)
								{(data as any).market === "hk" && <Tag color="magenta" style={{ marginLeft: 8, verticalAlign: "middle" }}>港股</Tag>}
							</Title>
							<Button
								size="small"
								icon={<StarOutlined />}
								style={{
									background: "rgba(255,255,255,0.2)",
									border: "1px solid rgba(255,255,255,0.5)",
									color: "#fff",
									marginLeft: 12,
									flexShrink: 0,
								}}
								onClick={() => setWatchlistOpen(true)}
							>
								加入自选盯盘
							</Button>
						</div>
						<Row gutter={24} style={{ marginTop: 12 }}>
							<Col span={6}><Statistic title={<Text style={{ color: "rgba(255,255,255,0.7)" }}><span title="分析执行时刻的价格快照，非实时报价">分析时价 ℹ️</span></Text>} value={data.current_price || "-"} valueStyle={{ color: "#fff", fontSize: 22 }} /></Col>
							<Col span={6}><Statistic title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>涨跌幅</Text>} value={data.change_pct || 0} precision={2} suffix="%" valueStyle={{ color: "#fff", fontSize: 22 }} prefix={(data.change_pct || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} /></Col>
							<Col span={6}><Statistic title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>评分</Text>} value={data.score} suffix="/100" valueStyle={{ color: "#fff", fontSize: 22 }} /></Col>
							<Col span={6}><Statistic title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>置信度</Text>} value={data.confidence} suffix="%" valueStyle={{ color: "#fff", fontSize: 22 }} /></Col>
						</Row>
						<Row gutter={24} style={{ marginTop: 8 }}>
							{data.pe_ttm != null && (
								<Col span={6}>
									<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
										PE(TTM):
										<span style={{ color: "#fff", fontWeight: 600 }}>{data.pe_ttm}</span>
									</Text>
								</Col>
							)}
							{data.pb != null && (
								<Col span={6}>
									<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
										PB:
										<span style={{ color: "#fff", fontWeight: 600 }}>{data.pb}</span>
									</Text>
								</Col>
							)}
							{data.total_market_cap && (
								<Col span={6}>
									<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
										总市值:
										<span style={{ color: "#fff", fontWeight: 600 }}>{data.total_market_cap}</span>
									</Text>
								</Col>
							)}
							{data.industry && (
								<Col span={6}>
									<Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
										行业:
										<span style={{ color: "#fff", fontWeight: 600 }}>{data.industry}</span>
									</Text>
								</Col>
							)}
						</Row>
					</Col>
				</Row>
			</Card>

			{/* 展望+买卖点 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} md={6}>
					<InfoCard icon={<ThunderboltOutlined style={{ color: "#f5222d" }} />} title="短期展望(1-2周)">
						{directionTag(data.short_term_outlook?.direction)}
						{data.short_term_outlook?.target_price
							? (
								<div style={{ margin: "8px 0" }}>
									<Text type="secondary">目标价: </Text>
									<Text strong style={{ fontSize: 18, color: "#f5222d" }}>{data.short_term_outlook.target_price}</Text>
								</div>
							)
							: null}
						<Paragraph style={{ fontSize: 13, margin: 0 }}>{data.short_term_outlook?.detail || "暂无"}</Paragraph>
					</InfoCard>
				</Col>
				<Col xs={24} md={6}>
					<InfoCard icon={<FundOutlined style={{ color: "#722ed1" }} />} title="长期展望(3-6月)">
						{directionTag(data.long_term_outlook?.direction)}
						{data.long_term_outlook?.target_price
							? (
								<div style={{ margin: "8px 0" }}>
									<Text type="secondary">目标价: </Text>
									<Text strong style={{ fontSize: 18, color: "#722ed1" }}>{data.long_term_outlook.target_price}</Text>
								</div>
							)
							: null}
						<Paragraph style={{ fontSize: 13, margin: 0 }}>{data.long_term_outlook?.detail || "暂无"}</Paragraph>
					</InfoCard>
				</Col>
				<Col xs={24} md={6}>
					<InfoCard icon={<ArrowUpOutlined style={{ color: "#52c41a" }} />} title="买入价位">
						{data.buy_point?.price_low || data.buy_point?.price_high
							? (
								<div>
									<Text strong style={{ fontSize: 20, color: "#52c41a" }}>
										{data.buy_point.price_low}
										{" "}
										-
										{" "}
										{data.buy_point.price_high}
									</Text>
								</div>
							)
							: <Text type="secondary">-</Text>}
						<Paragraph style={{ fontSize: 13, margin: "4px 0 0" }}>{data.buy_point?.description || ""}</Paragraph>
						<Divider style={{ margin: "8px 0" }} />
						<Text type="secondary" style={{ fontSize: 12 }}>止损: </Text>
						<Text style={{ color: "#f5222d", fontWeight: 600 }}>{data.stop_loss?.price || "-"}</Text>
						<div><Text type="secondary" style={{ fontSize: 11 }}>{data.stop_loss?.description || ""}</Text></div>
					</InfoCard>
				</Col>
				<Col xs={24} md={6}>
					<InfoCard icon={<ArrowDownOutlined style={{ color: "#f5222d" }} />} title="卖出价位">
						{data.sell_point?.price_low || data.sell_point?.price_high
							? (
								<div>
									<Text strong style={{ fontSize: 20, color: "#f5222d" }}>
										{data.sell_point.price_low}
										{" "}
										-
										{" "}
										{data.sell_point.price_high}
									</Text>
								</div>
							)
							: <Text type="secondary">-</Text>}
						<Paragraph style={{ fontSize: 13, margin: "4px 0 0" }}>{data.sell_point?.description || ""}</Paragraph>
						<Divider style={{ margin: "8px 0" }} />
						<Text type="secondary" style={{ fontSize: 12 }}>仓位建议: </Text>
						<Text style={{ fontWeight: 600 }}>{data.position_advice || "-"}</Text>
						<div>
							<Tag color={data.risk_level === "高" ? "red" : data.risk_level === "低" ? "green" : "orange"}>
								风险:
								{data.risk_level}
							</Tag>
						</div>
					</InfoCard>
				</Col>
			</Row>

			{/* 风险/利好/K线 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} md={8}>
					<InfoCard icon={<WarningOutlined style={{ color: "#f5222d" }} />} title="风险因素">
						{(data.risk_factors && data.risk_factors.length > 0)
							? data.risk_factors.map((f, i) => (
								<div key={i} style={{ padding: "4px 0" }}>
									<Text style={{ fontSize: 13 }}>
										⚠️
										{f}
									</Text>
								</div>
							))
							: <Text type="secondary">暂无风险提示</Text>}
					</InfoCard>
				</Col>
				<Col xs={24} md={8}>
					<InfoCard icon={<BulbOutlined style={{ color: "#52c41a" }} />} title="利好因素">
						{(data.positive_factors && data.positive_factors.length > 0)
							? data.positive_factors.map((f, i) => (
								<div key={i} style={{ padding: "4px 0" }}>
									<Text style={{ fontSize: 13 }}>
										✅
										{f}
									</Text>
								</div>
							))
							: <Text type="secondary">暂无</Text>}
					</InfoCard>
				</Col>
				<Col xs={24} md={8}>
					<InfoCard icon={<LineChartOutlined style={{ color: "#1890ff" }} />} title="K线技术分析">
						{data.kline_analysis?.trend && (
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary">趋势: </Text>
								<Tag color={data.kline_analysis.trend === "上升" ? "red" : data.kline_analysis.trend === "下降" ? "green" : "orange"}>{data.kline_analysis.trend}</Tag>
							</div>
						)}
						{data.kline_analysis?.pattern && (
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary">形态: </Text>
								<Tag color="blue">{data.kline_analysis.pattern}</Tag>
							</div>
						)}
						<Paragraph style={{ fontSize: 13, margin: 0 }}>{data.kline_analysis?.detail || "暂无"}</Paragraph>
					</InfoCard>
				</Col>
			</Row>

			{/* 行业/基本面/财报 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col xs={24} md={8}>
					<InfoCard icon={<TrophyOutlined style={{ color: "#faad14" }} />} title="行业/赛道分析">
						{data.industry_analysis?.industry && (
							<div>
								<Text type="secondary">行业: </Text>
								<Tag color="gold">{data.industry_analysis.industry}</Tag>
							</div>
						)}
						{data.industry_analysis?.sector && (
							<div style={{ marginTop: 4 }}>
								<Text type="secondary">赛道: </Text>
								<Tag color="purple">{data.industry_analysis.sector}</Tag>
							</div>
						)}
						{data.industry_analysis?.industry_outlook && (
							<div style={{ marginTop: 8 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>前景: </Text>
								<Text style={{ fontSize: 13 }}>{data.industry_analysis.industry_outlook}</Text>
							</div>
						)}
						{data.industry_analysis?.position && (
							<div style={{ marginTop: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>地位: </Text>
								<Text style={{ fontSize: 13 }}>{data.industry_analysis.position}</Text>
							</div>
						)}
					</InfoCard>
				</Col>
				<Col xs={24} md={8}>
					<InfoCard icon={<SafetyOutlined style={{ color: "#1890ff" }} />} title="基本面分析">
						{data.fundamental_analysis?.moat && (
							<div style={{ marginBottom: 6 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>🏰 护城河: </Text>
								<Text style={{ fontSize: 13 }}>{data.fundamental_analysis.moat}</Text>
							</div>
						)}
						{data.fundamental_analysis?.competitive_advantage && (
							<div style={{ marginBottom: 6 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>⚡ 竞争优势: </Text>
								<Text style={{ fontSize: 13 }}>{data.fundamental_analysis.competitive_advantage}</Text>
							</div>
						)}
						<Paragraph style={{ fontSize: 13, margin: 0 }}>{data.fundamental_analysis?.detail || "暂无"}</Paragraph>
					</InfoCard>
				</Col>
				<Col xs={24} md={8}>
					<InfoCard icon={<EyeOutlined style={{ color: "#52c41a" }} />} title="财报摘要">
						{data.financial_summary?.revenue_trend && (
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>营收: </Text>
								<Text style={{ fontSize: 13 }}>{data.financial_summary.revenue_trend}</Text>
							</div>
						)}
						{data.financial_summary?.profit_trend && (
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>利润: </Text>
								<Text style={{ fontSize: 13 }}>{data.financial_summary.profit_trend}</Text>
							</div>
						)}
						{data.financial_summary?.growth && (
							<div style={{ marginBottom: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>成长性: </Text>
								<Text style={{ fontSize: 13 }}>{data.financial_summary.growth}</Text>
							</div>
						)}
						<Paragraph style={{ fontSize: 13, margin: 0 }}>{data.financial_summary?.detail || "暂无"}</Paragraph>
					</InfoCard>
				</Col>
			</Row>

			{/* 七大战法（港股隐藏） */}
			{data.strategy_analysis && data.strategy_analysis.length > 0 && (
				<Card
					title={(
						<Space>
							<FireOutlined style={{ color: "#f5222d" }} />
							<Text strong>七大战法分析</Text>
							<Tag color={data.strategies_hit >= 4 ? "red" : data.strategies_hit >= 2 ? "orange" : "default"}>
								{data.strategies_hit}
								/
								{data.strategies_total}
								{" "}
								命中
							</Tag>
						</Space>
					)}
					style={{ marginBottom: 16, borderRadius: 8 }}
				>
					<Table<StrategySignal> dataSource={data.strategy_analysis} columns={strategyColumns} rowKey="strategy" size="small" pagination={false} />
				</Card>
			)}

			{/* 综合报告 */}
			<Card
				title={(
					<Space>
						<DashboardOutlined style={{ color: "#722ed1" }} />
						<Text strong>综合深度分析报告</Text>
						{data.llm_enhanced && <Tag color="geekblue" icon={<CheckCircleOutlined />}>AI</Tag>}
					</Space>
				)}
				style={{ marginBottom: 16, borderRadius: 12, background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", border: "1px solid rgba(255,255,255,0.08)" }}
				bodyStyle={{ padding: "24px 32px" }}
				bordered={false}
			>
				<Paragraph style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 2, whiteSpace: "pre-wrap", margin: 0 }}>
					{data.summary || "暂无分析报告"}
				</Paragraph>
				<div style={{ marginTop: 12, textAlign: "right" }}>
					<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
						分析时间:
						{data.analyzed_at}
						{" "}
						| 日期:
						{data.market_date}
					</Text>
				</div>
			</Card>

			{/* 加入自选盯盘 Modal */}
			<WatchlistModal
				open={watchlistOpen}
				onClose={() => setWatchlistOpen(false)}
				onSuccess={() => setWatchlistOpen(false)}
				stockCode={(data as any).stock_code || ""}
				stockName={(data as any).stock_name || ""}
				strategies={[]}
				strategyNames={[]}
				overlapCount={1}
				suggestedBuyPrice={(data as any).current_price || undefined}
			/>
		</>
	);
}

/* ====================== History Tab ====================== */
function HistoryTab() {
	const [items, setItems] = useState<any[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [detail, setDetail] = useState<StockAnalysisData | null>(null);
	const [detailVisible, setDetailVisible] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [watchlistTarget, setWatchlistTarget] = useState<{ code: string, name: string, price?: number } | null>(null);

	const loadHistory = useCallback(async (p: number) => {
		setLoading(true);
		try {
			const res = await fetchAnalysisHistory({ page: p, page_size: 20 });
			if (res.status === "success") {
				setItems(res.data.items);
				setTotal(res.data.total);
				setPage(p);
			}
		}
		catch {
			message.error("加载历史记录失败");
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadHistory(1);
	}, [loadHistory]);

	const viewDetail = async (id: number) => {
		setDetailLoading(true);
		setDetailVisible(true);
		try {
			const res = await fetchAnalysisDetail(id);
			if (res.status === "success" && res.data?.analysis_data) {
				setDetail(res.data.analysis_data as StockAnalysisData);
			}
			else {
				message.error("加载详情失败");
				setDetailVisible(false);
			}
		}
		catch {
			message.error("加载详情失败");
			setDetailVisible(false);
		}
		finally {
			setDetailLoading(false);
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await deleteAnalysisRecord(id);
			message.success("删除成功");
			loadHistory(page);
		}
		catch {
			message.error("删除失败");
		}
	};

	const actionColor = (a: string) => a === "买入" ? "red" : a === "持有" ? "blue" : a === "卖出" ? "green" : "orange";
	const riskColor = (r: string) => r === "高" ? "red" : r === "低" ? "green" : "orange";

	const columns: ColumnsType<any> = [
		{
			title: "股票",
			key: "stock",
			width: 140,
			render: (_, r) => (
				<>
					<Text strong>{r.stock_name}</Text>
					<br />
					<Text type="secondary" style={{ fontSize: 12 }}>{r.stock_code}</Text>
				</>
			),
		},
		{
			title: "建议",
			dataIndex: "action",
			key: "action",
			width: 80,
			align: "center",
			render: (a: string) => <Tag color={actionColor(a)} style={{ fontWeight: 600 }}>{a}</Tag>,
		},
		{
			title: "评分",
			dataIndex: "score",
			key: "score",
			width: 70,
			align: "center",
			render: (s: number) => <Text strong style={{ color: s >= 70 ? "#f5222d" : s >= 40 ? "#faad14" : "#8c8c8c" }}>{s}</Text>,
		},
		{
			title: "分析时价",
			dataIndex: "current_price",
			key: "price",
			width: 90,
			align: "right",
			render: (v: any) => v
				? (
					<span title="分析执行时刻的价格快照，非实时报价">
						<Text>{Number(v).toFixed(2)}</Text>
					</span>
				)
				: "-",
		},
		{
			title: "涨跌幅",
			dataIndex: "change_pct",
			key: "change",
			width: 80,
			align: "right",
			render: (v: any) => {
				const n = Number(v);
				return v != null
					? (
						<Text style={{ color: n >= 0 ? "#f5222d" : "#52c41a" }}>
							{n >= 0 ? "+" : ""}
							{n.toFixed(2)}
							%
						</Text>
					)
					: "-";
			},
		},
		{
			title: "风险",
			dataIndex: "risk_level",
			key: "risk",
			width: 60,
			align: "center",
			render: (r: string) => <Tag color={riskColor(r)}>{r}</Tag>,
		},
		{
			title: "策略",
			key: "hit",
			width: 70,
			align: "center",
			render: (_, r) => <Badge count={`${r.strategies_hit}/${r.strategies_total}`} style={{ backgroundColor: r.strategies_hit >= 3 ? "#f5222d" : "#1890ff" }} />,
		},
		{
			title: "行业",
			dataIndex: "industry",
			key: "ind",
			width: 100,
			ellipsis: true,
			render: (v: string) => v || "-",
		},
		{
			title: "分析时间",
			dataIndex: "analyzed_at",
			key: "time",
			width: 150,
			render: (t: string) => <Text type="secondary" style={{ fontSize: 12 }}>{t ? t.replace("T", " ").substring(0, 19) : "-"}</Text>,
		},
		{
			title: "操作",
			key: "ops",
			width: 180,
			align: "center",
			render: (_, r) => (
				<Space size={0}>
					<Button size="small" type="link" icon={<EyeOutlined />} onClick={() => viewDetail(r.id)}>详情</Button>
					<Button
						size="small"
						type="link"
						icon={<StarOutlined />}
						style={{ color: "#faad14" }}
						onClick={() => setWatchlistTarget({ code: r.stock_code, name: r.stock_name, price: r.current_price })}
					>
						自选
					</Button>
					<Popconfirm title="确定删除该分析记录？" onConfirm={() => handleDelete(r.id)} okText="删除" cancelText="取消">
						<Button size="small" type="link" danger icon={<DeleteOutlined />}>删除</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<>
			<Card bordered={false} style={{ borderRadius: 8 }}>
				<div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<Space>
						<HistoryOutlined />
						<Text strong>
							共
							{total}
							{" "}
							条分析记录
						</Text>
					</Space>
					<Button icon={<ReloadOutlined />} size="small" onClick={() => loadHistory(page)}>刷新</Button>
				</div>
				<Table
					dataSource={items}
					columns={columns}
					rowKey="id"
					loading={loading}
					size="small"
					pagination={false}
					scroll={{ x: 900 }}
				/>
				{total > 20 && (
					<div style={{ marginTop: 16, textAlign: "right" }}>
						<Pagination current={page} total={total} pageSize={20} onChange={p => loadHistory(p)} showSizeChanger={false} />
					</div>
				)}
			</Card>

			<Modal
				open={detailVisible}
				onCancel={() => {
					setDetailVisible(false);
					setDetail(null);
				}}
				footer={null}
				width={1300}
				title={detail ? `${detail.stock_name} (${detail.stock_code}) - 历史分析详情` : "加载中..."}
				destroyOnClose
			>
				{detailLoading ? <div style={{ textAlign: "center", padding: 40 }}><Spin size="large" /></div> : detail ? <AnalysisResultView data={detail} /> : <Empty />}
			</Modal>
			<WatchlistModal
				open={!!watchlistTarget}
				onClose={() => setWatchlistTarget(null)}
				onSuccess={() => setWatchlistTarget(null)}
				stockCode={watchlistTarget?.code ?? ""}
				stockName={watchlistTarget?.name ?? ""}
				strategies={[]}
				strategyNames={[]}
				overlapCount={1}
				suggestedBuyPrice={watchlistTarget?.price}
			/>
		</>
	);
}

/* ====================== Main Page ====================== */
const StockAnalysisPage: React.FC = () => {
	const STOCK_TAB_KEY = "stock_analysis_active_tab";
	const validTabs = ["analyze", "history", "watchlist", "portfolio"];
	const getInitialTab = () => {
		try {
			const saved = sessionStorage.getItem(STOCK_TAB_KEY);
			if (saved && validTabs.includes(saved))
				return saved;
		}
		catch {}
		return "analyze";
	};
	const [activeTab, setActiveTab] = useState(getInitialTab);
	const handleTabChange = useCallback((key: string) => {
		setActiveTab(key);
		try {
			sessionStorage.setItem(STOCK_TAB_KEY, key);
		}
		catch { /* ignore */ }
	}, []);
	const [stockInput, setStockInput] = useState("");
	const [data, setData] = useState<StockAnalysisData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [elapsed, setElapsed] = useState(0);
	const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

	const handleAnalyze = useCallback(async () => {
		const input = stockInput.trim();
		if (!input)
			return;
		setLoading(true);
		setError(null);
		setData(null);
		setElapsed(0);
		const timer = setInterval(() => setElapsed(s => s + 1), 1000);
		try {
			const response = await fetchStockAnalysis(input);
			if (response.status === "success" && response.data) {
				setData(response.data);
				setHistoryRefreshKey(k => k + 1); // 触发历史列表刷新
				message.success("分析完成");
			}
			else {
				setError(response.message || "分析失败");
			}
		}
		catch (e: any) {
			let msg = "网络请求失败";
			try {
				if (e?.response) {
					const body = await e.response.json();
					msg = body?.message || body?.detail || msg;
				}
				else if (e?.message) {
					msg = e.message;
				}
			}
			catch { /* ignore */ }
			setError(msg);
		}
		finally {
			clearInterval(timer);
			setLoading(false);
		}
	}, [stockInput]);

	return (
		<div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
			{/* Search Header */}
			<Card bordered={false} style={{ marginBottom: 24, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderRadius: 12 }}>
				<Row gutter={[24, 16]} align="middle">
					<Col span={14}>
						<Space align="center">
							<SearchOutlined style={{ fontSize: 32, color: "#fff" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>个股深度分析</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>AI 全方位研判 · 技术面+基本面+七大战法</Text>
							</div>
						</Space>
					</Col>
					<Col span={10}>
						<Space.Compact style={{ width: "100%" }}>
							<Input size="large" placeholder="如 600519 或 贵州茅台" value={stockInput} onChange={e => setStockInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAnalyze()} allowClear style={{ borderRadius: "8px 0 0 8px", fontSize: 15 }} />
							<Button type="primary" size="large" icon={<SearchOutlined />} loading={loading} onClick={handleAnalyze} style={{ borderRadius: "0 8px 8px 0", background: "#ff4d4f", borderColor: "#ff4d4f", fontWeight: "bold" }}>分析</Button>
						</Space.Compact>
					</Col>
				</Row>
			</Card>

			{/* Tabs */}
			<Tabs
				activeKey={activeTab}
				onChange={handleTabChange}
				items={[
					{
						key: "analyze",
						label: (
							<span>
								<SearchOutlined />
								{" "}
								实时分析
							</span>
						),
						children: (
							<>
								{loading && (
									<Card bordered={false} style={{ borderRadius: 12, textAlign: "center", padding: 60 }}>
										<Spin size="large" />
										<div style={{ marginTop: 16 }}><Text type="secondary">AI 深度分析中（K线+基本面+战法+行业+财报）...</Text></div>
										<div style={{ marginTop: 8 }}>
											<Text type="secondary">
												{elapsed}
												s
											</Text>
										</div>
									</Card>
								)}
								{error && !loading && <Alert type="error" message={error} showIcon style={{ marginBottom: 24, borderRadius: 8 }} action={<Button size="small" onClick={handleAnalyze} icon={<ReloadOutlined />}>重试</Button>} />}
								{!loading && !error && !data && <Card bordered={false} style={{ borderRadius: 12 }}><Empty description="输入股票代码或名称开始分析" /></Card>}
								{data && !loading && <AnalysisResultView data={data} />}
							</>
						),
					},
					{
						key: "history",
						label: (
							<span>
								<HistoryOutlined />
								{" "}
								历史分析
							</span>
						),
						children: <HistoryTab key={historyRefreshKey} />,
					},
					{
						key: "watchlist",
						label: (
							<span>
								<StarOutlined />
								{" "}
								自选盯盘
							</span>
						),
						children: <WatchlistPanel />,
					},
					{
						key: "portfolio",
						label: (
							<span>
								<FundProjectionScreenOutlined />
								{" "}
								整体持仓分析
							</span>
						),
						children: <PortfolioAnalysisPanel />,
					},
				]}
			/>
		</div>
	);
};

export default StockAnalysisPage;
