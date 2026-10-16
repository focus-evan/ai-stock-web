import type { UnwindAnalysis, UnwindPlan } from "#src/api/strategy";

const beijingFormatter = new Intl.DateTimeFormat("sv-SE", {
	timeZone: "Asia/Shanghai",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

export function beijingTime(now: Date) {
	return beijingFormatter.format(now);
}

export function activeUnwindAnalysis(plan: UnwindPlan) {
	return plan.execution?.plan || plan.latest_analysis;
}

function validDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
		return false;
	const parsed = new Date(`${value}T00:00:00Z`);
	return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Legacy API timestamps without an offset are Beijing time, never the browser's local time. */
export function timestamp(value?: string) {
	if (!value || !validDate(value.slice(0, 10)))
		return null;
	if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(value)) {
		return null;
	}
	const normalized = value.replace(" ", "T");
	const date = new Date(/Z|[+-]\d{2}:\d{2}$/i.test(normalized) ? normalized : `${normalized}+08:00`);
	return Number.isFinite(date.getTime()) ? date : null;
}

export function strategyTime(analysis: UnwindAnalysis | null | undefined, now: Date) {
	const today = beijingTime(now).slice(0, 10);
	const rawDataDate = analysis?.technical?.as_of?.slice(0, 10) || "";
	const dataDate = validDate(rawDataDate) ? rawDataDate : "";
	const explicitDate = analysis?.trading_date;
	const strategyDate = explicitDate ? (validDate(explicitDate) ? explicitDate : "") : dataDate;
	const generated = timestamp(analysis?.generated_at);
	const generatedAt = generated ? beijingTime(generated) : "";
	const generatedDate = generatedAt.slice(0, 10);
	const invalid = !strategyDate || !dataDate || !generated || strategyDate > today || dataDate > strategyDate || generated.getTime() > now.getTime() || dataDate > generatedDate;
	const expiry = timestamp(analysis?.valid_until);
	const expired = Boolean(analysis?.valid_until && (!expiry || expiry.getTime() < now.getTime()));
	const current = !invalid && !expired && strategyDate === today && generatedDate === today;
	const label = !analysis
		? "尚未生成策略"
		: invalid
			? "时间待核验 · 暂勿照此操作"
			: expired
				? "已过有效期 · 仅供复盘"
				: current
					? explicitDate ? "今日预案 · 操作前复核" : "今日快照 · 操作前复核"
					: generatedDate === today ? "行情未到今日 · 仅作预案" : "历史策略 · 请先更新";
	const note = current
		? "日期为今日不代表买卖条件已触发。下单前刷新，并确认价格、数量及触发条件。"
		: "这份快照不能直接当作今天的操作指令。请先更新，核对下方日期与生成时间后再判断。";
	return { today, strategyDate, dataDate, generatedAt, current, label, note };
}
