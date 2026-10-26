import bridgeStyleUrl from "./styles/wildman-bridge.css?url";

const manualPaths = new Set([
	"/research-library/content/douyin/methods/",
	"/research-library/content/douyin/methods/index.html",
]);
const liveId = "wildman-live-workspace";

/** Enhance the independently published manual without copying private data into HTML. */
export function enhanceTradingManual(target: Document) {
	if (!manualPaths.has(target.location.pathname) || target.getElementById(liveId))
		return;
	const main = target.querySelector("main");
	if (!main) {
		if (target.readyState === "loading")
			target.addEventListener("DOMContentLoaded", () => enhanceTradingManual(target), { once: true });
		return;
	}
	const stylesheet = target.createElement("link");
	target.documentElement.setAttribute("data-wildman-live", "");
	stylesheet.rel = "stylesheet";
	stylesheet.href = bridgeStyleUrl;
	stylesheet.id = "wildman-live-style";
	target.head.append(stylesheet);
	const live = target.createElement("section");
	live.id = liveId;
	live.className = "section shell wm-live-bridge";
	live.setAttribute("aria-label", "每日推荐与我的持仓解套");
	const heading = target.createElement("div");
	heading.className = "wm-live-intro";
	const title = target.createElement("h2");
	title.textContent = "每日实战：今日推荐与我的持仓";
	const description = target.createElement("p");
	description.textContent = "读取系统当日策略结果，明确推荐或不推荐；解套自动带入你已登记的实际持仓和真实成交。";
	heading.append(title, description);
	const workspaceLink = target.createElement("a");
	workspaceLink.href = "/short-term-strategy/stock-analysis?tab=wildman";
	workspaceLink.target = "_top";
	workspaceLink.textContent = "在完整工作台打开 ↗";
	heading.append(workspaceLink);
	const frame = target.createElement("iframe");
	frame.src = "/wildman-widget?tab=daily";
	frame.title = "野人每日实战与本人登记持仓";
	frame.className = "wm-live-frame";
	frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-top-navigation-by-user-activation");
	frame.setAttribute("allow", "clipboard-write");
	frame.style.height = "480px";
	live.append(heading, frame);
	main.prepend(live);
	let pendingTab: "daily" | "unwind" | null = null;
	const sendTab = () => {
		if (pendingTab)
			frame.contentWindow?.postMessage({ type: "wildman-workspace-tab", tab: pendingTab }, target.location.origin);
	};
	const openTab = (tab: "daily" | "unwind") => {
		pendingTab = tab;
		sendTab();
		live.scrollIntoView?.({ block: "start", behavior: "instant" });
	};
	frame.addEventListener("load", sendTab);
	const resize = (event: MessageEvent) => {
		if (event.origin !== target.location.origin || event.source !== frame.contentWindow || event.data?.type !== "wildman-workspace-height") {
			return;
		}
		const height = event.data.height;
		if (typeof height !== "number" || !Number.isFinite(height))
			return;
		frame.style.height = `${Math.min(16000, Math.max(280, Math.ceil(height)))}px`;
		sendTab();
		pendingTab = null;
	};
	target.defaultView?.addEventListener("message", resize);
	target.defaultView?.addEventListener("pagehide", () => target.defaultView?.removeEventListener("message", resize), { once: true });
	const connect = (link: HTMLAnchorElement, tab: "daily" | "unwind", label: string) => {
		link.href = `#${liveId}`;
		link.textContent = label;
		link.addEventListener("click", (event) => {
			event.preventDefault();
			openTab(tab);
		});
	};
	const heroCopy = target.querySelector(".hero-copy");
	if (heroCopy)
		heroCopy.textContent = "把全能的野人语料整理为交易方法，并接入系统当日推荐与本人登记持仓。先看今天是否推荐，再用真实持仓核对解套方案；下方保留原方法、步骤和失败条件。";
	const primary = target.querySelector<HTMLAnchorElement>(".hero-actions .primary-action");
	if (primary)
		connect(primary, "daily", "查看今日推荐 / 不推荐");
	const actions = target.querySelector(".hero-actions");
	if (actions) {
		const mine = target.createElement("a");
		mine.className = "secondary-action";
		connect(mine, "unwind", "带入我的持仓解套");
		actions.append(mine);
	}
	const rescueLink = target.querySelector<HTMLAnchorElement>(".section-menu a[href=\"#rescue\"]");
	if (rescueLink)
		connect(rescueLink, "unwind", "我的持仓解套");
	const menu = target.querySelector(".section-menu .shell");
	if (menu) {
		const daily = target.createElement("a");
		connect(daily, "daily", "每日推荐");
		menu.prepend(daily);
		const trial = target.createElement("a");
		trial.href = "#rescue";
		trial.textContent = "手动试算";
		menu.append(trial);
	}
	// Preserve calculator nodes and event handlers, separate from the private ledger.
	const rescue = target.getElementById("rescue");
	if (rescue) {
		const details = target.createElement("details");
		details.className = "wm-independent-trial shell";
		const summary = target.createElement("summary");
		summary.textContent = "手动解套试算 · 不读取或修改已登记持仓";
		details.append(summary);
		for (const child of Array.from(rescue.childNodes))
			details.append(child);
		rescue.append(details);
	}
}
