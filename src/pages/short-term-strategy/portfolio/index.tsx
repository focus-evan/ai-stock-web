import type {
	DailySummary,
	FollowRecommendation,
	FollowStock,
	PortfolioConfig,
	PortfolioPosition,
	PortfolioTrade,
	StockPnlItem,
} from "#src/api/portfolio";

import type { ColumnsType } from "antd/es/table";
import {
	createPortfolio,
	fetchFollowList,
	fetchPortfolioDetail,
	fetchPortfolioList,
	fetchPortfolioPerformance,
	fetchPortfolioTrades,
	fetchStockPnl,
	settlePortfolio,
	toggleAutoTrade,
	triggerFollowRecommendation,
	triggerRebalance,
} from "#src/api/portfolio";
import { BasicContent } from "#src/components/basic-content";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	BankOutlined,
	CalculatorOutlined,
	DollarOutlined,
	ExperimentOutlined,
	FireOutlined,
	FundOutlined,
	LineChartOutlined,
	PauseCircleOutlined,
	PlayCircleOutlined,
	PlusOutlined,
	ProfileOutlined,
	ReloadOutlined,
	SwapOutlined,
	ThunderboltOutlined,
	WalletOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	Form,
	InputNumber,
	message,
	Modal,
	Progress,
	Radio,
	Result,
	Row,
	Select,
	Skeleton,
	Space,
	Statistic,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Title, Text } = Typography;

/** 格式化金额 */
function formatMoney(val: number): string {
	if (Math.abs(val) >= 1e8)
		return `${(val / 1e8).toFixed(2)}亿`;
	if (Math.abs(val) >= 1e4)
		return `${(val / 1e4).toFixed(2)}万`;
	return val.toFixed(2);
}

/** 盈亏颜色 */
function profitColor(val: number): string {
	if (val > 0)
		return "#f5222d";
	if (val < 0)
		return "#52c41a";
	return "#8c8c8c";
}

/** 策略名称 */
const STRATEGY_NAMES: Record<string, string> = {
	dragon_head: "龙头战法",
	event_driven: "事件驱动",
	sentiment: "情绪战法",
	breakthrough: "突破战法",
	volume_price: "量价关系",
	overnight: "隔夜施工法",
	auction: "隔夜施工法",
	moving_average: "均线战法",
	northbound: "北向资金",
	trend_momentum: "趋势动量",
	combined: "综合战法",
	moat_value: "护城河优选",
};
function strategyName(type: string): string {
	return STRATEGY_NAMES[type] || type;
}

/** 时段名称 */
function sessionLabel(type: string): string {
	if (type === "morning")
		return "上午";
	if (type === "afternoon")
		return "下午";
	return "手动";
}

/** 风险等级颜色 */
function riskColor(level: string): string {
	if (level === "低")
		return "#52c41a";
	if (level === "高")
		return "#f5222d";
	return "#faad14";
}

function riskTagColor(level: string): string {
	if (level === "低")
		return "green";
	if (level === "高")
		return "red";
	return "orange";
}

function confidenceColor(score: number): string {
	if (score >= 70)
		return "#52c41a";
	if (score >= 40)
		return "#faad14";
	return "#f5222d";
}

/** 跟投建议卡片组件 */
function FollowStockCard({ stock }: { stock: FollowStock }) {
	return (
		<Col xs={24} md={12}>
			<Card
				size="small"
				style={{ borderLeft: `3px solid ${riskColor(stock.risk_level)}` }}
				title={(
					<Space>
						<Text strong>{stock.stock_name}</Text>
						<Text type="secondary">{stock.stock_code}</Text>
						<Tag color={riskTagColor(stock.risk_level)}>
							{stock.risk_level}
							风险
						</Tag>
					</Space>
				)}
				extra={(
					<Tag color="blue">
						仓位
						{" "}
						{stock.position_pct}
						%
					</Tag>
				)}
			>
				<Row gutter={8} style={{ marginBottom: 8 }}>
					<Col span={8}>
						<Statistic title="现价" value={stock.current_price} precision={2} valueStyle={{ fontSize: 14 }} />
					</Col>
					<Col span={8}>
						<Statistic
							title="目标价"
							value={stock.target_price}
							precision={2}
							valueStyle={{ fontSize: 14, color: "#f5222d" }}
							prefix={<ArrowUpOutlined />}
						/>
					</Col>
					<Col span={8}>
						<Statistic
							title="止损价"
							value={stock.stop_loss_price}
							precision={2}
							valueStyle={{ fontSize: 14, color: "#52c41a" }}
							prefix={<ArrowDownOutlined />}
						/>
					</Col>
				</Row>
				<Row gutter={8} style={{ marginBottom: 8 }}>
					<Col span={12}>
						<Text type="secondary">预期收益: </Text>
						<Text style={{ color: "#f5222d" }}>{stock.expected_return}</Text>
					</Col>
					<Col span={12}>
						<Text type="secondary">持有周期: </Text>
						<Text>{stock.holding_period}</Text>
					</Col>
				</Row>
				<div style={{ background: "#fafafa", borderRadius: 4, padding: "8px 12px", marginTop: 4 }}>
					<Text type="secondary" style={{ fontSize: 12 }}>跟投理由</Text>
					<div style={{ fontSize: 13, marginTop: 4 }}>{stock.reason}</div>
				</div>
			</Card>
		</Col>
	);
}

/** 跟投建议整体区块 */
function FollowSection({ followList, followLoading, onTrigger }: {
	followList: FollowRecommendation[]
	followLoading: boolean
	onTrigger: () => void
}) {
	return (
		<Card
			title={(
				<Space>
					<FireOutlined style={{ color: "#f5222d" }} />
					<Text strong>跟投建议</Text>
					{followList.length > 0 && (
						<Tag color="volcano">
							最新
							{" "}
							{followList[0]?.trading_date}
						</Tag>
					)}
				</Space>
			)}
			extra={(
				<Button
					size="small"
					type="primary"
					ghost
					icon={<ReloadOutlined />}
					loading={followLoading}
					onClick={onTrigger}
				>
					手动生成
				</Button>
			)}
			style={{ borderRadius: 8 }}
		>
			{followList.length === 0
				? <Empty description="暂无跟投建议，请等待交易完成后自动生成" />
				: (
					<Tabs
						defaultActiveKey="0"
						items={followList.map((follow, idx) => ({
							key: String(idx),
							label: `${follow.trading_date} ${sessionLabel(follow.session_type)}`,
							children: (
								<div>
									<Row gutter={16} style={{ marginBottom: 16 }}>
										<Col span={16}>
											<Alert
												type="info"
												showIcon
												message="大盘行情"
												description={follow.market_overview || "暂无行情概述"}
											/>
										</Col>
										<Col span={8}>
											<div style={{ textAlign: "center" }}>
												<Text type="secondary">信心评分</Text>
												<Progress
													type="circle"
													percent={follow.confidence_score}
													size={80}
													strokeColor={confidenceColor(follow.confidence_score)}
												/>
											</div>
										</Col>
									</Row>
									<Row gutter={[12, 12]}>
										{(follow.recommendations || []).map((stock: FollowStock, sIdx: number) => (
											<FollowStockCard key={stock.stock_code || sIdx} stock={stock} />
										))}
									</Row>
									{follow.risk_warning && (
										<Alert
											type="warning"
											showIcon
											message="风险提示"
											description={follow.risk_warning}
											style={{ marginTop: 12 }}
										/>
									)}
									{follow.strategy_summary && (
										<Alert
											type="success"
											showIcon
											message="策略总结"
											description={follow.strategy_summary}
											style={{ marginTop: 8 }}
										/>
									)}
								</div>
							),
						}))}
					/>
				)}
		</Card>
	);
}

/** Mini SVG 收益曲线 */
function MiniProfitChart({ data, height = 80 }: { data: DailySummary[], height?: number }) {
	if (!data || data.length < 2)
		return <Empty description="暂无数据" />;

	const values = data.map(d => d.total_profit_pct);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = max - min || 1;
	const w = 100;
	const h = height;
	const padding = 4;
	const zeroY = h - padding - ((0 - min) / range) * (h - padding * 2);

	const points = values.map((v, i) => {
		const x = padding + (i / (values.length - 1)) * (w - padding * 2);
		const y = h - padding - ((v - min) / range) * (h - padding * 2);
		return `${x},${y}`;
	});

	const lastVal = values[values.length - 1] ?? 0;
	const lineColor = lastVal >= 0 ? "#f5222d" : "#52c41a";

	return (
		<svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
			<defs>
				<linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
					<stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
				</linearGradient>
			</defs>
			{/* Zero line */}
			<line
				x1={padding}
				y1={zeroY}
				x2={w - padding}
				y2={zeroY}
				stroke="rgba(255,255,255,0.15)"
				strokeWidth="0.5"
				strokeDasharray="2,2"
			/>
			{/* Area */}
			<polygon
				points={`${padding},${zeroY} ${points.join(" ")} ${w - padding},${zeroY}`}
				fill="url(#profitGrad)"
			/>
			{/* Line */}
			<polyline points={points.join(" ")} fill="none" stroke={lineColor} strokeWidth="1.5" />
			{/* Last dot */}
			<circle
				cx={padding + ((values.length - 1) / (values.length - 1)) * (w - padding * 2)}
				cy={h - padding - ((lastVal - min) / range) * (h - padding * 2)}
				r="3"
				fill={lineColor}
				stroke="#fff"
				strokeWidth="1"
			/>
		</svg>
	);
}

export default function PortfolioDashboard() {
	const [loading, setLoading] = useState(false);
	const [portfolios, setPortfolios] = useState<PortfolioConfig[]>([]);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<{
		portfolio: PortfolioConfig
		positions: PortfolioPosition[]
		recent_trades: PortfolioTrade[]
	} | null>(null);
	const [performance, setPerformance] = useState<DailySummary[]>([]);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [creating, setCreating] = useState(false);
	const [triggering, setTriggering] = useState(false);
	const [settling, setSettling] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 交易记录分页状态
	const [trades, setTrades] = useState<PortfolioTrade[]>([]);
	const [tradesTotal, setTradesTotal] = useState(0);
	const [tradesPage, setTradesPage] = useState(1);
	const [tradesPageSize, setTradesPageSize] = useState(20);

	// 个股盈亏汇总状态
	const [stockPnl, setStockPnl] = useState<StockPnlItem[]>([]);

	// 跟投建议状态
	const [followList, setFollowList] = useState<FollowRecommendation[]>([]);
	const [followLoading, setFollowLoading] = useState(false);

	// ==================== 数据加载 ====================

	const loadPortfolios = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetchPortfolioList();
			if (res.status === "success") {
				setPortfolios(res.data.portfolios);
				// 默认选中第一个
				if (res.data.portfolios.length > 0 && !selectedId) {
					setSelectedId(res.data.portfolios[0]!.id);
				}
			}
		}
		catch (err: any) {
			setError(err?.message || "获取组合列表失败");
		}
		finally {
			setLoading(false);
		}
	}, [selectedId]);

	const loadDetail = useCallback(async (id: number) => {
		try {
			const [detailRes, perfRes] = await Promise.all([
				fetchPortfolioDetail(id),
				fetchPortfolioPerformance(id, 60),
			]);
			if (detailRes.status === "success") {
				setDetail(detailRes.data);
			}
			if (perfRes.status === "success") {
				setPerformance(perfRes.data.performance);
			}
		}
		catch (err: any) {
			message.error(err?.message || "获取组合详情失败");
		}
	}, []);

	const loadTrades = useCallback(async (id: number, page: number = 1, pageSize: number = 20) => {
		try {
			const res = await fetchPortfolioTrades(id, page, pageSize);
			if (res.status === "success") {
				setTrades(res.data.trades);
				setTradesTotal(res.data.total);
				setTradesPage(res.data.page);
			}
		}
		catch (err: any) {
			console.error("Load trades error:", err);
		}
	}, []);

	const loadStockPnl = useCallback(async (id: number) => {
		try {
			const res = await fetchStockPnl(id);
			if (res.status === "success") {
				setStockPnl(res.data.stock_pnl);
			}
		}
		catch (err: any) {
			console.error("Load stock PnL error:", err);
		}
	}, []);

	const loadFollowList = useCallback(async (id: number) => {
		setFollowLoading(true);
		try {
			const res = await fetchFollowList({ portfolio_id: id, limit: 10 });
			if (res.status === "success") {
				setFollowList(res.data.recommendations);
			}
		}
		catch (err: any) {
			console.error("Load follow list error:", err);
		}
		finally {
			setFollowLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPortfolios();
	}, [loadPortfolios]);

	useEffect(() => {
		if (selectedId) {
			loadDetail(selectedId);
			setTradesPage(1);
			loadTrades(selectedId, 1, tradesPageSize);
			loadStockPnl(selectedId);
			loadFollowList(selectedId);
		}
	}, [selectedId, loadDetail, loadTrades, loadStockPnl, loadFollowList, tradesPageSize]);

	// ==================== 操作回调 ====================

	const handleCreate = async (values: any) => {
		setCreating(true);
		try {
			const res = await createPortfolio({
				strategy_type: values.strategy_type,
				name: values.name || `${strategyName(values.strategy_type)}_组合`,
				initial_capital: values.initial_capital,
			});
			if (res.status === "success" || res.status === "warning") {
				message.success(res.message || "创建成功");
				setCreateModalOpen(false);
				await loadPortfolios();
				if (res.portfolio_id) {
					setSelectedId(res.portfolio_id);
				}
			}
			else {
				message.error(res.message || "创建失败");
			}
		}
		catch (err: any) {
			message.error(err?.message || "创建失败");
		}
		finally {
			setCreating(false);
		}
	};

	const handleTrigger = async () => {
		if (!selectedId)
			return;
		setTriggering(true);
		try {
			const res = await triggerRebalance(selectedId);
			if (res.status === "success") {
				message.success(`调仓完成，交易${res.trade_count || 0}笔`);
				await loadDetail(selectedId);
			}
			else {
				message.warning(res.message || "调仓跳过");
			}
		}
		catch (err: any) {
			message.error(err?.message || "调仓失败");
		}
		finally {
			setTriggering(false);
		}
	};

	const handleSettle = async () => {
		if (!selectedId)
			return;
		setSettling(true);
		try {
			const res = await settlePortfolio(selectedId);
			if (res.status === "success") {
				message.success(
					`结算完成！总资产: ${res.total_asset?.toLocaleString()}元，累计收益: ${res.total_profit_pct?.toFixed(2)}%`,
				);
				await loadDetail(selectedId);
				await loadPortfolios();
			}
			else {
				message.warning(res.message || "结算跳过");
			}
		}
		catch (err: any) {
			message.error(err?.message || "结算失败");
		}
		finally {
			setSettling(false);
		}
	};

	const handleToggle = async () => {
		if (!detail?.portfolio)
			return;
		const newState = detail.portfolio.auto_trade !== 1;
		try {
			await toggleAutoTrade(detail.portfolio.id, newState);
			message.success(newState ? "自动交易已开启" : "自动交易已暂停");
			await loadDetail(detail.portfolio.id);
		}
		catch (err: any) {
			message.error(err?.message || "操作失败");
		}
	};

	// ==================== 持仓表格列 ====================

	const positionColumns: ColumnsType<PortfolioPosition> = [
		{
			title: "股票代码",
			dataIndex: "stock_code",
			key: "stock_code",
			width: 100,
			render: val => <Text style={{ fontFamily: "monospace" }}>{val}</Text>,
		},
		{
			title: "股票名称",
			dataIndex: "stock_name",
			key: "stock_name",
			width: 90,
			render: val => <Text strong>{val}</Text>,
		},
		{
			title: "持仓",
			dataIndex: "quantity",
			key: "quantity",
			width: 80,
			align: "right",
			render: val => `${val}股`,
		},
		{
			title: "成本价",
			dataIndex: "avg_cost",
			key: "avg_cost",
			width: 90,
			align: "right",
			render: val => val?.toFixed(2),
		},
		{
			title: "现价",
			dataIndex: "current_price",
			key: "current_price",
			width: 90,
			align: "right",
			render: val => (
				<Text style={{ color: "#f5222d", fontWeight: 600 }}>
					{val?.toFixed(2)}
				</Text>
			),
		},
		{
			title: "市值",
			dataIndex: "market_value",
			key: "market_value",
			width: 100,
			align: "right",
			render: val => formatMoney(val || 0),
		},
		{
			title: "盈亏",
			dataIndex: "profit",
			key: "profit",
			width: 110,
			align: "right",
			sorter: (a, b) => a.profit - b.profit,
			render: (val: number, record) => (
				<Tooltip title={`盈亏率: ${(record.profit_pct || 0).toFixed(2)}%`}>
					<Text style={{ color: profitColor(val), fontWeight: 600 }}>
						{val >= 0 ? "+" : ""}
						{formatMoney(val)}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "盈亏率",
			dataIndex: "profit_pct",
			key: "profit_pct",
			width: 90,
			align: "right",
			sorter: (a, b) => a.profit_pct - b.profit_pct,
			render: val => (
				<Tag color={val >= 0 ? "red" : "green"} style={{ fontWeight: 600 }}>
					{val >= 0 ? "+" : ""}
					{val?.toFixed(2)}
					%
				</Tag>
			),
		},
		{
			title: "仓位",
			dataIndex: "weight",
			key: "weight",
			width: 80,
			align: "right",
			render: val => `${val?.toFixed(1)}%`,
		},
	];

	// ==================== 交易记录列 ====================

	const tradeColumns: ColumnsType<PortfolioTrade> = [
		{
			title: "日期",
			dataIndex: "trade_date",
			key: "trade_date",
			width: 100,
		},
		{
			title: "方向",
			dataIndex: "direction",
			key: "direction",
			width: 70,
			align: "center",
			render: val => (
				<Tag color={val === "buy" ? "red" : "green"} style={{ fontWeight: 600 }}>
					{val === "buy" ? "买入" : "卖出"}
				</Tag>
			),
		},
		{
			title: "代码",
			dataIndex: "stock_code",
			key: "stock_code",
			width: 90,
			render: val => <Text style={{ fontFamily: "monospace" }}>{val}</Text>,
		},
		{
			title: "名称",
			dataIndex: "stock_name",
			key: "stock_name",
			width: 80,
		},
		{
			title: "价格",
			dataIndex: "price",
			key: "price",
			width: 80,
			align: "right",
			render: val => val?.toFixed(2),
		},
		{
			title: "数量",
			dataIndex: "quantity",
			key: "quantity",
			width: 80,
			align: "right",
		},
		{
			title: "金额",
			dataIndex: "amount",
			key: "amount",
			width: 100,
			align: "right",
			render: val => formatMoney(val || 0),
		},
		{
			title: "收益",
			dataIndex: "profit",
			key: "profit",
			width: 100,
			align: "right",
			render: (val, record) => {
				if (record.direction !== "sell" || val == null)
					return "-";
				return (
					<Text style={{ color: profitColor(val), fontWeight: 600 }}>
						{val >= 0 ? "+" : ""}
						{formatMoney(val)}
					</Text>
				);
			},
		},
		{
			title: "理由",
			dataIndex: "reason",
			key: "reason",
			width: 200,
			ellipsis: true,
			render: val => val ? <Tooltip title={val}><Text type="secondary" style={{ fontSize: 12 }}>{val}</Text></Tooltip> : "-",
		},
	];

	// ==================== 个股盈亏列 ====================

	const stockPnlColumns: ColumnsType<StockPnlItem> = [
		{
			title: "股票代码",
			dataIndex: "stock_code",
			key: "stock_code",
			width: 100,
			render: val => <Text style={{ fontFamily: "monospace" }}>{val}</Text>,
		},
		{
			title: "股票名称",
			dataIndex: "stock_name",
			key: "stock_name",
			width: 90,
			render: (val, record) => (
				<Space>
					<Text strong>{val}</Text>
					<Tag color={record.status === "holding" ? "blue" : "default"} style={{ fontSize: 10 }}>
						{record.status === "holding" ? "持仓中" : "已清仓"}
					</Tag>
				</Space>
			),
		},
		{
			title: "买入/卖出",
			key: "trade_count",
			width: 90,
			align: "center",
			render: (_, record) => (
				<Space size={4}>
					<Tag color="red" style={{ margin: 0 }}>
						买
						{record.buy_count}
					</Tag>
					<Tag color="green" style={{ margin: 0 }}>
						卖
						{record.sell_count}
					</Tag>
				</Space>
			),
		},
		{
			title: "总买入",
			dataIndex: "total_buy_amount",
			key: "total_buy_amount",
			width: 100,
			align: "right",
			render: val => formatMoney(val || 0),
		},
		{
			title: "总卖出",
			dataIndex: "total_sell_amount",
			key: "total_sell_amount",
			width: 100,
			align: "right",
			render: val => formatMoney(val || 0),
		},
		{
			title: "已实现盈亏",
			dataIndex: "realized_profit",
			key: "realized_profit",
			width: 110,
			align: "right",
			sorter: (a, b) => a.realized_profit - b.realized_profit,
			render: (val: number) => (
				<Text style={{ color: profitColor(val), fontWeight: 600 }}>
					{val >= 0 ? "+" : ""}
					{formatMoney(val)}
				</Text>
			),
		},
		{
			title: "浮动盈亏",
			dataIndex: "unrealized_profit",
			key: "unrealized_profit",
			width: 110,
			align: "right",
			render: (val: number, record) => {
				if (record.status !== "holding")
					return <Text type="secondary">-</Text>;
				return (
					<Tooltip title={`浮动盈亏率: ${record.unrealized_profit_pct?.toFixed(2)}%`}>
						<Text style={{ color: profitColor(val), fontWeight: 600 }}>
							{val >= 0 ? "+" : ""}
							{formatMoney(val)}
						</Text>
					</Tooltip>
				);
			},
		},
		{
			title: "总盈亏",
			dataIndex: "total_pnl",
			key: "total_pnl",
			width: 110,
			align: "right",
			sorter: (a, b) => a.total_pnl - b.total_pnl,
			render: (val: number) => (
				<Text style={{ color: profitColor(val), fontWeight: 700, fontSize: 14 }}>
					{val >= 0 ? "+" : ""}
					{formatMoney(val)}
				</Text>
			),
		},
		{
			title: "首次交易",
			dataIndex: "first_trade_date",
			key: "first_trade_date",
			width: 100,
		},
		{
			title: "最后交易",
			dataIndex: "last_trade_date",
			key: "last_trade_date",
			width: 100,
		},
	];

	const portfolio = detail?.portfolio;
	const positions = detail?.positions || [];

	// ==================== Error state ====================
	if (error && portfolios.length === 0) {
		return (
			<BasicContent>
				<Result
					status="error"
					title="获取数据失败"
					subTitle={error}
					extra={<Button type="primary" icon={<ReloadOutlined />} onClick={loadPortfolios}>重新加载</Button>}
				/>
			</BasicContent>
		);
	}

	return (
		<BasicContent>
			<div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Space>
					<FundOutlined style={{ fontSize: 24, color: "#722ed1" }} />
					<Title level={4} style={{ margin: 0 }}>模拟交易</Title>
					<Tag color="purple" icon={<ExperimentOutlined />}>GPT-5.2 驱动</Tag>
				</Space>
				<Space>
					{portfolios.length > 0 && (
						<Select
							value={selectedId}
							onChange={val => setSelectedId(val)}
							style={{ width: 220 }}
							options={portfolios.map(p => ({
								value: p.id,
								label: `${strategyName(p.strategy_type)} - ${p.name || `组合#${p.id}`}`,
							}))}
						/>
					)}
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => setCreateModalOpen(true)}
					>
						新建组合
					</Button>
					<Button
						icon={<ReloadOutlined />}
						onClick={() => {
							loadPortfolios();
							if (selectedId)
								loadDetail(selectedId);
						}}
						loading={loading}
					>
						刷新
					</Button>
				</Space>
			</div>

			{loading && portfolios.length === 0
				? (
					<Skeleton active paragraph={{ rows: 12 }} />
				)
				: portfolios.length === 0
					? (
						<Empty description="暂无模拟交易组合" style={{ marginTop: 80 }}>
							<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
								创建第一个组合
							</Button>
						</Empty>
					)
					: portfolio
						? (
							<>
								{/* ==================== 资产概览 ==================== */}
								<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
									<Col xs={24} sm={6}>
										<Card
											style={{
												borderRadius: 12,
												background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
												border: "none",
											}}
											styles={{ body: { padding: "20px 24px" } }}
										>
											<Statistic
												title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>总资产</Text>}
												value={portfolio.total_asset}
												precision={2}
												prefix={<WalletOutlined />}
												valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
												suffix="元"
											/>
										</Card>
									</Col>
									<Col xs={24} sm={6}>
										<Card
											style={{
												borderRadius: 12,
												background:
													portfolio.total_profit >= 0
														? "linear-gradient(135deg, #f5222d 0%, #fa541c 100%)"
														: "linear-gradient(135deg, #52c41a 0%, #237804 100%)",
												border: "none",
											}}
											styles={{ body: { padding: "20px 24px" } }}
										>
											<Statistic
												title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>累计收益</Text>}
												value={portfolio.total_profit}
												precision={2}
												prefix={
													portfolio.total_profit >= 0
														? <ArrowUpOutlined />
														: <ArrowDownOutlined />
												}
												valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
												suffix="元"
											/>
											<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
												收益率:
												{" "}
												{portfolio.total_profit_pct >= 0
													? "+"
													: ""}
												{portfolio.total_profit_pct.toFixed(2)}
												%
											</Text>
										</Card>
									</Col>
									<Col xs={24} sm={6}>
										<Card
											style={{
												borderRadius: 12,
												background: "linear-gradient(135deg, #13c2c2 0%, #006d75 100%)",
												border: "none",
											}}
											styles={{ body: { padding: "20px 24px" } }}
										>
											<Statistic
												title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>可用现金</Text>}
												value={portfolio.available_cash}
												precision={2}
												prefix={<DollarOutlined />}
												valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
												suffix="元"
											/>
										</Card>
									</Col>
									<Col xs={24} sm={6}>
										<Card
											style={{
												borderRadius: 12,
												background: "linear-gradient(135deg, #faad14 0%, #d48806 100%)",
												border: "none",
											}}
											styles={{ body: { padding: "20px 24px" } }}
										>
											<Statistic
												title={<Text style={{ color: "rgba(255,255,255,0.7)" }}>初始资金</Text>}
												value={portfolio.initial_capital}
												precision={2}
												prefix={<BankOutlined />}
												valueStyle={{ color: "#fff", fontSize: 24, fontWeight: 700 }}
												suffix="元"
											/>
											<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
												策略:
												{" "}
												{strategyName(portfolio.strategy_type)}
											</Text>
										</Card>
									</Col>
								</Row>

								{/* ==================== 操作按钮栏 ==================== */}
								<Alert
									style={{ marginBottom: 16, borderRadius: 8 }}
									type={portfolio.auto_trade === 1 ? "success" : "warning"}
									showIcon
									icon={portfolio.auto_trade === 1 ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
									message={(
										<Space>
											<Text strong>
												自动交易:
												{" "}
												{portfolio.auto_trade === 1 ? "运行中" : "已暂停"}
											</Text>
											<Tag>{strategyName(portfolio.strategy_type)}</Tag>
											<Text type="secondary" style={{ fontSize: 12 }}>
												每个交易日自动交易（龙头/事件 09:10,12:40 | 情绪 11:10,14:10）
											</Text>
										</Space>
									)}
									action={(
										<Space>
											<Button
												size="small"
												icon={<CalculatorOutlined />}
												loading={settling}
												onClick={handleSettle}
												style={{ borderColor: "#13c2c2", color: "#13c2c2" }}
											>
												手动结算
											</Button>
											<Button
												size="small"
												icon={<ThunderboltOutlined />}
												loading={triggering}
												onClick={handleTrigger}
												type="primary"
												ghost
											>
												手动调仓
											</Button>
											<Button
												size="small"
												icon={portfolio.auto_trade === 1 ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
												onClick={handleToggle}
												danger={portfolio.auto_trade === 1}
											>
												{portfolio.auto_trade === 1 ? "暂停" : "开启"}
											</Button>
										</Space>
									)}
								/>

								{/* ==================== 收益曲线 ==================== */}
								<Card
									title={(
										<Space>
											<LineChartOutlined style={{ color: "#722ed1" }} />
											<Text strong>收益曲线</Text>
											{performance.length > 0 && (
												<Tag color="processing">
													{performance.length}
													天
												</Tag>
											)}
										</Space>
									)}
									style={{ marginBottom: 16, borderRadius: 8, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
									styles={{ body: { padding: "16px 24px" } }}
									bordered={false}
								>
									<MiniProfitChart data={performance} height={140} />
									{performance.length > 0 && (
										<div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
											<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
												{performance[0]?.trading_date}
											</Text>
											<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
												{performance[performance.length - 1]?.trading_date}
											</Text>
										</div>
									)}
								</Card>

								{/* ==================== 当前持仓 ==================== */}
								<Card
									title={(
										<Space>
											<WalletOutlined style={{ color: "#1890ff" }} />
											<Text strong>当前持仓</Text>
											<Tag>
												{positions.length}
												只
											</Tag>
										</Space>
									)}
									styles={{ body: { padding: 0 } }}
									style={{ marginBottom: 16, borderRadius: 8 }}
								>
									<Table<PortfolioPosition>
										columns={positionColumns}
										dataSource={positions}
										rowKey="stock_code"
										size="middle"
										pagination={false}
										scroll={{ x: 900 }}
										rowClassName={(record) => {
											if (record.profit_pct >= 10)
												return "portfolio-row-profit-high";
											if (record.profit_pct <= -5)
												return "portfolio-row-loss";
											return "";
										}}
									/>
								</Card>

								{/* ==================== 个股盈亏 ==================== */}
								<Card
									title={(
										<Space>
											<ProfileOutlined style={{ color: "#13c2c2" }} />
											<Text strong>个股盈亏</Text>
											<Tag>
												{stockPnl.length}
												只
											</Tag>
											{stockPnl.filter(s => s.status === "holding").length > 0 && (
												<Tag color="blue">
													持仓
													{" "}
													{stockPnl.filter(s => s.status === "holding").length}
													只
												</Tag>
											)}
										</Space>
									)}
									styles={{ body: { padding: 0 } }}
									style={{ marginBottom: 16, borderRadius: 8 }}
								>
									<Table<StockPnlItem>
										columns={stockPnlColumns}
										dataSource={stockPnl}
										rowKey="stock_code"
										size="small"
										pagination={stockPnl.length > 20 ? { pageSize: 20, showTotal: t => `共 ${t} 只` } : false}
										scroll={{ x: 1100 }}
										summary={() => {
											if (stockPnl.length === 0)
												return null;
											const totalRealized = stockPnl.reduce((s, r) => s + r.realized_profit, 0);
											const totalUnrealized = stockPnl.reduce((s, r) => s + r.unrealized_profit, 0);
											const totalPnl = stockPnl.reduce((s, r) => s + r.total_pnl, 0);
											return (
												<Table.Summary fixed>
													<Table.Summary.Row>
														<Table.Summary.Cell index={0} colSpan={5} align="right">
															<Text strong>合计</Text>
														</Table.Summary.Cell>
														<Table.Summary.Cell index={5} align="right">
															<Text style={{ color: profitColor(totalRealized), fontWeight: 700 }}>
																{totalRealized >= 0 ? "+" : ""}
																{formatMoney(totalRealized)}
															</Text>
														</Table.Summary.Cell>
														<Table.Summary.Cell index={6} align="right">
															<Text style={{ color: profitColor(totalUnrealized), fontWeight: 700 }}>
																{totalUnrealized >= 0 ? "+" : ""}
																{formatMoney(totalUnrealized)}
															</Text>
														</Table.Summary.Cell>
														<Table.Summary.Cell index={7} align="right">
															<Text style={{ color: profitColor(totalPnl), fontWeight: 700, fontSize: 15 }}>
																{totalPnl >= 0 ? "+" : ""}
																{formatMoney(totalPnl)}
															</Text>
														</Table.Summary.Cell>
														<Table.Summary.Cell index={8} colSpan={2} />
													</Table.Summary.Row>
												</Table.Summary>
											);
										}}
									/>
								</Card>

								{/* ==================== 交易记录 ==================== */}
								<Card
									title={(
										<Space>
											<SwapOutlined style={{ color: "#fa8c16" }} />
											<Text strong>交易记录</Text>
											<Tag>
												共
												{" "}
												{tradesTotal}
												{" "}
												笔
											</Tag>
										</Space>
									)}
									styles={{ body: { padding: 0 } }}
									style={{ borderRadius: 8 }}
								>
									<Table<PortfolioTrade>
										columns={tradeColumns}
										dataSource={trades}
										rowKey={r => `${r.trade_date}-${r.stock_code}-${r.direction}-${r.created_at}`}
										size="small"
										pagination={{
											current: tradesPage,
											pageSize: tradesPageSize,
											total: tradesTotal,
											showSizeChanger: true,
											showTotal: total => `共 ${total} 条`,
											pageSizeOptions: ["10", "20", "50"],
											onChange: (p, ps) => {
												setTradesPage(p);
												setTradesPageSize(ps);
												if (selectedId)
													loadTrades(selectedId, p, ps);
											},
										}}
										scroll={{ x: 1000 }}
									/>
								</Card>

								{/* ==================== 跟投建议 ==================== */}
								<FollowSection
									followList={followList}
									followLoading={followLoading}
									onTrigger={async () => {
										if (!selectedId)
											return;
										setFollowLoading(true);
										try {
											await triggerFollowRecommendation(selectedId);
											message.success("跟投建议已生成");
											await loadFollowList(selectedId);
										}
										catch (e: any) {
											message.error(e?.message || "生成失败");
										}
										finally {
											setFollowLoading(false);
										}
									}}
								/>
							</>
						)
						: (
							<Skeleton active paragraph={{ rows: 12 }} />
						)}

			{/* ==================== 创建组合 Modal ==================== */}
			<Modal
				title={(
					<Space>
						<PlusOutlined />
						<span>创建模拟交易组合</span>
					</Space>
				)}
				open={createModalOpen}
				onCancel={() => setCreateModalOpen(false)}
				footer={null}
			>
				<Form
					layout="vertical"
					onFinish={handleCreate}
					initialValues={{
						strategy_type: "dragon_head",
						initial_capital: 100000,
					}}
				>
					<Form.Item
						name="strategy_type"
						label="交易策略"
						rules={[{ required: true, message: "请选择策略" }]}
					>
						<Radio.Group buttonStyle="solid">
							<Radio.Button value="dragon_head">🐉 龙头战法</Radio.Button>
							<Radio.Button value="sentiment">💓 情绪战法</Radio.Button>
							<Radio.Button value="event_driven">📡 事件驱动</Radio.Button>
						</Radio.Group>
					</Form.Item>

					<Form.Item
						name="initial_capital"
						label="初始资金 (元)"
						rules={[{ required: true, message: "请输入初始资金" }]}
					>
						<InputNumber
							style={{ width: "100%" }}
							min={10000}
							max={100000000}
							step={10000}
							formatter={val => `¥ ${val}`.replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")}
							parser={val => Number(val?.replace(/¥\s?|,*/g, "") || 0) as unknown as 10000}
						/>
					</Form.Item>

					<Form.Item
						name="name"
						label="组合名称 (可选)"
					>
						<Select placeholder="自动生成">
							<Select.Option value="">自动生成</Select.Option>
							<Select.Option value="激进型">激进型</Select.Option>
							<Select.Option value="稳健型">稳健型</Select.Option>
							<Select.Option value="测试组合">测试组合</Select.Option>
						</Select>
					</Form.Item>

					<Alert
						type="info"
						showIcon
						message="GPT-5.2 将根据最新策略推荐自动分配资金"
						description="创建后，系统会获取策略推荐股票，由GPT-5.2智能分配资金比例，模拟建仓。龙头/事件驱动 09:10 & 12:40 交易，情绪战法 11:10 & 14:10 交易。"
						style={{ marginBottom: 16 }}
					/>

					<Form.Item>
						<Button
							type="primary"
							htmlType="submit"
							loading={creating}
							block
							size="large"
							icon={<ExperimentOutlined />}
						>
							创建并建仓
						</Button>
					</Form.Item>
				</Form>
			</Modal>

			{/* ==================== Custom Styles ==================== */}
			<style>
				{`
				.portfolio-row-profit-high {
					background-color: rgba(245, 34, 45, 0.04) !important;
				}
				.portfolio-row-profit-high:hover > td {
					background-color: rgba(245, 34, 45, 0.08) !important;
				}
				.portfolio-row-loss {
					background-color: rgba(82, 196, 26, 0.04) !important;
				}
				.portfolio-row-loss:hover > td {
					background-color: rgba(82, 196, 26, 0.08) !important;
				}
				`}
			</style>
		</BasicContent>
	);
}
