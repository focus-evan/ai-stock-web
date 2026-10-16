import type { StrategyFollowType } from "#src/api/strategy";

export const names: Record<StrategyFollowType, string> = {
	dragon_head: "龙头战法",
	emotion_relay: "情绪接力",
	event_driven: "事件驱动",
	breakthrough: "突破战法",
	volume_price: "量价关系",
	overnight: "隔夜施工法",
	moving_average: "均线战法",
	northbound: "北向资金",
	trend_momentum: "趋势动量",
	adaptive_confluence: "情绪催化自适应",
	industry_ai: "AI产业研究自进化",
	combined: "综合战法",
	yangjia_emotion_cycle: "炒股养家情绪周期",
	kobe92_cycle_speculation: "92科比周期投机",
	a_share_leader_tactics: "陈小群龙头战法",
	beijing_chaogu_first_board: "北京炒家首板",
};
export const price = (value: number | null) => value == null || !Number.isFinite(value) ? "未记录" : `¥${value.toFixed(4)}`;
export const percent = (value: number | null) => value == null || !Number.isFinite(value) ? "未验证" : `${value.toFixed(2)}%`;
export const stamp = (value: string | null) => value ? value.replace("T", " ").replace(/(?:\.\d+)?\+08:00$/, "") : "未记录";
export const red = { color: "#cf1322", fontSize: "clamp(22px, 2.3vw, 32px)", fontWeight: 800, lineHeight: 1.5 };
