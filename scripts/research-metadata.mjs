import fs from "node:fs";
import path from "node:path";

export const policies = {
	"automation-2-holdings": { days: "weekdays", times: ["06:00"] },
	"a-share-macro-radar": { days: "weekdays", times: ["06:00"] },
	"global-tech-radar": { days: "daily", times: ["06:00", "12:00"] },
	"theme-ignition-v231": { days: "daily", times: ["07:00"] },
	"a-share-four-strategies": { days: "weekdays", times: ["08:45", "08:50", "10:05", "10:15", "10:35", "10:45", "14:20", "15:20", "15:25"] },
	"quarterly-disclosure-monitor": { paused: true, reason: "已按用户要求暂停自动更新" },
};

export function normalizeTimestamp(value) {
	if (typeof value !== "string") return null;
	const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/);
	if (!match) return null;
	const zone = (match[4] || "+08:00").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
	const timestamp = `${match[1]}T${match[2]}:${match[3] || "00"}${zone}`;
	return Number.isFinite(Date.parse(timestamp)) ? timestamp : null;
}

// Sidecars are authoritative only for their corresponding current page, never archives.
export function reportMetadata(source, relative, fallbackDate) {
	const group = relative.split("/")[0];
	const current = /\/(latest|index)\.html?$/.test(relative);
	if (!current || !policies[group]) return {};
	const policy = policies[group];
	const sidecar = path.join(source, relative.replace(/\.html?$/, ".json"));
	let data = {};
	if (fs.existsSync(sidecar)) data = JSON.parse(fs.readFileSync(sidecar, "utf8").replace(/^\uFEFF/, ""));
	const generatedAt = normalizeTimestamp(data.generated_at || data.generated_at_beijing);
	const reportDate = generatedAt?.slice(0, 10) || fallbackDate;
	const quoteDates = [...new Set((data.holdings || []).map(item => item.last_trade_date).filter(Boolean))].sort();
	return { reportDate, generatedAt, marketDataDate: quoteDates.length ? quoteDates.join(" / ") : null, refreshPolicy: { ...policy, graceMinutes: 90 } };
}
