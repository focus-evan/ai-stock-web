import type { UnwindAlertEvent, UnwindPlan } from "#src/api/strategy";
import type { UnwindPriceAlert } from "./price-alerts";
import { acknowledgeUnwindAlerts, fetchUnwindAlerts, fetchUnwindPlans } from "#src/api/strategy";
import { useAuthStore } from "#src/store/auth";
import { useUserStore } from "#src/store/user";
import { BellOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Modal, Space, Tag } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlertInvalidConditions from "./AlertInvalidConditions";
import { isLiveUnwindAlert } from "./live-alerts";
import { UNWIND_ALERT_Z_INDEX, useUnwindMonitorStore } from "./monitor-store";
import { freshUnwindQuote, MONITOR_INTERVAL, quoteTimestamp } from "./price-alerts";
import PriceMonitor from "./PriceMonitor";
import { beijingTime, timestamp } from "./strategy-time";
import "./strategy-time.css";

interface SavedAlert extends UnwindPriceAlert { id: number, stage: string, read: boolean, shadow: boolean, shares: number, quoteTime: number, invalidConditions: string[], plannedSell: number, plannedBuyback: number }
function firstPrice(...values: Array<number | null | undefined>) {
	return values.find(value => Number.isFinite(value) && Number(value) > 0) || 0;
}
function savedAlert(event: UnwindAlertEvent, plan?: UnwindPlan): SavedAlert {
	const signal = event.payload;
	const at = quoteTimestamp(signal.quote?.as_of);
	const side = signal.event_action === "BUY_BACK" ? "buy" : "sell";
	const dailyPlan = plan?.execution?.plan;
	const target = event.stage === "confirmed" && signal.action !== "WAIT" ? signal.limit_price || 0 : signal.target_price || 0;
	return { id: event.id, key: String(event.id), stockCode: event.stock_code, stockName: event.stock_name, side, price: signal.quote?.price || 0, target, symbol: /^\d{5}$/.test(event.stock_code) ? "HK$" : "¥", quoteTime: at?.getTime() || 0, quoteAt: at ? beijingTime(at) : "未取得", expiresAt: timestamp(signal.valid_until)?.getTime() || 0, strategyDate: event.trading_date, reason: signal.reason, confirmed: event.stage === "confirmed", stage: event.stage, read: Boolean(event.read_at), shadow: signal.validation_status === "shadow", shares: signal.shares || signal.planned_shares || 0, invalidConditions: Array.isArray(signal.invalid_conditions) ? signal.invalid_conditions.filter(value => typeof value === "string" && value.trim()) : [], plannedSell: firstPrice(side === "sell" ? signal.limit_price : null, side === "sell" ? signal.target_price : null, dailyPlan?.sell_zone_low), plannedBuyback: firstPrice(signal.buyback_target_price, side === "buy" ? signal.limit_price : null, side === "buy" ? signal.target_price : null, dailyPlan?.buyback_price) };
}
function hasFreshPrice(alert: SavedAlert, now: Date) {
	const age = now.getTime() - alert.quoteTime;
	return Number.isFinite(alert.price) && alert.price > 0 && alert.quoteTime > 0 && age >= -5000 && age <= 120000 && alert.quoteAt.slice(0, 10) === beijingTime(now).slice(0, 10);
}
const enabledKey = "unwind-price-monitor-enabled-v1";
function readEnabled(userId: string) {
	try {
		return localStorage.getItem(`${enabledKey}:${userId}`) !== "false";
	}
	catch { return true; }
}

function UnwindMonitorSession({ userId }: { userId: string }) {
	const [enabled, setEnabled] = useState(() => readEnabled(userId));
	const [plans, setPlans] = useState<UnwindPlan[]>([]);
	const [centerOpen, setCenterOpen] = useState(false);
	const [container, setContainer] = useState<HTMLElement>(() => document.fullscreenElement as HTMLElement || document.body);
	const [checking, setChecking] = useState(false);
	const [checkedAt, setCheckedAt] = useState<Date | null>(null);
	const [nextAt, setNextAt] = useState<Date | null>(null);
	const [note, setNote] = useState("正在准备首次价格检查");
	const [error, setError] = useState("");
	const [alerts, setAlerts] = useState<SavedAlert[]>([]);
	const [history, setHistory] = useState<SavedAlert[]>([]);
	const [historyOpen, setHistoryOpen] = useState(false);
	const [open, setOpen] = useState(false);
	const [now, setNow] = useState(() => new Date());
	const seen = useRef(new Set<number>());
	const delivered = useRef(new Set<number>());
	const read = useRef(new Set<number>());
	const alertsRef = useRef(alerts);
	alertsRef.current = alerts;
	const [acknowledging, setAcknowledging] = useState(false);
	const inFlight = useRef(false);
	const generation = useRef(0);
	const lastAttempt = useRef(0);
	const clockAnchor = useRef<{ server: number, received: number } | null>(null);
	const currentAlerts = useMemo(() => alerts.filter(alert => !alert.read && alert.expiresAt > now.getTime()), [alerts, now]);
	const actionCount = currentAlerts.filter(alert => alert.confirmed).length;
	const reviewOnly = actionCount === 0;
	const reviewTitle = currentAlerts.some(alert => alert.stage === "risk") ? "风险复核提醒" : "退出评估提醒";
	const check = useCallback(async () => {
		if (inFlight.current)
			return;
		inFlight.current = true;
		const run = generation.current;
		lastAttempt.current = Date.now();
		setNextAt(new Date(lastAttempt.current + MONITOR_INTERVAL));
		setChecking(true);
		try {
			const [planResult, alertResult] = await Promise.allSettled([fetchUnwindPlans(10), fetchUnwindAlerts()]);
			if (run !== generation.current)
				return;
			const received = Date.now();
			const server = alertResult.status === "fulfilled" ? timestamp(alertResult.value.data.server_time)?.getTime() : undefined;
			const estimated = clockAnchor.current ? clockAnchor.current.server + received - clockAnchor.current.received : server ?? received;
			const checked = new Date(Math.max(server ?? estimated, estimated));
			clockAnchor.current = { server: checked.getTime(), received };
			setNow(checked);
			const failures: string[] = [];
			const items = planResult.status === "fulfilled" && planResult.value.status === "success" ? planResult.value.data.items : [];
			if (planResult.status === "fulfilled" && planResult.value.status === "success") {
				setPlans(items);
				setCheckedAt(checked);
				const freshCount = items.filter(plan => freshUnwindQuote(plan, checked)).length;
				const intraday = items.some(plan => plan.execution?.signal.phase === "intraday");
				setNote(!intraday ? "非连续交易时段，等待开盘后核验操作机会" : `已读取 ${items.length} 只 · 有效报价 ${freshCount} 只`);
				if (intraday && freshCount < items.length)
					failures.push(`${items.length - freshCount} 只报价待更新；其余股票继续监控`);
			}
			else {
				setPlans([]);
				failures.push("持仓读取失败，30秒后重试");
			}
			if (alertResult.status === "fulfilled" && alertResult.value.status === "success") {
				const planByStock = new Map(items.map(plan => [plan.stock_code, plan]));
				const hits = alertResult.value.data.items.filter(event => isLiveUnwindAlert(event, checked) && !read.current.has(event.id)).map(event => savedAlert(event, planByStock.get(event.stock_code)));
				const unseen = hits.filter(hit => !seen.current.has(hit.id));
				if (unseen.length) {
					unseen.forEach(hit => seen.current.add(hit.id));
					setOpen(true);
				}
				setAlerts(hits);
			}
			else {
				setAlerts([]);
				failures.push("提醒同步失败，暂停展示操作提醒，30秒后重试");
			}
			setError(failures.join("；"));
		}
		catch {
			if (run === generation.current) {
				setAlerts([]);
				setError("本次同步失败，暂停展示操作提醒，30秒后重试。");
			}
		}
		finally {
			if (run === generation.current) {
				inFlight.current = false;
				setChecking(false);
			}
		}
	}, [userId]);
	const changeEnabled = useCallback((value: boolean) => {
		setEnabled(value);
		setChecking(false);
		try {
			localStorage.setItem(`${enabledKey}:${userId}`, String(value));
		}
		catch {}
	}, [userId]);
	const showHistory = useCallback(async () => {
		const run = generation.current;
		try {
			const response = await fetchUnwindAlerts(true);
			if (run !== generation.current)
				return;
			if (response.status !== "success")
				throw new Error("history unavailable");
			const planByStock = new Map(plans.map(plan => [plan.stock_code, plan]));
			setHistory(response.data.items.map(event => savedAlert(event, planByStock.get(event.stock_code))));
			setHistoryOpen(true);
		}
		catch {
			if (run === generation.current)
				setError("历史提醒读取失败，请重试");
		}
	}, [plans]);
	const acknowledge = async () => {
		const run = generation.current;
		const ids = currentAlerts.map(alert => alert.id);
		setAcknowledging(true);
		try {
			for (let i = 0; i < ids.length; i += 100) {
				if (run !== generation.current)
					return;
				await acknowledgeUnwindAlerts(ids.slice(i, i + 100), "read");
			}
			if (run !== generation.current)
				return;
			ids.forEach(id => read.current.add(id));
			setAlerts(previous => previous.map(alert => ids.includes(alert.id) ? { ...alert, read: true } : alert));
			setOpen(alertsRef.current.some(alert => !alert.read && alert.expiresAt > now.getTime() && !ids.includes(alert.id)));
		}
		catch {
			if (run === generation.current)
				setError("已读保存失败，提醒仍保留，请重试");
		}
		finally {
			if (run === generation.current)
				setAcknowledging(false);
		}
	};
	useEffect(() => {
		if (!enabled || !open || document.visibilityState !== "visible")
			return;
		const ids = currentAlerts.filter(alert => !delivered.current.has(alert.id)).map(alert => alert.id).slice(0, 100);
		if (!ids.length)
			return;
		const run = generation.current;
		void acknowledgeUnwindAlerts(ids, "delivered").then(() => {
			if (run === generation.current)
				ids.forEach(id => delivered.current.add(id));
		}).catch(() => { /* Remains unread and will retry on the next snapshot. */ });
	}, [enabled, open, currentAlerts]);
	const showCurrent = useCallback(() => setOpen(true), []);
	const view = useMemo(() => ({ userId, plans, enabled, checking, checkedAt, nextAt, note, error, alertCount: currentAlerts.length, check, setEnabled: changeEnabled, showCurrent, showHistory }), [userId, plans, enabled, checking, checkedAt, nextAt, note, error, currentAlerts.length, check, changeEnabled, showCurrent, showHistory]);
	useEffect(() => {
		useUnwindMonitorStore.setState({ view });
	}, [view]);
	useEffect(() => {
		const fullscreen = () => setContainer(document.fullscreenElement as HTMLElement || document.body);
		document.addEventListener("fullscreenchange", fullscreen);
		return () => {
			document.removeEventListener("fullscreenchange", fullscreen);
			if (useUnwindMonitorStore.getState().view?.userId === userId)
				useUnwindMonitorStore.setState({ view: null });
		};
	}, [userId]);
	useEffect(() => {
		const clock = window.setInterval(() => {
			const anchor = clockAnchor.current;
			setNow(new Date(anchor ? anchor.server + Date.now() - anchor.received : Date.now()));
		}, 1000);
		return () => window.clearInterval(clock);
	}, []);
	useEffect(() => {
		if (!enabled)
			return;
		void check();
		const timer = window.setInterval(() => {
			if (Date.now() - lastAttempt.current >= MONITOR_INTERVAL)
				void check();
		}, 1000);
		const wake = () => {
			if (document.visibilityState === "visible")
				void check();
		};
		const online = () => {
			void check();
		};
		document.addEventListener("visibilitychange", wake);
		window.addEventListener("online", online);
		return () => {
			generation.current++;
			inFlight.current = false;
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", wake);
			window.removeEventListener("online", online);
		};
	}, [enabled, check]);
	return (
		<>
			<Modal
				title={(
					<Space>
						<BellOutlined />
						{reviewOnly ? reviewTitle : actionCount === currentAlerts.length ? "当前买卖提醒" : "买卖与风险提醒"}
					</Space>
				)}
				rootClassName="unwind-global-alert"
				zIndex={UNWIND_ALERT_Z_INDEX}
				maskClosable={false}
				keyboard={false}
				getContainer={() => container}
				open={enabled && open && currentAlerts.length > 0}
				onCancel={() => setOpen(false)}
				footer={<Button type="primary" loading={acknowledging} onClick={() => void acknowledge()}>我已知晓，继续监控</Button>}
				width={660}
			>
				{error && <Alert type="warning" showIcon message={error} />}
				<div style={{ maxHeight: "55vh", overflowY: "auto" }}>
					{currentAlerts.map(alert => (
						<article className="unwind-price-hit" key={alert.key}>
							<strong>
								{alert.stockName}
								{" "}
								{alert.stockCode}
							</strong>
							{" "}
							<Tag color={alert.stage === "risk" ? "red" : "orange"}>{alert.stage === "risk" ? "风险复核中" : alert.stage === "recovery" ? "评估减仓或退出" : alert.side === "buy" ? "现在可接回" : "现在可卖出"}</Tag>
							<p>
								现价：
								<b>{hasFreshPrice(alert, now) ? `${alert.symbol}${alert.price.toFixed(3)}` : "行情待更新"}</b>
								{!hasFreshPrice(alert, now) && alert.price > 0 && Number.isFinite(alert.price) && (
									<span>
										{" "}
										· 上次报价
										{alert.symbol}
										{alert.price.toFixed(3)}
										（仅供参考）
									</span>
								)}
							</p>
							<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, margin: "10px 0" }} aria-label="计划价格">
								<div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-warning-bg, #fffbe6)" }}>
									<div>计划卖出价（不低于）</div>
									<strong style={{ fontSize: 22 }}>{alert.plannedSell > 0 ? `${alert.symbol}${alert.plannedSell.toFixed(3)}` : "待生成"}</strong>
								</div>
								<div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-error-bg, #fff2f0)" }}>
									<div>计划买回价（不高于）</div>
									<strong style={{ fontSize: 22 }}>{alert.plannedBuyback > 0 ? `${alert.symbol}${alert.plannedBuyback.toFixed(3)}` : "待生成"}</strong>
								</div>
							</div>
							<p>
								<b>{alert.stage === "risk" ? "暂停原因：" : alert.stage === "recovery" ? "当前待办：" : "操作依据："}</b>
								{alert.reason}
							</p>
							{alert.confirmed && alert.shares > 0 && (
								<p>
									本次最多
									{alert.shares}
									{" "}
									股 ·
									{alert.side === "buy" ? "接回" : "卖出旧仓"}
									，以券商可用数量和当前有效信号为准
								</p>
							)}
							<p>
								策略日期
								{alert.strategyDate}
								{" "}
								· 行情时间
								{alert.quoteAt}
								（北京时间）
							</p>
						</article>
					))}
				</div>
			</Modal>
			<Modal title="历史提醒 · 仅供复盘" open={historyOpen} onCancel={() => setHistoryOpen(false)} footer={null} width={660} zIndex={UNWIND_ALERT_Z_INDEX - 1} getContainer={() => container}>
				<Alert type="info" showIcon message="历史记录不会弹窗催办，不计入当前操作提醒。" />
				<div style={{ maxHeight: "55vh", overflowY: "auto" }}>
					{history.length === 0 && <Empty description="暂无历史提醒" />}
					{history.map(alert => (
						<article className="unwind-price-hit" key={alert.key}>
							<strong>
								{alert.stockName}
								{" "}
								{alert.stockCode}
							</strong>
							{" "}
							<Tag>{alert.stage === "risk" ? "风险记录" : alert.stage === "recovery" ? "修复观察" : alert.shadow ? "验证信号" : alert.confirmed ? "条件确认记录" : "候选记录"}</Tag>
							{now.getTime() >= alert.expiresAt && <Tag>已过期 · 仅供复盘</Tag>}
							<p>
								策略日期
								{alert.strategyDate}
								{" "}
								· 行情时间
								{alert.quoteAt}
								（北京时间）
							</p>
							<p>{alert.reason}</p>
							<AlertInvalidConditions conditions={alert.invalidConditions} symbol={alert.symbol} />
						</article>
					))}
				</div>
			</Modal>
			<Modal title="解套全局监控" open={centerOpen} onCancel={() => setCenterOpen(false)} footer={null} width={720} zIndex={UNWIND_ALERT_Z_INDEX - 10} getContainer={() => container}>
				<PriceMonitor />
			</Modal>
			{createPortal(
				<Button className="unwind-global-monitor-button" icon={<BellOutlined />} onClick={() => setCenterOpen(true)} aria-label="打开解套全局监控">
					解套提醒 ·
					{enabled ? "监控中" : "已暂停"}
				</Button>,
				container,
			)}
		</>
	);
}

/** Mounted beside the router: navigation and page suspense never restart monitoring. */
export default function GlobalPriceMonitor() {
	const authenticated = useAuthStore(state => Boolean(state.token));
	const userId = useUserStore(state => state.id);
	return authenticated && userId ? <UnwindMonitorSession key={userId} userId={userId} /> : null;
}
