export interface ResearchCompany {
	stock_code: string
	stock_name: string
	market: string
	products: string
	advantage_clue: string
	position_clue: string
	observation: {
		financial_status: "available" | "needs_evidence"
		financial_gaps: string[]
		period: string | null
		disclosed_at: string | null
		metrics: Record<string, number | null>
		diagnostics: string[]
		mapping_source: string
		source_url: string | null
		mapping_scope: string
		market: { date: string | null, market_cap: number | null, pe_ttm: number | null }
		valuation_status: string
		business_scope: string
	}
}
export interface ResearchSector {
	id: string
	code: string
	name: string
	layer_name: string
	description: string
	evidence_status: string
	financial_count: number
	mapping_source_count: number
	facts: { key: string, label: string, value: string, question: string }[]
	competition: { landscape: string[], focus: string[], barriers: string[], status: string }
	companies: ResearchCompany[]
	gaps: string[]
	next_step: string
	monitoring: string[]
}
export interface IndustryResearch {
	methodology_version: string
	snapshot_key: string
	question: string
	cutoff: string | null
	report_period: string | null
	batch_id: string | null
	summary: { layer_count: number, sector_count: number, company_count: number, financial_company_count: number }
	sectors: ResearchSector[]
	methods: { id: string, name: string, purpose: string }[]
	principles: string[]
	limitations: string[]
}
export type ResearchDecision = "focus" | "watch" | "exclude";
export interface ResearchReview {
	sectorId: string
	snapshotKey: string
	decision: ResearchDecision
	reason: string
	signal: string
	evidenceUrl: string
	updatedAt: string
}
export type ResearchReviews = Record<string, ResearchReview>;
export const decisionLabels = { focus: "优先深研", watch: "继续观察", exclude: "暂时排除" };

export function reviewStorageKey(userId: string, chainCode: string) {
	return userId ? `s-industry-reviews:v1:${encodeURIComponent(userId)}:${encodeURIComponent(chainCode)}` : null;
}
export function safeEvidenceUrl(value: string | null | undefined) {
	if (!value)
		return undefined;
	try {
		const url = new URL(value);
		return ["https:", "http:"].includes(url.protocol) && !url.username ? url.href : undefined;
	}
	catch { return undefined; }
}
export function parseReviews(raw: string | null): ResearchReviews {
	if (!raw)
		return {};
	const data = JSON.parse(raw);
	if (data?.version !== 1 || !Array.isArray(data.entries))
		throw new Error("研究记录格式无法读取");
	// Keep retired subjects in the export instead of silently deleting earlier research.
	return Object.fromEntries(data.entries.filter((r: ResearchReview) => {
		if (!r || typeof r.sectorId !== "string" || !["focus", "watch", "exclude"].includes(r.decision))
			return false;
		return (["reason", "signal", "evidenceUrl", "snapshotKey", "updatedAt"] as const).every(key => typeof r[key] === "string");
	})
		.map((r: ResearchReview) => [r.sectorId, { ...r, reason: r.reason.slice(0, 2000), signal: r.signal.slice(0, 1000), evidenceUrl: r.evidenceUrl.slice(0, 2000) }]));
}
export function reviewIsCurrent(review: ResearchReview | undefined, snapshotKey: string) {
	return Boolean(review && review.snapshotKey === snapshotKey && !validateReview(review));
}
export function validateReview(review: Pick<ResearchReview, "reason" | "signal" | "evidenceUrl">) {
	if (!review.reason.trim() || !review.signal.trim())
		return "请写明取舍理由和下一次验证或重新纳入的条件。";
	if (review.evidenceUrl.trim() && !safeEvidenceUrl(review.evidenceUrl.trim()))
		return "证据链接须为有效的 http 或 https 地址。";
	return null;
}
