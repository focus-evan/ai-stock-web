export function reportStatus(item, now = new Date()) {
	const policy = item?.refreshPolicy;
	if (!policy) return { state: "historical", text: item?.date ? `报告日期 ${item.date}` : "历史资料" };
	if (policy.paused) return { state: "paused", text: policy.reason || "已暂停自动更新" };
	const timestamp = item.generatedAt || (item.reportDate || item.date ? `${item.reportDate || item.date}T23:59:59+08:00` : null);
	if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return { state: "stale", text: "报告时间未知，请核对原文" };
	const beijing = new Date(now.getTime() + 8 * 3600000);
	let due = null;
	for (let offset = 0; offset < 8 && due === null; offset++) {
		const day = new Date(Date.UTC(beijing.getUTCFullYear(), beijing.getUTCMonth(), beijing.getUTCDate() - offset));
		if (policy.days === "weekdays" && [0, 6].includes(day.getUTCDay())) continue;
		for (const time of [...policy.times].sort().reverse()) {
			const deadline = Date.parse(`${day.toISOString().slice(0, 10)}T${time}:00+08:00`);
			if (deadline + (policy.graceMinutes ?? 90) * 60000 <= now.getTime()) { due = deadline; break; }
		}
	}
	return due !== null && Date.parse(timestamp) < due
		? { state: "stale", text: "等待新一期更新（休市日以报告说明为准）" }
		: { state: "current", text: "已更新至当前应到期报告" };
}

function renderReaderStatus() {
	const banner = document.querySelector("[data-report-metadata]");
	if (!banner) return;
	const metadata = JSON.parse(banner.dataset.reportMetadata);
	const render = () => {
		const status = reportStatus(metadata);
		banner.dataset.state = status.state;
		const time = metadata.generatedAt ? new Date(metadata.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : metadata.reportDate || "未标注";
		banner.textContent = `报告时间：${time}（北京时间）${metadata.marketDataDate ? ` ｜ 行情日期：${metadata.marketDataDate}` : ""} ｜ ${status.text}`;
	};
	const checkNewVersion = async () => {
		try {
			const response = await fetch(new URL("../catalog.json", import.meta.url), { cache: "no-store" });
			if (!response.ok) return;
			const catalog = await response.json();
			const latest = catalog.entries.find(entry => entry.id === metadata.id);
			if (latest && (latest.generatedAt || latest.date) > (metadata.generatedAt || metadata.reportDate)) {
				render();
				const link = document.createElement("a");
				const url = new URL(location.href);
				url.searchParams.set("report", latest.generatedAt || latest.date);
				link.href = url.href;
				link.textContent = "打开新一期报告 →";
				banner.append(" ｜ ", link);
			}
		} catch { /* The existing report remains readable while offline. */ }
	};
	render();
	checkNewVersion();
	setInterval(() => { render(); checkNewVersion(); }, 60000);
}

if (typeof document !== "undefined") renderReaderStatus();
