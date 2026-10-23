import type { UnwindAlertEvent } from "#src/api/strategy";
import { quoteTimestamp } from "./price-alerts";
import { beijingTime, timestamp } from "./strategy-time";

/** Delivery filtering only: a candidate or shadow signal never becomes an order. */
export function isLiveUnwindAlert(event: UnwindAlertEvent, now: Date) {
	const signal = event.payload;
	const checked = timestamp(signal.checked_at);
	const expiry = timestamp(signal.valid_until);
	if (!checked || !expiry)
		return false;
	const age = now.getTime() - checked.getTime();
	if (event.read_at || event.trading_date !== beijingTime(now).slice(0, 10) || signal.phase !== "intraday" || expiry.getTime() <= now.getTime() || age < -5000 || age > 120000) {
		return false;
	}
	if (event.stage === "risk" || event.stage === "recovery")
		return true;
	const quote = quoteTimestamp(signal.quote?.as_of);
	const instruction = event.stage === "confirmed" && signal.validation_status !== "shadow" && !signal.invalidated && ["SELL", "BUY_BACK"].includes(signal.action) && Number(signal.shares) > 0 && Number(signal.limit_price) > 0;
	return instruction && Boolean(quote && now.getTime() - quote.getTime() >= -5000 && now.getTime() - quote.getTime() <= 120000);
}
