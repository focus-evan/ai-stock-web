import type { PortfolioShortTermAnalysis } from "#src/api/strategy";

// Mirrors api/portfolio_short_term.py verdicts; these are states, not a score.
export const SHORT_TERM_STATUS_GROUPS = [
	{
		title: "机会观察",
		states: [
			{ value: "等待转强", stage: "观望", meaning: "还没出现买点，等价格和成交量配合。", color: "#595959", background: "#f5f5f5" },
			{ value: "趋势观察", stage: "等买点", meaning: "上涨趋势还在，新增仓位继续等买点。", color: "#0958d9", background: "#e6f4ff" },
			{ value: "条件成立 · 待复核", stage: "有机会", meaning: "日线条件已满足，核对大盘、板块和公告后再考虑参与。", color: "#0958d9", background: "#e6f4ff" },
		],
	},
	{
		title: "风险提醒",
		states: [
			{ value: "偏离过大", stage: "别追高", meaning: "价格涨得偏快，等回落后重新确认。", color: "#ad4e00", background: "#fff7e6" },
			{ value: "优先控险", stage: "控风险", meaning: "已出现走弱信号，先别加仓，持仓检查减仓条件。", color: "#a8071a", background: "#fff1f0" },
		],
	},
	{
		title: "数据状态 · 暂不判断强弱",
		states: [
			{ value: "等待数据", stage: "缺数据", meaning: "日线数据不足，补齐后才能判断。", color: "#595959", background: "#f5f5f5" },
			{ value: "等待核验", stage: "待核验", meaning: "数据过期或有疑点，更新核验后再判断。", color: "#595959", background: "#f5f5f5" },
		],
	},
] as const;

export function isShortTermReady(t: PortfolioShortTermAnalysis) {
	return t.status === "ready" && !t.stale && t.close != null && Number.isFinite(t.close) && t.close > 0;
}

export function getShortTermStatus(t: PortfolioShortTermAnalysis) {
	let verdict = t.verdict;
	if (!isShortTermReady(t)) {
		verdict = t.status === "insufficient" || t.verdict === "等待数据" ? "等待数据" : "等待核验";
	}
	else if (t.signals.some(s => s.state === "风险触发")) {
		verdict = "优先控险";
	}
	return SHORT_TERM_STATUS_GROUPS.flatMap(group => [...group.states]).find(state => state.value === verdict);
}
