export function metric(value: number | null | undefined, suffix = ""): string {
	return value == null || !Number.isFinite(value) ? "暂无有效样本" : `${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}
