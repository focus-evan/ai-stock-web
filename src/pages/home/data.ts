import type { DashboardData, DashboardRecommendation, DashboardResponse, DashboardStrategy, Metric, RecommendationStock } from "#src/api/portfolio/dashboard";
import { strategyExecutionStatus } from "./strategy-status";

export const STRATEGIES: Record<string, { label: string, color: string }> = {
	dragon_head: { label: "龙头战法", color: "#1677ff" },
	emotion_relay: { label: "情绪接力", color: "#7356bf" },
	event_driven: { label: "事件驱动", color: "#bd7b23" },
	breakthrough: { label: "突破战法", color: "#5777b8" },
	volume_price: { label: "量价关系", color: "#168987" },
	overnight: { label: "隔夜施工法", color: "#68768f" },
	moving_average: { label: "均线战法", color: "#ad607a" },
	northbound: { label: "北向资金", color: "#8a6caa" },
	trend_momentum: { label: "趋势动量", color: "#ab7656" },
	industry_ai: { label: "AI产业研究自进化", color: "#c82042" },
	adaptive_confluence: { label: "情绪催化自适应", color: "#168987" },
	combined: { label: "综合战法", color: "#8e792e" },
	yangjia_emotion_cycle: { label: "炒股养家情绪周期", color: "#ad607a" },
	kobe92_cycle_speculation: { label: "92科比周期投机", color: "#5777b8" },
	a_share_leader_tactics: { label: "陈小群龙头战法", color: "#ab7656" },
	beijing_chaogu_first_board: { label: "北京炒家首板", color: "#8e792e" },
};

export const strategyName = (value: string) => STRATEGIES[value]?.label || value;
export const finiteMetric = (value: Metric): value is number => typeof value === "number" && Number.isFinite(value);
export function formatMetric(value: Metric, suffix = "", signed = false) {
	if (!finiteMetric(value))
		return "—";
	return `${signed && value > 0 ? "+" : ""}${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}
export const metricClass = (value: Metric) => !finiteMetric(value) || value === 0 ? "" : value > 0 ? "wb-positive" : "wb-negative";
export const formatTime = (value?: string | null) => value ? value.replace("T", " ").slice(0, 16) : "尚无记录";

export function dashboardFromResponse(response: DashboardResponse): DashboardData {
	const data = response.data || response.result?.data;
	if (response.status === "error" || response.result?.status === "error" || !data?.overview) {
		throw new Error("工作台数据暂不可用，请稍后重试");
	}
	if (![data.strategy_summary, data.positions, data.recent_trades].every(Array.isArray)) {
		throw new Error("工作台数据暂不可用，请稍后重试");
	}
	return data;
}

export function needsAttention(strategy: DashboardStrategy) {
	const status = strategyExecutionStatus(strategy).status;
	return status === "error" || status === "warning";
}

export function filterStrategies(strategies: DashboardStrategy[], keyword: string, filter: string) {
	const query = keyword.trim().toLowerCase();
	return strategies.filter((s) => {
		const matchesQuery = !query || `${strategyName(s.strategy_type)} ${s.name || ""}`.toLowerCase().includes(query);
		const matchesState = [
			filter === "all",
			filter === "attention" && needsAttention(s),
			filter === "holding" && Number(s.positions_count) > 0,
			filter === "paused" && !s.auto_trade,
		].some(Boolean);
		return matchesQuery && matchesState;
	});
}

export function recommendationState(value?: DashboardRecommendation | RecommendationStock[]) {
	const data: DashboardRecommendation = Array.isArray(value) ? { stocks: value } : value || {};
	const stocks = Array.isArray(data.stocks) ? data.stocks : [];
	if (data.availability === "unavailable" || data.source_status?.status === "unavailable")
		return { data, stocks, label: "数据待恢复", tone: "warning", description: "推荐数据暂不可用，不能据此判断没有机会。" };
	if (!value || data.availability === "missing")
		return { data, stocks, label: "尚未生成", tone: "default", description: "尚无推荐快照，等待策略生成。" };
	if (data.is_current_trading_date === false)
		return { data, stocks, label: "历史快照", tone: "default", description: "非当前交易日，仅供历史观察。" };
	if (data.is_current_trading_date !== true)
		return { data, stocks, label: "时效待核验", tone: "default", description: "缺少交易日确认，请先核对生成时间。" };
	if (stocks.length === 0)
		return { data, stocks, label: "无合格信号", tone: "default", description: "本交易日已更新，暂无合格信号。" };
	return { data, stocks, label: "本交易日", tone: "blue", description: "候选观察清单，成交以执行条件和风控结果为准。" };
}
