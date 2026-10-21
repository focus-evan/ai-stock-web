import type { UnwindPlan } from "#src/api/strategy";
import { beijingTime, strategyTime, timestamp } from "./strategy-time";

export const MONITOR_INTERVAL = 30 * 1000;
export interface UnwindPriceAlert {
	key: string
	stockName: string
	stockCode: string
	side: "sell" | "buy"
	price: number
	target: number
	symbol: string
	quoteAt: string
	expiresAt: number
	strategyDate: string
	reason: string
	confirmed: boolean
}

export function quoteTimestamp(value?: string) {
	const digits = value?.replace(/\s/g, "");
	if (digits && /^\d{14}$/.test(digits)) {
		return timestamp(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}`);
	}
	return timestamp(value?.replaceAll("/", "-"));
}

export function freshUnwindQuote(plan: UnwindPlan, now: Date) {
	const signal = plan.execution?.signal;
	const at = quoteTimestamp(signal?.quote?.as_of);
	const until = timestamp(signal?.valid_until);
	const price = signal?.quote?.price;
	if (!at || !until || !Number.isFinite(price) || !(price! > 0) || signal?.phase !== "intraday")
		return null;
	const age = now.getTime() - at.getTime();
	if (age < -5000 || age > 120000 || now.getTime() > until.getTime())
		return null;
	if (beijingTime(at).slice(0, 10) !== beijingTime(now).slice(0, 10))
		return null;
	return { price: price!, at, expiresAt: Math.min(until.getTime(), at.getTime() + 120000) };
}

/** Price-only notifications, based on the same dated execution plan shown in the card. */
export function priceAlertForPlan(plan: UnwindPlan, now: Date): UnwindPriceAlert | null {
	const analysis = plan.execution?.plan;
	const signal = plan.execution?.signal;
	if (!analysis?.trading_date || !strategyTime(analysis, now).current || !signal || signal.invalidated)
		return null;
	const quote = freshUnwindQuote(plan, now);
	const target = signal.target_price;
	if (!quote || !Number.isFinite(target) || !(target! > 0) || !(Number(signal.planned_shares) > 0))
		return null;
	const side = plan.open_sold_shares > 0 ? "buy" : "sell";
	const pause = Number(analysis.pause_buy_below);
	const cancel = Number(analysis.cancel_sell_above);
	if (!Number.isFinite(pause) || !Number.isFinite(cancel) || quote.price < pause || quote.price > cancel)
		return null;
	const reached = side === "buy" ? quote.price <= target! : quote.price >= target!;
	if (!reached)
		return null;
	return {
		key: `${analysis.trading_date}:${plan.watchlist_id}:${side}:${target}:${signal.action === (side === "buy" ? "BUY_BACK" : "SELL") || signal.suggested_action ? "confirmed" : "candidate"}`,
		stockName: plan.stock_name,
		stockCode: plan.stock_code,
		side,
		price: quote.price,
		target: target!,
		symbol: analysis.currency_symbol || (/^\d{5}$/.test(plan.stock_code) ? "HK$" : "¥"),
		quoteAt: beijingTime(quote.at),
		expiresAt: quote.expiresAt,
		strategyDate: analysis.trading_date,
		reason: signal.reason,
		confirmed: signal.action === (side === "buy" ? "BUY_BACK" : "SELL"),
	};
}

export function newPriceAlerts(plans: UnwindPlan[], seen: Set<string>, now: Date) {
	const alerts: UnwindPriceAlert[] = [];
	for (const plan of plans) {
		const alert = priceAlertForPlan(plan, now);
		if (alert && !seen.has(alert.key)) {
			seen.add(alert.key);
			alerts.push(alert);
		}
	}
	return alerts;
}
