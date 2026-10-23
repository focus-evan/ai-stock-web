import type {
	UnwindAnalysis,
	UnwindMethod,
} from "#src/api/strategy";
import type {
	RecordUnwindTradePayloadExt,
	UnwindAnalysisExt,
	UnwindPlanExt,
	UnwindRecovery,
	UnwindTradeExt,
	UnwindTradeSide,
} from "#src/api/strategy/unwind-extra";
import {
	fetchUnwindPlans,
	refreshUnwindPlans,
} from "#src/api/strategy";
import { recordUnwindTradeExt } from "#src/api/strategy/unwind-extra";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	ReloadOutlined,
	SafetyOutlined,
	SwapOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Checkbox,
	Col,
	Collapse,
	Empty,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Radio,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import ExecutionStatus from "./ExecutionStatus";
import PortfolioRisk from "./portfolio-risk";
import { freshUnwindQuote, quoteTimestamp } from "./price-alerts";
import PriceMonitor from "./PriceMonitor";
import RiskReview from "./RiskReview";
import { BacktestModal, SettingsModal, StrategyOverview } from "./strategy-blocks";
import { activeUnwindAnalysis, beijingTime, strategyTime } from "./strategy-time";
import { StrategyDateOverview, StrategyDateStamp } from "./StrategyDate";
import "#src/pages/short-term-strategy/strategy-visuals.css";

const { Link, Text } = Typography;

interface TradeFormValues {
	shares: number
	price: number
	fees: number
	trade_date: string
	note?: string
}

const decisionColors: Record<string, string> = {
	SELL_SLICE: "orange",
	BUY_BACK: "red",
	WAIT_BUYBACK: "blue",
	HOLD_TREND: "green",
	WAIT_SUPPORT: "cyan",
	WAIT_REBOUND: "gold",
	TARGET_REACHED: "purple",
	HOLD_TOO_SMALL: "default",
	WAIT_ONE_LOT: "gold",
	ST_ONE_LOT_NO_ROTATION: "volcano",
	BUYBACK_TIMEOUT: "red",
	BUYBACK_SUSPENDED: "volcano",
	REDUCE_AT_COST: "magenta",
	EXIT_ADVISED: "red",
	REVIEW_DUE: "gold",
	ADD_READY: "red",
	OBSERVE_ONLY: "default",
	LOW_VOLATILITY: "default",
	NO_EDGE: "default",
	ROTATION_CAP: "default",
};

const sideLabels: Record<UnwindTradeSide, string> = {
	sell: "做T卖出",
	buy: "做T接回",
	add: "补仓",
	reduce: "减仓卖出",
};

function money(value?: number | null, symbol = "¥") {
	const amount = Number(value || 0);
	const precision = Math.abs(amount) < 1 ? 3 : 2;
	return `${symbol}${amount.toFixed(precision)}`;
}

function planCurrencySymbol(plan: UnwindPlanExt) {
	return activeUnwindAnalysis(plan)?.currency_symbol || (/^\d{5}$/.test(plan.stock_code) ? "HK$" : "¥");
}

function formatCurrencyTotals(plans: UnwindPlanExt[], field: "cash_pool" | "cumulative_cost_reduction") {
	const totals = new Map<string, number>();
	plans.forEach((plan) => {
		const symbol = planCurrencySymbol(plan);
		totals.set(symbol, (totals.get(symbol) || 0) + Number(plan[field] || 0));
	});
	return [...totals.entries()].map(([symbol, value]) => money(value, symbol)).join(" / ") || "¥0.00";
}

function signed(value?: number | null) {
	const number = Number(value || 0);
	return `${number > 0 ? "+" : ""}${number.toFixed(2)}`;
}

async function getErrorMessage(error: any, fallback: string) {
	if (error?.response) {
		try {
			const body = await error.response.clone().json();
			return body?.detail || body?.message || fallback;
		}
		catch {
			return fallback;
		}
	}
	return error?.message || fallback;
}

function AnalysisDetails({ analysis }: { analysis: UnwindAnalysis }) {
	const technical = analysis.technical;
	return (
		<Row gutter={[8, 8]}>
			<Col xs={24} md={12}>
				<div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 12px", height: "100%" }}>
					<Text strong>技术结构</Text>
					<div style={{ marginTop: 6 }}><Text type="secondary">{analysis.deep_analysis.trend}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.location}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.momentum}</Text></div>
				</div>
			</Col>
			<Col xs={24} md={12}>
				<div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 12px", height: "100%" }}>
					<Text strong>量价与仓位</Text>
					<div style={{ marginTop: 6 }}><Text type="secondary">{analysis.deep_analysis.volume}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.position}</Text></div>
					{analysis.deep_analysis.cost_filter && <div><Text type="secondary">{analysis.deep_analysis.cost_filter}</Text></div>}
					<div>
						<Text type="secondary">
							数据截止：
							{technical.as_of}
						</Text>
					</div>
				</div>
			</Col>
		</Row>
	);
}

function ExecutionGuide({ analysis, historical }: { analysis: UnwindAnalysis, historical: boolean }) {
	const symbol = analysis.currency_symbol || "¥";
	const steps = analysis.execution_steps || [];
	if (!steps.length)
		return null;

	return (
		<div style={{ marginTop: 14, border: "1px solid #d9d9d9", borderRadius: 10, overflow: "hidden" }}>
			<div style={{ padding: "10px 14px", background: "#fafafa", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
				<Space wrap>
					<Text strong>{historical ? "历史 / 待核验计划 · 请勿直接照此操作" : "具体执行计划 · 触发条件成立后再操作"}</Text>
					<Tag color={analysis.market === "hk" ? "geekblue" : "red"}>{analysis.market_label || (analysis.market === "hk" ? "港股" : "A股")}</Tag>
					{analysis.position_mode_label && (
						<Tag color={analysis.requires_manual_confirmation ? "volcano" : "blue"}>
							{analysis.position_mode_label}
						</Tag>
					)}
					<Tag>{analysis.strategy_version || "3/16趋势门控"}</Tag>
				</Space>
				<Text type="secondary">
					数据截止
					{" "}
					{analysis.technical.as_of}
				</Text>
			</div>
			{analysis.requires_manual_confirmation && (
				<Alert
					banner
					showIcon
					type="warning"
					message={analysis.position_mode === "ONE_LOT_FULL_ROTATION"
						? "一手整手回转会暂时清空全部持仓，只有页面明确显示“条件成立”时才可作为高风险可选方案。"
						: `本模式会滚动较大仓位；本轮至少保留${analysis.core_floor_shares || 0}股，需人工确认实际成交。`}
				/>
			)}
			<div style={{ padding: "4px 14px" }}>
				{steps.map(step => (
					<div
						key={`${step.step}-${step.action}`}
						style={{
							display: "grid",
							gridTemplateColumns: "34px minmax(150px, 230px) 1fr",
							gap: 10,
							alignItems: "start",
							padding: "12px 0",
							borderBottom: step.step === steps.length ? "none" : "1px solid #f0f0f0",
						}}
					>
						<div style={{ width: 26, height: 26, borderRadius: 13, background: "#1677ff", color: "#fff", textAlign: "center", lineHeight: "26px", fontWeight: 600 }}>
							{step.step}
						</div>
						<div>
							<Text strong>{step.action}</Text>
							<div style={{ marginTop: 3 }}>
								{step.price != null && step.price > 0
									? <Text style={{ color: step.action.includes("卖") ? "#389e0d" : "#cf1322", fontSize: 18, fontWeight: 700 }}>{money(step.price, symbol)}</Text>
									: <Text type="secondary">不下单</Text>}
								{step.shares > 0 && (
									<Text>
										{" "}
										×
										{step.shares}
										股
									</Text>
								)}
							</div>
						</div>
						<div>
							<div><Text>{step.condition}</Text></div>
							<div style={{ marginTop: 3 }}>
								<Text type="secondary">
									理由：
									{step.reason}
								</Text>
							</div>
						</div>
					</div>
				))}
			</div>
			{(analysis.sell_shares > 0 || analysis.buyback_shares > 0) && (
				<Row gutter={[8, 8]} style={{ padding: "10px 14px", background: "#f6ffed" }}>
					<Col xs={12} md={6}>
						<Text type="secondary">预计每股价差</Text>
						<div><Text strong>{money(analysis.expected_spread_per_share, symbol)}</Text></div>
					</Col>
					<Col xs={12} md={6}>
						<Text type="secondary">估算双边费用</Text>
						<div><Text strong>{money(analysis.estimated_fees, symbol)}</Text></div>
					</Col>
					<Col xs={12} md={6}>
						<Text type="secondary">预计净降本</Text>
						<div><Text strong style={{ color: Number(analysis.expected_net_reduction || 0) > 0 ? "#cf1322" : "#8c8c8c" }}>{money(analysis.expected_net_reduction, symbol)}</Text></div>
					</Col>
					<Col xs={12} md={6}>
						<Text type="secondary">成交后预计成本</Text>
						<div><Text strong>{money(analysis.projected_effective_cost, symbol)}</Text></div>
					</Col>
				</Row>
			)}
			{analysis.no_trade_condition && (
				<div style={{ padding: "8px 14px", background: "#fffbe6" }}>
					<Text type="warning">
						<WarningOutlined />
						{" "}
						{analysis.no_trade_condition}
					</Text>
				</div>
			)}
		</div>
	);
}

export default function UnwindTrackingPanel() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState<number | "all" | null>(null);
	const [plans, setPlans] = useState<UnwindPlanExt[]>([]);
	const [archived, setArchived] = useState<{ watchlist_id: number, stock_code: string, stock_name: string, recovery: UnwindRecovery }[]>([]);
	const [method, setMethod] = useState<UnwindMethod | null>(null);
	const [now, setNow] = useState(() => new Date());
	const [loadError, setLoadError] = useState("");
	const [failedRefreshIds, setFailedRefreshIds] = useState<number[]>([]);
	const [tradeTarget, setTradeTarget] = useState<{ plan: UnwindPlanExt, side: UnwindTradeSide } | null>(null);
	const [settingsTarget, setSettingsTarget] = useState<UnwindPlanExt | null>(null);
	const [backtestTarget, setBacktestTarget] = useState<UnwindPlanExt | null>(null);
	const [savingTrade, setSavingTrade] = useState(false);
	const savingTradeGuard = useRef(false);
	const [duplicateMessage, setDuplicateMessage] = useState("");
	const [confirmDuplicate, setConfirmDuplicate] = useState(false);
	const [form] = Form.useForm<TradeFormValues>();
	const autoRefreshAttempted = useRef(false);
	const loadSequence = useRef(0);
	const [pollFailed, setPollFailed] = useState(false);
	const receiveMonitoredPlans = useCallback((items: UnwindPlanExt[]) => {
		loadSequence.current += 1;
		setPollFailed(false);
		setLoadError("");
		setPlans(items);
		setNow(new Date());
	}, []);

	const loadData = useCallback(async (allowInitialRefresh = true) => {
		setLoading(true);
		const requestId = ++loadSequence.current;
		try {
			const response = await fetchUnwindPlans(10);
			if (requestId !== loadSequence.current)
				return;
			setPollFailed(false);
			if (response.status !== "success")
				throw new Error("读取策略失败，请重试");
			const items = (response.data?.items || []) as UnwindPlanExt[];
			setPlans(items);
			setArchived((response.data as typeof response.data & { archived?: typeof archived }).archived || []);
			setMethod(response.data?.method || null);
			setNow(new Date());
			setLoadError("");
			const needsInitialAnalysis = items.length > 0 && items.some(item =>
				!item.latest_analysis
				|| !item.latest_analysis.execution_steps?.length
				|| !item.latest_analysis.currency_symbol
				|| !item.latest_analysis.diagnosis
				|| item.latest_analysis.strategy_version !== "unwind-v2"
				|| item.latest_analysis.decision === "DATA_STALE",
			);
			if (allowInitialRefresh && needsInitialAnalysis && !autoRefreshAttempted.current) {
				autoRefreshAttempted.current = true;
				const refreshed = await refreshUnwindPlans();
				if (refreshed.data.total > 0)
					await loadData(false);
			}
		}
		catch (error: any) {
			const detail = await getErrorMessage(error, "加载解套跟踪失败");
			setLoadError(detail);
			message.error(detail);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
		const timer = window.setInterval(() => setNow(new Date()), 30000);
		return () => window.clearInterval(timer);
	}, [loadData]);

	useEffect(() => {
		let alive = true;
		let pending = false;
		const timer = window.setInterval(async () => {
			if (pending || document.hidden)
				return;
			pending = true;
			const requestId = ++loadSequence.current;
			try {
				const response = await fetchUnwindPlans(10);
				if (response.status !== "success")
					throw new Error("读取策略失败");
				if (alive && requestId === loadSequence.current) {
					setPlans(response.data?.items || []);
					setMethod(response.data?.method || null);
					setPollFailed(false);
				}
			}
			catch {
				if (alive)
					setPollFailed(true);
			}
			finally { pending = false; }
		}, 30000);
		return () => {
			alive = false;
			window.clearInterval(timer);
		};
	}, []);

	const handleRefresh = async (watchlistId?: number) => {
		setRefreshing(watchlistId || "all");
		try {
			const response = await refreshUnwindPlans(watchlistId);
			setFailedRefreshIds(previous => [...new Set([
				...previous.filter(id => watchlistId != null && id !== watchlistId),
				...(response.data.errors || []).flatMap(error => plans.filter(plan => plan.watchlist_id === error.watchlist_id || plan.stock_code === error.stock_code).map(plan => plan.watchlist_id)),
			])]);
			if (response.data.errors?.length)
				message.warning(`已更新${response.data.total}只，${response.data.errors.length}项未就绪，请查看当前动作`);
			else
				message.success("已读取后台快照；行情由服务器定时核验，请核对生成时间");
			await loadData(false);
		}
		catch (error: any) {
			setFailedRefreshIds(previous => [...new Set([...previous, ...(watchlistId ? [watchlistId] : plans.map(plan => plan.watchlist_id))])]);
			message.error(await getErrorMessage(error, "刷新失败"));
		}
		finally {
			setRefreshing(null);
		}
	};

	const openTrade = (plan: UnwindPlanExt, side: UnwindTradeSide) => {
		setDuplicateMessage("");
		setConfirmDuplicate(false);
		const analysis = (side !== "add" ? activeUnwindAnalysis(plan) : (plan.latest_analysis || activeUnwindAnalysis(plan))) as UnwindAnalysisExt;
		const lotSize = analysis?.lot_size || 100;
		form.setFieldsValue({
			shares: side === "sell"
				? (analysis?.sell_shares || lotSize)
				: side === "add"
					? (analysis?.add_plan?.shares || lotSize)
					: side === "reduce"
						? lotSize
						: plan.open_sold_shares,
			price: side === "sell"
				? (analysis?.sell_trigger_price || analysis?.sell_zone_low || analysis?.technical?.current_price || 0)
				: side === "add"
					? (analysis?.technical?.current_price || 0)
					: side === "reduce"
						? (analysis?.reduce_plan?.price || analysis?.technical?.current_price || 0)
						: (analysis?.buyback_price || analysis?.technical?.current_price || 0),
			fees: 0,
			trade_date: dayjs().format("YYYY-MM-DD"),
			note: "",
		});
		setTradeTarget({ plan, side });
	};

	const handleTradeSubmit = async () => {
		if (!tradeTarget || savingTradeGuard.current)
			return;
		savingTradeGuard.current = true;
		try {
			const values = await form.validateFields();
			setSavingTrade(true);
			const payload: RecordUnwindTradePayloadExt = {
				side: tradeTarget.side,
				shares: values.shares,
				price: values.price,
				fees: values.fees || 0,
				trade_date: values.trade_date,
				note: values.note,
				expected_last_trade_id: Math.max(0, ...tradeTarget.plan.trades.map(trade => trade.id)),
				confirm_duplicate: Boolean(duplicateMessage && confirmDuplicate),
			};
			const response = await recordUnwindTradeExt(tradeTarget.plan.watchlist_id, payload);
			message.success(response.message || "成交已记录");
			setTradeTarget(null);
			form.resetFields();
			await loadData(false);
		}
		catch (error: any) {
			if (error?.errorFields)
				return;
			let body;
			try {
				body = await error?.response?.clone().json();
			}
			catch { /* Network errors may not include a response. */ }
			if (body?.code === "duplicate_trade") {
				setDuplicateMessage(body.message || body.detail);
				setConfirmDuplicate(false);
				return;
			}
			if (body?.code === "ledger_changed") {
				message.warning(body.message || body.detail);
				setTradeTarget(null);
				form.resetFields();
				await loadData(false);
				return;
			}
			message.error(await getErrorMessage(error, "记录成交失败"));
		}
		finally {
			savingTradeGuard.current = false;
			setSavingTrade(false);
		}
	};

	const extraRules = (method ?? {}) as unknown as Record<string, unknown>;
	const extraRuleKeys = ["diagnosis_rule", "fundamental_rule", "review_rule", "add_rule", "backtest_rule"];
	const tradeAnalysis = tradeTarget?.plan.execution?.plan || tradeTarget?.plan.latest_analysis;
	const cumulativeReduction = formatCurrencyTotals(plans, "cumulative_cost_reduction");
	const cashPool = formatCurrencyTotals(plans, "cash_pool");
	const losingCount = plans.filter(item => (item.latest_analysis?.pnl_pct ?? 0) < 0).length;

	if (loading && !plans.length) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
					<Spin tip="正在同步持仓并生成滚动降本计划..." />
				</div>
			</Card>
		);
	}

	return (
		<div style={{ marginTop: 20 }}>
			<StrategyDateOverview
				plans={plans}
				now={now}
				unavailable={Boolean(loadError) || refreshing !== null || failedRefreshIds.length > 0}
				action={(
					<Button type="primary" icon={<ReloadOutlined />} loading={refreshing !== null || loading} onClick={() => handleRefresh()}>更新全部策略</Button>
				)}
			/>
			{loadError && <Alert type="error" showIcon message="策略读取失败，暂勿按旧快照操作" description={loadError} action={<Button onClick={() => loadData(false)}>重试读取</Button>} style={{ marginBottom: 16 }} />}
			<PriceMonitor onPlans={receiveMonitoredPlans} />
			<PortfolioRisk onSaved={() => handleRefresh()} />
			<Alert
				showIcon
				type="warning"
				icon={<SafetyOutlined />}
				message={`通用规则 · ${method?.name || "底仓保护反T（先卖后买）"}`}
				description={(
					<div>
						<div>{method?.capital_rule || "先卖已有可用仓位，再用卖出资金低价买回，不追加资金。"}</div>
						<Text type="secondary">
							{method?.position_rule}
							；
							{method?.trend_rule}
						</Text>
						{method?.cost_rule && <div><Text type="secondary">{method.cost_rule}</Text></div>}
						{method?.portfolio_rule && <div><Text type="secondary">{method.portfolio_rule}</Text></div>}
						{extraRuleKeys.map((key) => {
							const text = extraRules[key];
							return typeof text === "string" && text
								? <div key={key}><Text type="secondary">{text}</Text></div>
								: null;
						})}
						<div><Text type="secondary">{method?.schedule}</Text></div>
						{Boolean(method?.evidence?.length) && (
							<div style={{ marginTop: 4 }}>
								<Text type="secondary">规则依据：</Text>
								<Space size={8} wrap>
									{method?.evidence?.map(item => (
										<Link key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.title}</Link>
									))}
								</Space>
							</div>
						)}
						<div style={{ marginTop: 4 }}><Text type="danger">{method?.risk_notice}</Text></div>
					</div>
				)}
				style={{ borderRadius: 10, marginBottom: 16 }}
			/>

			{pollFailed && <Alert type="warning" showIcon message="页面更新暂时失败；旧触发提示到期后自动失效，请等待重新连接" style={{ marginBottom: 12 }} />}
			<Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
				<Col xs={12} md={6}><Card className="app-metric-card" size="small"><Statistic title="自动跟踪持仓" value={plans.length} suffix="只" /></Card></Col>
				<Col xs={12} md={6}><Card className="app-metric-card" size="small"><Statistic title="仍低于有效成本" value={losingCount} suffix="只" valueStyle={{ color: "#389e0d" }} /></Card></Col>
				<Col xs={12} md={6}><Card className="app-metric-card" size="small"><Statistic title="剩余仓位分摊的滚动价差" value={cumulativeReduction} valueStyle={{ color: "#cf1322" }} /></Card></Col>
				<Col xs={12} md={6}><Card className="app-metric-card" size="small"><Statistic title="滚动资金池" value={cashPool} /></Card></Col>
			</Row>

			{!plans.length
				? (
					<Card bordered={false} style={{ borderRadius: 12 }}>
						<Empty
							description="暂无持仓。请先在“自选盯盘”加入股票并填写成本价、股数，本页会自动同步。"
						/>
					</Card>
				)
				: (
					<Space direction="vertical" size={16} style={{ width: "100%" }}>
						{[...plans].sort((a, b) => {
							const priority = { BUY_BACK: 0, SELL: 1, WAIT: 2 };
							return priority[a.execution?.signal?.action || "WAIT"] - priority[b.execution?.signal?.action || "WAIT"];
						}).map((plan) => {
							const analysis = activeUnwindAnalysis(plan);
							const time = strategyTime(analysis, now);
							const quote = freshUnwindQuote(plan, now);
							const quoteAt = quoteTimestamp(plan.execution?.signal.quote?.as_of);
							const unavailable = pollFailed || Boolean(loadError) || failedRefreshIds.includes(plan.watchlist_id) || refreshing === "all" || refreshing === plan.watchlist_id;
							const currencySymbol = planCurrencySymbol(plan);
							const lotSize = plan.execution?.plan?.lot_size || analysis?.lot_size || 100;
							const referencePrice = quote && !unavailable ? quote.price : Number(analysis?.technical.current_price || 0);
							const pnl = referencePrice > 0 && plan.effective_cost > 0 ? (referencePrice / plan.effective_cost - 1) * 100 : null;
							const pnlColor = pnl === null ? undefined : pnl >= 0 ? "#cf1322" : "#389e0d";
							const breakeven = plan.recovery?.available ? plan.recovery.remaining_breakeven_price : null;
							return (
								<Card
									key={plan.watchlist_id}
									bordered={false}
									style={{ borderRadius: 12, overflow: "hidden" }}
									styles={{ body: { padding: 18 } }}
									title={(
										<Space wrap>
											<SwapOutlined style={{ color: "#722ed1" }} />
											<Text strong style={{ fontSize: 16 }}>{plan.stock_name}</Text>
											<Text type="secondary">{plan.stock_code}</Text>
											{plan.execution?.plan && (
												<Tag>
													{plan.execution.plan.trading_date}
													{" "}
													预案
												</Tag>
											)}
											{analysis && (
												<Tag color={time.current && !unavailable ? decisionColors[analysis.decision] || "blue" : "default"}>
													{!time.current || unavailable ? "快照判断：" : ""}
													{analysis.decision_label}
												</Tag>
											)}
											{analysis?.position_mode_label && <Tag>{analysis.position_mode_label}</Tag>}
											{plan.open_sold_shares > 0 && (
												<Tag color="geekblue">
													已卖待回
													{plan.open_sold_shares}
													股
												</Tag>
											)}
										</Space>
									)}
									extra={(
										<Button
											size="small"
											icon={<ReloadOutlined />}
											loading={refreshing === plan.watchlist_id}
											onClick={() => handleRefresh(plan.watchlist_id)}
										>
											更新
										</Button>
									)}
								>
									<ExecutionStatus data={unavailable ? undefined : plan.execution} currency={currencySymbol} />
									{(plan.latest_analysis || analysis) && <StrategyOverview plan={plan} analysis={(plan.latest_analysis || analysis) as UnwindAnalysisExt} />}
									<StrategyDateStamp plan={plan} now={now} unavailable={unavailable} />
									{plan.execution && <Alert type={quote && !unavailable ? "info" : "warning"} showIcon style={{ marginBottom: 14 }} message={quote && !unavailable ? `本次监测价 ${money(quote.price, currencySymbol)} · 行情时间 ${beijingTime(quote.at)}` : "盘中报价待更新 / 已过期，不据旧报价操作"} description={`${plan.execution.signal.reason}${quoteAt && !quote ? `；上次行情时间 ${beijingTime(quoteAt)}` : ""}`} />}
									<Row gutter={[12, 12]}>
										<Col xs={12} sm={8} md={4}><Statistic title="剩余持仓均价" value={Number(plan.baseline_cost_price).toFixed(2)} precision={2} prefix={currencySymbol} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="整体回本价（含已实现盈亏）" value={breakeven != null ? Number(breakeven).toFixed(2) : "待核对"} prefix={breakeven != null ? currencySymbol : undefined} valueStyle={{ color: "#722ed1" }} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title={quote && !unavailable ? "最新核验价" : "分析时点价格"} value={referencePrice > 0 ? referencePrice.toFixed(2) : "—"} precision={2} prefix={currencySymbol} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="较策略参考成本" value={pnl != null ? pnl.toFixed(2) : "—"} precision={2} suffix={pnl != null ? "%" : undefined} valueStyle={{ color: pnlColor }} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="当前/本轮基准股数" value={`${plan.current_shares}/${plan.baseline_shares}`} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="滚动资金" value={plan.cash_pool} precision={2} prefix={currencySymbol} /></Col>
									</Row>
									<div style={{ marginTop: 8 }}>
										<Text type="secondary">
											策略参考成本
											{money(plan.effective_cost, currencySymbol)}
											；整体回本价按全部已登记买卖与费用计算。减仓实现的盈亏计入整体回本价，不改写剩余股份的买入均价。
										</Text>
									</div>

									<details style={{ marginTop: 14 }}>
										<summary style={{ cursor: "pointer" }}>盘后技术分析与参考条件（不是当前操作信号）</summary>
										{analysis
											? (
												<>
													<div style={{
														marginTop: 14,
														padding: "12px 14px",
														borderRadius: 9,
														background: analysis.decision === "BUY_BACK" ? "#fff1f0" : analysis.decision === "SELL_SLICE" ? "#fff7e6" : "#f5f5f5",
													}}
													>
														<Row gutter={[16, 10]} align="middle">
															<Col xs={24} md={15}>
																<Space direction="vertical" size={3}>
																	<Space>
																		{analysis.decision === "BUY_BACK"
																			? <ArrowUpOutlined style={{ color: "#cf1322" }} />
																			: <ArrowDownOutlined style={{ color: "#d46b08" }} />}
																		<Text strong>{analysis.decision_label}</Text>
																	</Space>
																	<Text>{analysis.reason}</Text>
																	<Text type="danger">
																		<WarningOutlined />
																		{" "}
																		{analysis.invalid_condition}
																	</Text>
																</Space>
															</Col>
															<Col xs={24} md={9}>
																<Space wrap>
																	{analysis.sell_zone_low != null && (
																		<Tag color="orange">
																			候选卖区
																			{" "}
																			{money(analysis.sell_zone_low, currencySymbol)}
																			-
																			{money(analysis.sell_zone_high, currencySymbol)}
																		</Tag>
																	)}
																	{analysis.sell_shares > 0 && (
																		<Tag>
																			建议滚动
																			{" "}
																			{analysis.sell_shares}
																			股
																		</Tag>
																	)}
																	{analysis.buyback_price != null && (
																		<Tag color="red">
																			买回不高于
																			{" "}
																			{money(analysis.buyback_price, currencySymbol)}
																		</Tag>
																	)}
																	<Tag>
																		最小价差
																		{" "}
																		{analysis.min_spread_pct}
																		%
																	</Tag>
																</Space>
															</Col>
														</Row>
													</div>

													<ExecutionGuide analysis={analysis} historical={!time.current || unavailable} />
													<div style={{ marginTop: 12 }}><AnalysisDetails analysis={analysis} /></div>

												</>
											)
											: (
												<Alert
													type="info"
													showIcon
													message="暂无日线分析"
													description="点击“更新”拉取至少16个交易日行情并生成首份计划。"
													style={{ marginTop: 12 }}
												/>
											)}

									</details>
									<Space wrap style={{ marginTop: 14 }}>
										<RiskReview watchlistId={plan.watchlist_id} />
										<Button onClick={() => setSettingsTarget(plan)}>策略设置</Button>
										<Button onClick={() => setBacktestTarget(plan)}>历史回测</Button>
										<Button disabled={plan.open_sold_shares > 0} onClick={() => openTrade(plan, "add")}>记录补仓</Button>
										<Button disabled={plan.open_sold_shares > 0 || plan.current_shares <= 0} onClick={() => openTrade(plan, "reduce")}>记录卖出</Button>
										<Button disabled={plan.open_sold_shares < lotSize} onClick={() => openTrade(plan, "buy")}>录入已成交买回</Button>
										<Text type="secondary">只录入券商已成交记录；按钮不会下单，未录入卖出前不会提示买回。</Text>
									</Space>

									{(plan.analysis_history.length > 0 || plan.trades.length > 0) && (
										<Collapse
											ghost
											style={{ marginTop: 10 }}
											items={[
												{
													key: "history",
													label: `每日跟踪记录（${plan.analysis_history.length}）`,
													children: (
														<Table
															size="small"
															rowKey="id"
															pagination={false}
															dataSource={plan.analysis_history.slice(0, 10)}
															columns={[
																{ title: "日期", dataIndex: "trading_date", width: 110 },
																{ title: "收盘价", dataIndex: "current_price", width: 100, render: value => money(value, currencySymbol) },
																{ title: "距有效成本", dataIndex: "pnl_pct", width: 120, render: value => `${signed(value)}%` },
																{ title: "判断", dataIndex: "decision", render: (_, row) => <Tag color={decisionColors[row.decision] || "blue"}>{row.analysis_data?.decision_label || row.decision}</Tag> },
															]}
														/>
													),
												},
												{
													key: "trades",
													label: `实际成交记录（${plan.trades.length}）`,
													children: plan.trades.length
														? (
															<Table
																size="small"
																rowKey="id"
																pagination={false}
																dataSource={plan.trades}
																columns={[
																	{ title: "日期", dataIndex: "trade_date", width: 110 },
																	{ title: "成交用途", dataIndex: "side", width: 120, render: (value: UnwindTradeSide) => <Tag color={value === "sell" || value === "reduce" ? "green" : "red"}>{sideLabels[value] || value}</Tag> },
																	{ title: "股数", dataIndex: "shares", width: 90 },
																	{ title: "价格", dataIndex: "price", width: 100, render: value => money(value, currencySymbol) },
																	{ title: "费用", dataIndex: "fees", width: 90, render: value => money(value, currencySymbol) },
																	{ title: "做T净降本", dataIndex: "cost_reduction", render: (value, trade: UnwindTradeExt) => trade.side === "buy" ? <Text style={{ color: Number(value) >= 0 ? "#cf1322" : "#389e0d" }}>{money(value, currencySymbol)}</Text> : trade.side === "sell" ? "待接回结算" : trade.side === "reduce" ? "计入整体盈亏" : "—" },
																]}
															/>
														)
														: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未记录实际成交" />,
												},
											]}
										/>
									)}
								</Card>
							);
						})}
					</Space>
				)}

			<Modal
				open={Boolean(tradeTarget)}
				title={tradeTarget
					? `${tradeTarget.plan.stock_name} · 记录${sideLabels[tradeTarget.side]}成交`
					: ""}
				okText={duplicateMessage && confirmDuplicate ? "确认登记另一笔" : "确认记录"}
				okButtonProps={{ disabled: Boolean(duplicateMessage && !confirmDuplicate) }}
				cancelText="取消"
				confirmLoading={savingTrade}
				onOk={handleTradeSubmit}
				onCancel={() => {
					setTradeTarget(null);
					form.resetFields();
				}}
				destroyOnClose
			>
				{tradeTarget && (
					<>
						{(tradeTarget.side === "reduce" || tradeTarget.side === "sell") && (
							<div style={{ marginBottom: 16 }}>
								<div style={{ marginBottom: 8 }}>这笔卖出是否准备接回？同一笔券商成交只登记一次。</div>
								<Radio.Group
									value={tradeTarget.side}
									onChange={(event) => {
										setTradeTarget({ ...tradeTarget, side: event.target.value });
										setDuplicateMessage("");
										setConfirmDuplicate(false);
									}}
								>
									<Radio value="reduce">减仓，不接回</Radio>
									<Radio value="sell" disabled={Math.floor(tradeTarget.plan.baseline_shares * 0.3 / (tradeAnalysis?.lot_size || 100)) < 1}>做T卖出，准备接回</Radio>
								</Radio.Group>
							</div>
						)}
						{duplicateMessage && <Alert type="warning" showIcon message={duplicateMessage} description={<Checkbox checked={confirmDuplicate} onChange={event => setConfirmDuplicate(event.target.checked)}>我已核对券商成交记录，这是另一笔独立成交，仍需登记</Checkbox>} style={{ marginBottom: 16 }} />}
						<Alert
							type={tradeTarget.side === "sell" ? "warning" : "info"}
							showIcon
							message={tradeTarget.side === "add"
								? "填写券商已成交的股数、价格和日期即可，支持补录昨日成交，无需先配置预算或确认今日资金。保存后自动更新持仓和成本，解套策略及滚动资金池规则不变。"
								: tradeTarget.side === "reduce"
									? "记录实际卖出的减仓成交：剩余仓位的每股有效成本不变，回笼资金不进入滚动资金池。"
									: tradeTarget.side === "sell"
										? tradeAnalysis?.position_mode === "ONE_LOT_FULL_ROTATION"
											? "只记录已经实际成交的卖单；一手整手回转会暂时清空该股票，存在卖出后踏空风险。"
											: `只记录已经实际成交的卖单；系统将至少保留${tradeAnalysis?.core_floor_shares || 0}股。`
										: `只能使用滚动资金池${money(tradeTarget.plan.cash_pool, planCurrencySymbol(tradeTarget.plan))}，最多买回${tradeTarget.plan.open_sold_shares}股。`}
							style={{ marginBottom: 16 }}
						/>
						<Form
							form={form}
							layout="vertical"
							onValuesChange={() => {
								setDuplicateMessage("");
								setConfirmDuplicate(false);
							}}
						>
							<Row gutter={12}>
								<Col span={12}>
									<Form.Item
										name="shares"
										label="实际成交股数"
										rules={[
											{ required: true, message: "请输入股数" },
											{
												validator: (_, value) => value > 0 && ((value === tradeTarget.plan.current_shares && ["sell", "reduce"].includes(tradeTarget.side)) || (/^68[89]/.test(tradeTarget.plan.stock_code) ? value >= 200 : value % (tradeAnalysis?.lot_size || 100) === 0))
													? Promise.resolve()
													: Promise.reject(new Error(`必须为${tradeAnalysis?.lot_size || 100}股的整数倍`)),
											},
										]}
									>
										<InputNumber
											min={1}
											step={/^68[89]/.test(tradeTarget.plan.stock_code) ? 1 : tradeAnalysis?.lot_size || 100}
											precision={0}
											style={{ width: "100%" }}
										/>
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item name="price" label="实际成交价" rules={[{ required: true, message: "请输入成交价" }]}>
										<InputNumber min={0.001} step={0.01} precision={3} prefix={planCurrencySymbol(tradeTarget.plan)} style={{ width: "100%" }} />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={12}>
								<Col span={12}>
									<Form.Item name="fees" label="实际佣金及税费">
										<InputNumber min={0} step={0.01} precision={2} prefix={planCurrencySymbol(tradeTarget.plan)} style={{ width: "100%" }} />
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item
										name="trade_date"
										label="成交日期"
										rules={[
											{ required: true, message: "请输入日期" },
											{ pattern: /^\d{4}-\d{2}-\d{2}$/, message: "格式为 YYYY-MM-DD" },
										]}
									>
										<Input placeholder="YYYY-MM-DD" />
									</Form.Item>
								</Col>
							</Row>
							<Form.Item name="note" label="备注（可选）">
								<Input.TextArea rows={2} maxLength={500} />
							</Form.Item>
						</Form>
					</>
				)}
			</Modal>

			{archived.length > 0 && (
				<Card title="已清仓损益记录" style={{ marginTop: 16 }}>
					<Table
						pagination={false}
						rowKey="watchlist_id"
						dataSource={archived}
						columns={[
							{ title: "股票", dataIndex: "stock_name" },
							{ title: "代码", dataIndex: "stock_code" },
							{ title: "累计总损益", render: (_, item) => item.recovery.available ? money(item.recovery.total_pnl, /^\d{5}$/.test(item.stock_code) ? "HK$" : "¥") : item.recovery.reason },
							{ title: "结果", render: (_, item) => item.recovery.total_recovered ? "已回本" : "已清仓，损失保留" },
						]}
					/>
				</Card>
			)}
			<SettingsModal
				plan={settingsTarget}
				onClose={() => setSettingsTarget(null)}
				onSaved={() => loadData(false)}
			/>
			<BacktestModal plan={backtestTarget} onClose={() => setBacktestTarget(null)} />
		</div>
	);
}
