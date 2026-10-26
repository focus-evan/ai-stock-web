import { useAccessStore } from "#src/store/access";
import { useAuthStore } from "#src/store/auth";
import { useTabsStore } from "#src/store/tabs";
import { useUserStore } from "#src/store/user";
import { useEffect, useState } from "react";
import WildmanDailyRecommendations from "./daily";
import WildmanHoldingsPanel from "./holdings";
import "./style.css";

export type WildmanTab = "daily" | "unwind";
export const WILDMAN_WORKSPACE_PATH = "/short-term-strategy/stock-analysis?tab=wildman";
export const WILDMAN_LOGIN_PATH = `/login?redirect=${encodeURIComponent(WILDMAN_WORKSPACE_PATH)}`;

/** Storage events also reach same-origin iframes, without moving credentials through messages. */
function useCrossWindowAuthentication() {
	useEffect(() => {
		const synchronize = (event: StorageEvent) => {
			if (event.storageArea && event.storageArea !== window.localStorage)
				return;
			if (event.key !== null && event.key !== useAuthStore.persist.getOptions().name)
				return;
			let next = { token: "", refreshToken: "" };
			try {
				const persisted = event.newValue ? JSON.parse(event.newValue)?.state : null;
				if (typeof persisted?.token === "string")
					next = { token: persisted.token, refreshToken: typeof persisted.refreshToken === "string" ? persisted.refreshToken : "" };
			}
			catch { /* Invalid or cleared authentication is treated as signed out. */ }
			if (useAuthStore.getState().token !== next.token) {
				useUserStore.getState().reset();
				useAccessStore.getState().reset();
				useTabsStore.getState().resetTabs();
				// Update authentication once, after removing the previous user's route/tab state.
				useAuthStore.setState(next);
			}
		};
		window.addEventListener("storage", synchronize);
		return () => window.removeEventListener("storage", synchronize);
	}, []);
}

interface WorkspaceProps {
	embedded?: boolean
	initialTab?: WildmanTab
	tab?: WildmanTab
	onTabChange?: (tab: WildmanTab) => void
	onOpenLedger?: () => void
}

function PrivateWorkspace({ initialTab = "daily", tab, onTabChange, onOpenLedger, embedded = false }: WorkspaceProps) {
	const [selected, setSelected] = useState<WildmanTab>(initialTab);
	const active = tab ?? selected;
	const select = (value: WildmanTab) => {
		setSelected(value);
		onTabChange?.(value);
	};
	const openLedger = onOpenLedger ?? (() => {
		window.open("/short-term-strategy/stock-analysis?tab=unwind", "_top");
	});
	return (
		<div className="wildman-workspace">
			<header className="wildman-workspace-heading">
				<div>
					<span>WILDMAN / DAILY WORKSPACE</span>
					<h2>野人每日实战</h2>
					<p>先看今天推荐什么、不推荐什么，再处理自己的持仓。</p>
				</div>
				<a href="/research-library/content/douyin/methods/index.html" target="_top">查看完整交易手册 ↗</a>
			</header>
			<div role="tablist" aria-label="野人每日实战栏目" className="wildman-tabs">
				<button role="tab" type="button" aria-selected={active === "daily"} onClick={() => select("daily")}>今日推荐</button>
				<button role="tab" type="button" aria-selected={active === "unwind"} onClick={() => select("unwind")}>我的持仓解套</button>
			</div>
			<div role="tabpanel" aria-label={active === "daily" ? "今日推荐" : "我的持仓解套"}>
				{active === "daily" ? <WildmanDailyRecommendations /> : <WildmanHoldingsPanel onOpenLedger={openLedger} embedded={embedded} />}
			</div>
		</div>
	);
}

export default function WildmanTradingWorkspace(props: WorkspaceProps) {
	const token = useAuthStore(state => state.token);
	const userId = useUserStore(state => state.id);
	useCrossWindowAuthentication();
	if (!token) {
		return (
			<section className="wildman-workspace wildman-login" aria-label="野人每日实战登录提示">
				<h2>登录后查看每日实战</h2>
				<p>登录后可读取当日研判与自己的已登记持仓。交易手册中的方法说明仍可继续阅读。</p>
				<a className="wildman-primary" href={WILDMAN_LOGIN_PATH} target="_top">登录后查看</a>
			</section>
		);
	}
	// React's private reconciliation key is never rendered into the DOM. A new session
	// unmounts all private data and aborts old reads before another user's view is shown.
	return <PrivateWorkspace key={`${token}:${userId}`} {...props} />;
}
