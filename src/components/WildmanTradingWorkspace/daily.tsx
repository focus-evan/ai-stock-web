import type { WildmanCandidate, WildmanDaily, WildmanSource } from "#src/api/wildman";
import { fetchWildmanDaily } from "#src/api/wildman";
import { useState } from "react";
import { useSnapshot } from "./use-snapshot";

const statusNames = { recommended: "今日推荐 · 条件式候选", no_recommendation: "今日不推荐新开仓", pending: "暂不推荐 · 等待生成", unavailable: "暂不推荐 · 数据不足", closed: "休市 · 今日不推荐" };
const sourceNames: Record<WildmanSource["status"], string> = { available: "当日有效", empty: "当日已更新 · 无候选", pending: "尚未生成", unavailable: "来源不可用", stale: "来源已过期", closed: "休市", paused: "已暂停" };
const price = (value: number | null) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value.toFixed(2) : "未提供";

function serverDate(value: unknown) {
	if (typeof value !== "string" || !value)
		return "";
	const date = new Date(value.includes("T") || /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value.replace(" ", "T")}+08:00`);
	return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(date);
}

/** Fail closed for a contradictory date/source or an explicit shadow signal. */
function recommendationGroups(data: WildmanDaily) {
	const recommended: WildmanCandidate[] = [];
	const notRecommended = [...data.not_recommended];
	const current = data.is_trading_day && Boolean(data.trading_date) && serverDate(data.server_time) === data.trading_date;
	for (const item of data.recommended) {
		const source = data.source_snapshots.find(snapshot => snapshot.strategy_type === item.strategy_type);
		let issue = "";
		if (data.recommendation_status !== "recommended" || !current)
			issue = "当日推荐状态或适用日期尚未通过核验";
		else if (item.validation_status === "shadow")
			issue = "影子验证信号，不能作为正式推荐";
		else if (!source || source.status !== "available" || source.trading_date !== data.trading_date)
			issue = "缺少同一交易日的有效来源快照";
		else if (!item.generated_at || ![item.entry_low, item.entry_high, item.stop_loss, item.target_price].every(value => typeof value === "number" && Number.isFinite(value) && value > 0))
			issue = "原始计划的时间或价格要素不完整";
		if (issue)
			notRecommended.push({ ...item, reason: issue, reasons: [issue, ...(item.reasons || [])] });
		else recommended.push(item);
	}
	return { recommended, notRecommended, current };
}

function Candidate({ item, recommended }: { item: WildmanCandidate, recommended: boolean }) {
	return (
		<article className={`wildman-candidate${recommended ? " wildman-candidate-ready" : ""}`}>
			<div className="wildman-card-title">
				<h4>
					{item.stock_name || item.stock_code}
					<small>{item.stock_code}</small>
				</h4>
				<span>{item.strategy_name || "来源策略未提供"}</span>
			</div>
			<p>{item.reason || "具体原因待补充"}</p>
			{!!item.reasons?.length && <ul>{item.reasons.filter(reason => reason !== item.reason).map(reason => <li key={reason}>{reason}</li>)}</ul>}
			{recommended && (
				<p className="wildman-condition">
					<strong>条件式候选（当前仍待确认）</strong>
					<br />
					{item.execution_reason || "等待盘中触发与风控确认；当前不下单。"}
				</p>
			)}
			<dl className="wildman-prices">
				<div>
					<dt>计划参考价 · 非成交报价</dt>
					<dd>{price(item.reference_price)}</dd>
				</div>
				<div>
					<dt>条件区间</dt>
					<dd>
						{price(item.entry_low)}
						{" "}
						—
						{" "}
						{price(item.entry_high)}
					</dd>
				</div>
				<div>
					<dt>止损参考</dt>
					<dd>{price(item.stop_loss)}</dd>
				</div>
				<div>
					<dt>目标参考</dt>
					<dd>{price(item.target_price)}</dd>
				</div>
			</dl>
			<p className="wildman-note">
				来源生成：
				{item.generated_at || "未提供"}
				{" "}
				·
				{item.validation_status === "shadow" ? "影子验证" : item.validation_status ? `验证标记：${item.validation_status}` : "验证状态未提供"}
			</p>
		</article>
	);
}

export default function WildmanDailyRecommendations() {
	const [keyword, setKeyword] = useState("");
	const [page, setPage] = useState(1);
	const snapshot = useSnapshot(fetchWildmanDaily, "暂不推荐 · 数据读取失败。当前结果不可用，不能据此判断没有机会。");
	const data = snapshot.data;
	const groups = data ? recommendationGroups(data) : null;
	const excluded = (groups?.notRecommended || []).filter(item => `${item.stock_code} ${item.stock_name} ${item.strategy_name}`.includes(keyword.trim()));
	const pages = Math.max(1, Math.ceil(excluded.length / 6));
	const currentPage = Math.min(page, pages);
	const dateUnverified = data && !["closed", "pending", "unavailable"].includes(data.recommendation_status) && !groups?.current;
	const incomplete = data && (dateUnverified || ["pending", "unavailable"].includes(data.recommendation_status) || (data.recommendation_status === "recommended" && !groups?.recommended.length));
	return (
		<section aria-label="野人今日推荐" className="wildman-daily-recommendations">
			<div className="wildman-section-title">
				<div>
					<h3>今日推荐与不推荐</h3>
					<p>来源由后台日内定时更新，本页每60秒重新读取；刷新只读取已有结果。</p>
				</div>
				<button type="button" onClick={() => void snapshot.read()} disabled={snapshot.loading}>{snapshot.loading ? "正在读取推荐…" : "重新读取推荐"}</button>
			</div>
			{snapshot.error && <div role="alert" className="wildman-error">{snapshot.error}</div>}
			{!data && !snapshot.error && <p role="status">正在读取当日研判，尚不能判断是否有合格候选。</p>}
			{data && groups && (
				<>
					<div className={`wildman-verdict${incomplete ? " wildman-verdict-pending" : ""}`}>
						<span>{dateUnverified || (incomplete && data.recommendation_status === "recommended") ? "暂不推荐 · 日期或来源待核验" : statusNames[data.recommendation_status]}</span>
						<h4>{data.headline || "当日结论待补充"}</h4>
						<ul>{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
						<p>
							适用交易日
							{data.trading_date || "未提供"}
							{" "}
							· 服务端时间
							{data.server_time || "未提供"}
						</p>
					</div>
					{data.market_gate?.reason && (
						<p className="wildman-gate">
							<strong>
								市场门：
								{data.market_gate.allowed === true ? "允许继续筛选" : data.market_gate.allowed === false ? "暂不通过" : "待核验"}
							</strong>
							{" "}
							·
							{" "}
							{data.market_gate.reason}
						</p>
					)}
					<div className="wildman-candidate-columns">
						<section aria-label="今日推荐名单">
							<h3>
								今日推荐
								{groups.recommended.length ? ` · ${groups.recommended.length}` : ""}
							</h3>
							{groups.recommended.map(item => <Candidate key={`${item.strategy_type}:${item.stock_code}`} item={item} recommended />)}
							{!groups.recommended.length && <p className="wildman-empty">{incomplete ? "数据尚未就绪或来源待核验，暂不能给出合格名单。" : data.recommendation_status === "closed" ? "休市期间不展示新的开仓推荐。" : "当前没有通过条件的开仓推荐；不要为了凑数放宽条件。"}</p>}
						</section>
						<section aria-label="今日不推荐名单">
							<h3>
								今日不推荐
								{groups.notRecommended.length ? ` · ${groups.notRecommended.length}` : ""}
							</h3>
							{!!groups.notRecommended.length && (
								<input
									className="wildman-exclusion-search"
									aria-label="筛选不推荐记录"
									placeholder="股票名称、代码或来源策略"
									value={keyword}
									onChange={(event) => {
										setKeyword(event.target.value);
										setPage(1);
									}}
								/>
							)}
							{excluded.slice((currentPage - 1) * 6, currentPage * 6).map(item => <Candidate key={`${item.strategy_type}:${item.stock_code}:${item.reason}`} item={item} recommended={false} />)}
							{!!groups.notRecommended.length && !excluded.length && <p className="wildman-empty">没有符合搜索条件的记录。</p>}
							{pages > 1 && (
								<nav className="wildman-exclusion-pages" aria-label="不推荐记录分页">
									<button type="button" aria-label="上一页不推荐记录" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
									<span>
										{currentPage}
										{" "}
										/
										{" "}
										{pages}
										{" "}
										·
										{" "}
										{excluded.length}
										{" "}
										条
									</span>
									<button type="button" aria-label="下一页不推荐记录" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>下一页</button>
								</nav>
							)}
							{!groups.notRecommended.length && <p className="wildman-empty">{incomplete ? "不推荐明细也未齐全，不能理解为所有股票均通过。" : "本次没有返回个股排除明细，请结合上方市场结论；不代表其他股票可以参与。"}</p>}
						</section>
					</div>
					<details className="wildman-source-list">
						<summary>
							来源与数据状态（
							{data.source_snapshots.length}
							）
						</summary>
						{!data.source_snapshots.length && <p>尚未取得来源快照。</p>}
						{data.source_snapshots.map(source => (
							<div key={source.strategy_type}>
								<strong>
									{source.strategy_name}
									{" "}
									·
									{" "}
									{sourceNames[source.status] || "状态待核验"}
								</strong>
								<p>{source.reason}</p>
								<small>
									交易日
									{source.trading_date || "未提供"}
									{" "}
									· 生成
									{source.generated_at || "未提供"}
									{["available", "empty"].includes(source.status) && typeof source.count === "number" ? ` · ${source.count} 只` : ""}
								</small>
							</div>
						))}
					</details>
					<p className="wildman-note">{data.methodology_note || "按野人方法整理的条件式观察，须继续核验盘中触发和风险；不是自动交易指令。"}</p>
				</>
			)}
		</section>
	);
}
