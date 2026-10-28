import type { UnwindExecution, UnwindSignal } from "#src/api/strategy";

export function executionTime(value?: string): number {
	if (!value)
		return Number.NaN;
	const text = value.trim();
	if (/^\d{14}$/.test(text)) {
		return Date.parse(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T${text.slice(8, 10)}:${text.slice(10, 12)}:${text.slice(12, 14)}+08:00`);
	}
	const normalized = text.replace(" ", "T").replace(/(\.\d{3})\d+/, "$1");
	return Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}+08:00`);
}

export function beijingClock(value?: string, withDate = false): string {
	const stamp = executionTime(value);
	if (!Number.isFinite(stamp))
		return "未取得";
	const text = new Date(stamp + 8 * 3600000).toISOString();
	return withDate ? `${text.slice(0, 10)} ${text.slice(11, 19)}` : text.slice(11, 19);
}

export function executionMoney(value: number | null | undefined, currency: string): string {
	return value == null || !Number.isFinite(value) ? "—" : `${currency}${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
}

function beijingDay(stamp: number): string {
	return Number.isFinite(stamp) ? new Date(stamp + 8 * 3600000).toISOString().slice(0, 10) : "";
}

export function executionSummary(signal: UnwindSignal, serverNow: number) {
	const executable = signal.action !== "WAIT" && Number.isInteger(signal.shares) && signal.shares > 0 && Number.isFinite(signal.limit_price) && Number(signal.limit_price) > 0;
	const title = executable ? `现在：${signal.action === "SELL" ? "卖出" : "买回"}` : "现在：暂不操作";
	let reason = (signal.reason || "当天跟踪尚未就绪，等待重新核验").split(/[。；;]/)[0];
	let status = "";
	const review = signal.review_v2;
	const trigger = executionTime(review?.triggered_at);
	const triggerDay = beijingDay(trigger);
	if (!executable && signal.action !== "WAIT") {
		reason = "操作信息未完整，等待重新核验";
	}
	else if (!executable && review?.pending && triggerDay && /复核/.test(signal.reason)) {
		const event = (review.reasons || []).join("；");
		const kind = /跌幅/.test(event) ? "跌幅" : /成本|复盘线/.test(event) ? "成本线" : "风险";
		reason = `${Number(triggerDay.slice(5, 7))}月${Number(triggerDay.slice(8, 10))}日触发的${kind}复核尚未完成`;
		status = "复核未完成";
	}
	else if (!executable && /自动复核|后台更新基本面/.test(`${signal.label} ${signal.automatic_fundamental_review?.message || ""}`)) {
		status = "自动复核中";
	}
	else if (!executable && signal.validation_status === "shadow") {
		status = "仅观察";
	}
	const quoteAt = executionTime(signal.quote?.as_of);
	const quoteFresh = Number.isFinite(quoteAt) && Number.isFinite(serverNow) && serverNow - quoteAt >= -5000 && serverNow - quoteAt <= 120000 && beijingDay(quoteAt) === beijingDay(serverNow);
	return { executable, title, reason, status, quoteFresh };
}

export interface RegularPriceBand {
	lower: number
	upper: number
	ratePct: number
	previousClose: number
	basisDate: string
}

/**
 * Presentation-only estimate for established, non-risk-warning mainland stocks.
 * Never changes the saved plan or execution thresholds. Special trading days require broker/exchange limits.
 */
export function regularPriceBand(data: UnwindExecution | undefined, code: string | undefined, name: string | undefined, serverNow: number): RegularPriceBand | undefined {
	const plan = data?.plan;
	const technical = plan?.technical;
	if (!plan || plan.market !== "a" || plan.is_special_treatment || /^(?:N|C)|ST|退/i.test(name || "") || plan.trading_date !== beijingDay(serverNow) || technical?.as_of !== plan.basis_date || (technical?.bars?.length || 0) < 16) {
		return undefined;
	}
	const normalizedCode = (code || "").replace(/^(?:sh|sz)/i, "");
	const rate = /^(?:30[01]|68[89])\d{3}$/.test(normalizedCode)
		? 0.2
		: /^(?:000|001|002|003|600|601|603|605)\d{3}$/.test(normalizedCode) ? 0.1 : null;
	if (rate == null || !Number.isFinite(technical.current_price) || technical.current_price <= 0)
		return undefined;
	const previousClose = data?.signal.quote?.prev_close;
	if (previousClose != null && (!Number.isFinite(previousClose) || Math.abs(previousClose - technical.current_price) > 0.02))
		return undefined;
	const roundCent = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
	return { lower: roundCent(technical.current_price * (1 - rate)), upper: roundCent(technical.current_price * (1 + rate)), ratePct: rate * 100, previousClose: technical.current_price, basisDate: plan.basis_date };
}

export function priceRangeNote(value?: number | null, band?: RegularPriceBand): string {
	if (!band || value == null || !Number.isFinite(value))
		return "";
	return value > band.upper ? "高于今日常规涨停范围" : value < band.lower ? "低于今日常规跌停范围" : "在今日常规涨跌幅范围内";
}
