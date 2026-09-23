export function finiteNumber(value: unknown): number | null {
	if (value === null || value === undefined || (typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim()))
		return null;
	const result = Number(value);
	return Number.isFinite(result) ? result : null;
}

export function numberText(value: unknown, digits = 2, suffix = "") {
	const number = finiteNumber(value);
	return number === null ? "未提供" : `${number.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}${suffix}`;
}

export function priceText(value: unknown, market?: string) {
	const number = finiteNumber(value);
	return number === null || number <= 0 ? "未提供有效价位" : `${market === "hk" ? "HK$" : "¥"}${numberText(number)}`;
}

export function actionTone(action?: string) {
	return action === "买入" ? "buy" : action === "卖出" ? "sell" : action === "持有" ? "hold" : "wait";
}
