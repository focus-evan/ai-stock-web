import type { UnwindAlertEvent, UnwindPlan } from "#src/api/strategy";
import type { UnwindPriceAlert } from "./price-alerts";
import { acknowledgeUnwindAlerts, fetchUnwindAlerts, fetchUnwindPlans } from "#src/api/strategy";
import { useAuthStore } from "#src/store/auth";
import { useUserStore } from "#src/store/user";
import { BellOutlined } from "@ant-design/icons";
import { Alert, Button, Modal, Space, Tag } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlertInvalidConditions from "./AlertInvalidConditions";
import { UNWIND_ALERT_Z_INDEX, useUnwindMonitorStore } from "./monitor-store";
import { freshUnwindQuote, MONITOR_INTERVAL, quoteTimestamp } from "./price-alerts";
import PriceMonitor from "./PriceMonitor";
import { beijingTime, timestamp } from "./strategy-time";
import "./strategy-time.css";

interface SavedAlert extends UnwindPriceAlert { id: number, stage: string, read: boolean, shadow: boolean, shares: number, invalidConditions: string[] }
function savedAlert(event: UnwindAlertEvent): SavedAlert {
	const signal = event.payload;
	const at = quoteTimestamp(signal.quote?.as_of);
	return { id: event.id, key: String(event.id), stockCode: event.stock_code, stockName: event.stock_name, side: signal.event_action === "BUY_BACK" ? "buy" : "sell", price: signal.quote?.price || 0, target: signal.target_price || signal.limit_price || 0, symbol: /^\d{5}$/.test(event.stock_code) ? "HK$" : "¥", quoteAt: at ? beijingTime(at) : signal.checked_at || "未核验", expiresAt: timestamp(signal.valid_until)?.getTime() || 0, strategyDate: event.trading_date, reason: signal.reason, confirmed: event.stage === "confirmed", stage: event.stage, read: Boolean(event.read_at), shadow: signal.validation_status === "shadow", shares: signal.planned_shares || signal.shares || 0, invalidConditions: Array.isArray(signal.invalid_conditions) ? signal.invalid_conditions.filter(value => typeof value === "string" && value.trim()) : [] };
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
			const checked = alertResult.status === "fulfilled" ? timestamp(alertResult.value.data.server_time) || new Date() : new Date();
			setNow(checked);
			const failures: string[] = [];
			if (planResult.status === "fulfilled" && planResult.value.status === "success") {
				const items = planResult.value.data.items;
				setPlans(items);
				setCheckedAt(checked);
				const freshCount = items.filter(plan => freshUnwindQuote(plan, checked)).length;
				const intraday = items.some(plan => plan.execution?.signal.phase === "intraday");
				setNote(!intraday ? "非连续交易时段，保留预案和历史提醒" : `已读取 ${items.length} 只 · 有效报价 ${freshCount} 只`);
				if (intraday && freshCount < items.length)
					failures.push(`${items.length - freshCount} 只报价待更新；其余股票继续监控`);
			}
			else {
				setPlans([]);
				failures.push("持仓读取失败，30秒后重试");
			}
			if (alertResult.status === "fulfilled" && alertResult.value.status === "success") {
				const hits = alertResult.value.data.items.map(savedAlert).map(item => ({ ...item, read: item.read || read.current.has(item.id) }));
				const unseen = hits.filter(hit => !seen.current.has(hit.id));
				if (unseen.length) {
					unseen.forEach(hit => seen.current.add(hit.id));
					setOpen(true);
				}
				setAlerts(previous => [...hits, ...previous.filter(alert => !hits.some(hit => hit.id === alert.id))].slice(0, 200));
			}
			else {
				failures.push("提醒同步失败，未读事件仍在服务器，30秒后重试");
			}
			setError(failures.join("；"));
		}
		catch {
			if (run === generation.current)
				setError("本次同步失败，30秒后重试；未读事件会保留。");
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
			setAlerts(previous => [...previous.filter(alert => !alert.read), ...response.data.items.map(savedAlert).filter(item => !previous.some(alert => !alert.read && alert.id === item.id))]);
			setOpen(true);
		}
		catch {
			if (run === generation.current)
				setError("历史提醒读取失败，请重试");
		}
	}, []);
	const acknowledge = async () => {
		const run = generation.current;
		const ids = alerts.filter(alert => !alert.read).map(alert => alert.id);
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
			setOpen(alertsRef.current.some(alert => !alert.read && !ids.includes(alert.id)));
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
		if (!open || document.visibilityState !== "visible")
			return;
		const ids = alerts.filter(alert => !delivered.current.has(alert.id)).map(alert => alert.id).slice(0, 100);
		if (!ids.length)
			return;
		const run = generation.current;
		void acknowledgeUnwindAlerts(ids, "delivered").then(() => {
			if (run === generation.current)
				ids.forEach(id => delivered.current.add(id));
		}).catch(() => { /* Remains unread and will retry on the next snapshot. */ });
	}, [open, alerts]);
	const view = useMemo(() => ({ userId, plans, enabled, checking, checkedAt, nextAt, note, error, alertCount: alerts.length, check, setEnabled: changeEnabled, showHistory }), [userId, plans, enabled, checking, checkedAt, nextAt, note, error, alerts.length, check, changeEnabled, showHistory]);
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
		const clock = window.setInterval(() => setNow(new Date()), 30000);
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
						高优先级 · 解套到价提醒
					</Space>
				)}
				rootClassName="unwind-global-alert"
				zIndex={UNWIND_ALERT_Z_INDEX}
				maskClosable={false}
				keyboard={false}
				getContainer={() => container}
				open={open}
				onCancel={() => setOpen(false)}
				footer={<Button type="primary" loading={acknowledging} onClick={() => void acknowledge()}>我已知晓，继续监控</Button>}
				width={660}
			>
				<Alert type="warning" showIcon message="以下为服务器保存的事件快照。验证信号与过期提醒仅供跟踪；当前操作请核对持仓卡片的最新状态。" style={{ marginBottom: 12 }} />
				{error && <Alert type="warning" showIcon message={error} />}
				<div style={{ maxHeight: "55vh", overflowY: "auto" }}>
					{alerts.map(alert => (
						<article className="unwind-price-hit" key={alert.key}>
							<strong>
								{alert.stockName}
								{" "}
								{alert.stockCode}
							</strong>
							{" "}
							<Tag color={alert.stage === "risk" ? "red" : "orange"}>{alert.stage === "risk" ? "风险需处理" : alert.stage === "recovery" ? "修复或成本线 · 评估退出" : alert.shadow ? "验证信号 · 暂不下单" : alert.confirmed ? "历史条件确认" : "候选到价"}</Tag>
							{now.getTime() > alert.expiresAt && <Tag>已过期 · 仅供复盘</Tag>}
							<Tag>{alert.read ? "已读" : "未读"}</Tag>
							<p>
								检查时价格
								<b>
									{alert.price > 0 ? `${alert.symbol}${alert.price.toFixed(3)}` : "未核验"}
								</b>
								{" "}
								· 目标价
								<b>
									{alert.target > 0 ? `${alert.symbol}${alert.target.toFixed(3)}` : "无下单目标"}
								</b>
							</p>
							<AlertInvalidConditions conditions={alert.invalidConditions} symbol={alert.symbol} />
							{alert.shares > 0 && (
								<p>
									当时计划最多
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
							<p>
								<b>{alert.stage === "risk" || alert.stage === "recovery" ? "状态变化，请复核：" : alert.confirmed ? "当时技术条件已通过，仍需复核：" : "仅价格到位，其他条件待确认："}</b>
								{alert.reason}
							</p>
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
