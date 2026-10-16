import type { UnwindPlan } from "#src/api/strategy";
import type { ReactNode } from "react";
import { activeUnwindAnalysis, beijingTime, strategyTime } from "./strategy-time";
import "./strategy-time.css";

export function StrategyDateOverview({ plans, now, action, unavailable = false }: {
	plans: UnwindPlan[]
	now: Date
	action: ReactNode
	unavailable?: boolean
}) {
	const times = plans.map(plan => strategyTime(activeUnwindAnalysis(plan), now));
	const dates = [...new Set(times.map(time => time.strategyDate).filter(Boolean))].sort();
	const currentCount = times.filter(time => time.current).length;
	const allCurrent = times.length > 0 && currentCount === times.length && !unavailable;
	const latestGenerated = times.map(time => time.generatedAt).filter(Boolean).sort().at(-1);
	return (
		<section className={`unwind-date-overview${allCurrent ? " unwind-date-current" : ""}`} aria-label="解套策略日期总览">
			<div className="unwind-date-heading">
				<div>
					<span className="unwind-date-eyebrow">策略日期 · 北京时间</span>
					<strong className="unwind-date-value">{dates.length > 1 ? `${dates[0]} — ${dates.at(-1)}（日期不一致）` : dates[0] || "尚未生成"}</strong>
				</div>
				{action}
			</div>
			<div className="unwind-date-meta">
				<span>
					今天（北京时间）：
					<strong>{beijingTime(now).slice(0, 10)}</strong>
				</span>
				<span>
					最近生成：
					<strong>{latestGenerated || "尚未生成"}</strong>
				</span>
				<span>
					今日快照
					<strong>
						{currentCount}
						{" "}
						/
						{" "}
						{plans.length}
					</strong>
					{" "}
					只 · 待更新 / 核验
					<strong>{plans.length - currentCount}</strong>
					{" "}
					只
				</span>
			</div>
			<p className="unwind-date-note">
				<span className="unwind-date-status">{unavailable ? "更新未完成 · 暂勿照此操作" : allCurrent ? "今日快照已生成 · 不代表条件已触发" : "先核对日期，再看操作"}</span>
				{" "}
				每只股票以自己的日期和生成时间为准；下单前更新，并确认触发条件。刷新页面不会改变策略日期。
			</p>
		</section>
	);
}

export function StrategyDateStamp({ plan, now, unavailable = false }: { plan: UnwindPlan, now: Date, unavailable?: boolean }) {
	const analysis = activeUnwindAnalysis(plan);
	const time = strategyTime(analysis, now);
	return (
		<section className={`unwind-strategy-time${time.current && !unavailable ? " unwind-date-current" : ""}`} aria-label={`${plan.stock_name}策略时间`}>
			<div className="unwind-date-heading">
				<div>
					<span className="unwind-date-eyebrow">{analysis?.trading_date ? "策略适用日期" : "策略日期（日线快照）"}</span>
					<strong className="unwind-date-value">{time.strategyDate || "日期待核验"}</strong>
				</div>
				<span className="unwind-date-status">{unavailable ? "更新未完成 · 暂勿照此操作" : time.label}</span>
			</div>
			<div className="unwind-date-meta">
				<span>
					生成时间：
					<strong>{time.generatedAt || "未提供 / 待核验"}</strong>
					（北京时间）
				</span>
				<span>
					日线行情截至：
					<strong>{time.dataDate || "未知"}</strong>
					{" "}
					· 非逐笔实时报价
				</span>
			</div>
			<p className="unwind-date-note">{unavailable ? "本次更新尚未成功，页面保留上次快照；请重试并确认更新时间。" : time.note}</p>
		</section>
	);
}
