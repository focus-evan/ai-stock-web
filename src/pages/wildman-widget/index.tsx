import type { WildmanTab } from "#src/components/WildmanTradingWorkspace";
import WildmanTradingWorkspace from "#src/components/WildmanTradingWorkspace";
import { useEffect, useRef, useState } from "react";
import "./style.css";

export const MAX_WIDGET_HEIGHT = 10000;
function initialTab(): WildmanTab {
	const hashQuery = window.location.hash.indexOf("?");
	const query = new URLSearchParams(hashQuery >= 0 ? window.location.hash.slice(hashQuery + 1) : window.location.search);
	return query.get("tab") === "unwind" ? "unwind" : "daily";
}

export default function WildmanWidget() {
	const root = useRef<HTMLElement>(null);
	const [tab, setTab] = useState<WildmanTab>(initialTab);
	useEffect(() => {
		const receive = (event: MessageEvent) => {
			if (window.parent === window || event.origin !== window.location.origin || event.source !== window.parent)
				return;
			if (event.data?.type === "wildman-workspace-tab" && ["daily", "unwind"].includes(event.data.tab))
				setTab(event.data.tab);
		};
		window.addEventListener("message", receive);
		return () => window.removeEventListener("message", receive);
	}, []);
	useEffect(() => {
		const element = root.current;
		if (!element || window.parent === window)
			return;
		let frame = 0;
		let lastHeight = 0;
		const report = () => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				const height = Math.min(MAX_WIDGET_HEIGHT, Math.max(320, Math.ceil(element.scrollHeight)));
				if (height !== lastHeight) {
					lastHeight = height;
					window.parent.postMessage({ type: "wildman-workspace-height", height }, window.location.origin);
				}
			});
		};
		const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(report);
		observer?.observe(element);
		window.addEventListener("resize", report);
		report();
		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", report);
			cancelAnimationFrame(frame);
		};
	}, []);
	return <main ref={root} className="wildman-widget"><WildmanTradingWorkspace tab={tab} onTabChange={setTab} embedded /></main>;
}
