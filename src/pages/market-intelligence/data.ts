import type { IntelligenceArticle } from "#src/api/market-intelligence";

export const isRunning = (status?: string) => status === "collecting" || status === "analyzing";
export const statusLabel: Record<string, string> = {
	collecting: "正在抓取",
	analyzing: "AI分析中",
	completed: "分析完成",
	partial: "部分来源缺失",
	failed: "本轮未完成",
	interrupted: "任务中断",
	no_updates: "本轮无新增可分析资料",
	ok: "原站可用",
	reprint_only: "仅获取转载或摘要",
	no_recent_items: "窗口内未检索到内容",
	limited: "原站受限，检索未发现内容",
};
export const priorityLabel = { high: "优先关注", medium: "值得跟踪", watch: "待核验线索" };
export const impactLabel = { positive: "可能利好", negative: "可能承压", mixed: "影响分化", uncertain: "影响待确认" };
export const evidenceLabel = { official: "原始发布", reprint: "转载正文", summary: "摘要线索" };

export function safeHref(value: string) {
	try {
		const url = new URL(value);
		return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
	}
	catch { return undefined; }
}
export function formatTime(value?: string | null) {
	if (!value)
		return "时间待核验";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "时间待核验" : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}
export function filterArticles(items: IntelligenceArticle[], category: string, keyword: string) {
	const term = keyword.trim().toLowerCase();
	return items.filter(item => (!category || item.category === category) && (!term || `${item.title} ${item.source_name} ${item.content}`.toLowerCase().includes(term)));
}
