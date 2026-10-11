import type { ResearchReport } from "#src/api/institutional-research";

export const directionNames: Record<string, string> = { bullish: "看多", bearish: "看空", mixed: "影响分化", uncertain: "待判断" };
export const evidenceNames: Record<string, string> = { original: "机构原站 / 原文", reprint: "媒体转载", summary: "摘要线索" };
export const statusNames: Record<string, string> = { running: "正在采集与检验", completed: "已完成", partial: "部分覆盖", failed: "失败", pending: "观察未到期", matured: "已到期", unavailable: "数据不足", observed: "已观察", not_provided: "未提供目标价", ok: "可用", limited: "覆盖受限", reprint_only: "仅有转载", no_recent_items: "公开源未发现近期内容" };
export const percent = (value?: number | null) => value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
export function safeLink(value: string) {
	try {
		const url = new URL(value);
		return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
	}
	catch { return undefined; }
}
export function filterReports(reports: ResearchReport[], institution: string, keyword: string) {
	const query = keyword.trim().toLowerCase();
	return reports.filter(r => (!institution || institution === r.institution) && (!query || `${r.payload.title} ${r.payload.summary} ${r.payload.evaluation_symbol} ${r.payload.impacts.map(i => i.name).join(" ")}`.toLowerCase().includes(query)));
}
