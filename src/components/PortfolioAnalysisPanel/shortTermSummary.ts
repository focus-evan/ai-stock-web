import type { PortfolioShortTermAnalysis } from "#src/api/strategy";
import { isShortTermReady } from "./shortTermStatuses";

// Translate existing rule results; do not calculate a new trading signal here.
export function getShortTermSummary(t: PortfolioShortTermAnalysis) {
	const ready = isShortTermReady(t);
	const trend = t.moving_averages.find(ma => ma.period === 16);
	const aboveTrend = trend?.position === "站上";
	const belowTrend = trend?.position === "跌破";
	const base = {
		ready,
		color: "#595959",
		background: "#f5f5f5",
		trendLabel: aboveTrend ? "趋势参考" : "转强先看",
		trendHint: aboveTrend ? "留意能否守住这条参考线" : "先站稳，再看成交量配合",
		note: "价位每天变化，站上不等于买点；还需看大盘与公告。",
	};
	if (!ready) {
		return {
			...base,
			title: t.stale || t.status === "stale" ? "数据待更新，先等等" : "数据待核验，先等等",
			reason: "这份日线数据暂时不能判断当前买卖机会。",
			action: "更新分析后再决定，别按旧价格操作。",
			note: "历史指标保留在技术明细中。",
		};
	}
	const volume = t.volume_ratio_5 == null || !Number.isFinite(t.volume_ratio_5)
		? "成交量还需核验"
		: t.volume_label === "放量"
			? "成交量比平时增加"
			: t.volume_label === "缩量"
				? "成交量比平时减少"
				: "成交量接近平时";
	const reason = `${aboveTrend ? "股价在趋势参考线上方" : belowTrend ? "股价仍低于趋势参考线" : "价格走势还需观察"}，${volume}。`;
	if (t.verdict === "优先控险" || t.signals.some(s => s.state === "风险触发")) {
		return { ...base, color: "#ad4e00", background: "#fff7e6", title: "出现走弱信号，先控风险", reason, action: "先别加仓；已有持仓重点检查减仓条件。" };
	}
	if (t.verdict === "偏离过大") {
		return { ...base, color: "#ad4e00", background: "#fff7e6", title: "涨得偏快，别追高", reason, action: "等价格回落并重新确认，再考虑加仓。" };
	}
	if (t.verdict === "条件成立 · 待复核") {
		return { ...base, color: "#0958d9", background: "#e6f4ff", title: "出现机会，先复核", reason, action: "先确认大盘、板块和公告，再考虑分批参与。" };
	}
	if (t.verdict === "趋势观察") {
		return { ...base, color: "#0958d9", background: "#e6f4ff", title: "趋势仍在，等买点", reason, action: "持仓留意下方支撑；加仓等价格和成交量配合。" };
	}
	return { ...base, title: "还没转强，先等等", reason, action: "等价格站稳、成交量配合，再考虑参与。" };
}
