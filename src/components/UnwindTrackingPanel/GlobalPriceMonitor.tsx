import type { UnwindPlan } from "#src/api/strategy";
import type { UnwindPriceAlert } from "./price-alerts";
import { fetchUnwindPlans, refreshUnwindExecution } from "#src/api/strategy";
import { useAuthStore } from "#src/store/auth";
import { useUserStore } from "#src/store/user";
import { BellOutlined } from "@ant-design/icons";
import { Alert, Button, Modal, Space, Tag } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { wildmanAlertEligible } from "../WildmanDailyPanel/daily-guide";
import { UNWIND_ALERT_Z_INDEX, useUnwindMonitorStore } from "./monitor-store";
import { freshUnwindQuote, MONITOR_INTERVAL, newPriceAlerts } from "./price-alerts";
import PriceMonitor from "./PriceMonitor";
import { beijingTime } from "./strategy-time";
import "./strategy-time.css";

const seenKey = "unwind-price-alerts-seen-v1";
const enabledKey = "unwind-price-monitor-enabled-v1";
function readEnabled(userId: string) {
	try {
		return localStorage.getItem(`${enabledKey}:${userId}`) !== "false";
	}
	catch { return true; }
}
function readSeen(userId: string) {
	try {
		const saved = JSON.parse(sessionStorage.getItem(`${seenKey}:${userId}`) || "[]");
		const today = beijingTime(new Date()).slice(0, 10);
		return new Set<string>(Array.isArray(saved) ? saved.filter(key => typeof key === "string" && key.startsWith(`${today}:`)) : []);
	}
	catch { return new Set<string>(); }
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
	const [alerts, setAlerts] = useState<UnwindPriceAlert[]>([]);
	const [open, setOpen] = useState(false);
	const [now, setNow] = useState(() => new Date());
	const seen = useRef(readSeen(userId));
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
			const refreshed = await refreshUnwindExecution();
			if (run !== generation.current)
				return;
			const response = await fetchUnwindPlans(10);
			if (run !== generation.current)
				return;
			if (response.status !== "success")
				throw new Error("策略读取失败");
			const items = response.data.items;
			const checked = new Date();
			setPlans(items);
			setCheckedAt(checked);
			setNow(checked);
			const failures = refreshed.data.errors || [];
			const eligible = failures.some(failure => !failure.stock_code) ? [] : items.filter(item => !failures.some(failure => failure.stock_code === item.stock_code));
			const freshCount = eligible.filter(plan => freshUnwindQuote(plan, checked)).length;
			const intraday = items.some(plan => plan.execution?.signal.phase === "intraday");
			setNote(!intraday ? "当前休市 / 非连续交易时段，不发到价提醒" : `已检查 ${items.length} 只 · 有效报价 ${freshCount} 只 · 其余等待新行情`);
			setError(failures.length ? `${failures.length} 项更新未成功，本轮跳过相关提醒；10分钟后重试。` : intraday && !freshCount ? "暂无有效的新报价，本轮不发到价提醒。" : "");
			const hits = newPriceAlerts(eligible.filter(plan => wildmanAlertEligible(plan, checked)), seen.current, checked);
			if (hits.length) {
				try {
					sessionStorage.setItem(`${seenKey}:${userId}`, JSON.stringify([...seen.current]));
				}
				catch {}
				setAlerts(previous => [...hits, ...previous.filter(alert => !hits.some(hit => hit.key === alert.key))].slice(0, 30));
				setOpen(true);
			}
		}
		catch {
			if (run === generation.current)
				setError("本次价格检查失败，未使用旧行情提醒；10分钟后重试，也可立即检查。");
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
	const showHistory = useCallback(() => setOpen(true), []);
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
			if (document.visibilityState === "visible" && Date.now() - lastAttempt.current >= MONITOR_INTERVAL)
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
				footer={<Button type="primary" onClick={() => setOpen(false)}>我已知晓，继续监控</Button>}
				width={660}
			>
				<Alert type="warning" showIcon message="到价提醒不等于可以立即下单；请复核盘中条件与券商可用数量。" style={{ marginBottom: 12 }} />
				<div style={{ maxHeight: "55vh", overflowY: "auto" }}>
					{alerts.map(alert => (
						<article className="unwind-price-hit" key={alert.key}>
							<strong>
								{alert.stockName}
								{" "}
								{alert.stockCode}
							</strong>
							{" "}
							<Tag color={now.getTime() > alert.expiresAt ? "default" : "orange"}>{now.getTime() > alert.expiresAt ? "提醒快照已过期，请重新检查" : alert.side === "buy" ? "到达接回关注价" : "进入候选卖出区"}</Tag>
							<p>
								检查时价格
								<b>
									{alert.symbol}
									{alert.price.toFixed(3)}
								</b>
								{" "}
								· 目标价
								<b>
									{alert.symbol}
									{alert.target.toFixed(3)}
								</b>
							</p>
							<p>
								策略日期
								{alert.strategyDate}
								{" "}
								· 行情时间
								{alert.quoteAt}
								（北京时间）
							</p>
							<p>
								<b>{alert.confirmed ? "触发条件已通过，仍需复核：" : "仅价格到位，其他条件待确认："}</b>
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
