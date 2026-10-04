import type { ComparableCompany } from "#src/api/shadow-stock";

const missingValues = new Set(["", "-", "--", "n/a", "na", "none", "null", "undefined", "nan", "inf", "-inf", "infinity", "未知", "未提供", "待核验", "待补充"]);

function suppliedText(value: unknown): string | null {
	if (typeof value === "number")
		return Number.isFinite(value) ? String(value) : null;
	if (typeof value !== "string")
		return null;
	const text = value.trim();
	return missingValues.has(text.toLowerCase()) ? null : text;
}

/** Accept historic name lists as well as the structured API contract. */
export function normalizeComparableCompanies(value: unknown): ComparableCompany[] {
	if (!Array.isArray(value))
		return [];
	return value.flatMap((item) => {
		const record = typeof item === "string" ? { name: item } : item;
		if (!record || typeof record !== "object" || typeof record.name !== "string")
			return [];
		const name = suppliedText(record.name);
		return name ? [{ name, market_cap: suppliedText(record.market_cap), pe: suppliedText(record.pe) }] : [];
	});
}

export function formatComparableMetric(value: unknown, unit: "亿" | "x"): string {
	const text = suppliedText(value);
	if (text === null)
		return "待补充";
	const hasUnit = unit === "亿" ? /亿元?$/.test(text) : /(?:x|倍)$/i.test(text);
	return hasUnit ? text : `${text}${unit}`;
}
