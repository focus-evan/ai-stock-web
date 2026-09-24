import type { StrategyBuyRecord, StrategyFollowType } from "#src/api/strategy";
import { fetchStrategyBuysByDate, fetchTodayStrategyBuys } from "#src/api/strategy";
import { ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, DatePicker, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { beijingTradeDate } from "../short-term-trade-alerts/data";

const names: Record<StrategyFollowType, string> = {
	dragon_head: "龙头战法",
	emotion_relay: "情绪接力",
	event_driven: "事件驱动",
	breakthrough: "突破战法",
	volume_price: "量价关系",
	overnight: "隔夜施工法",
	moving_average: "均线战法",
	northbound: "北向资金",
	trend_momentum: "趋势动量",
	combined: "综合战法",
	yangjia_emotion_cycle: "炒股养家情绪周期",
	kobe92_cycle_speculation: "92科比周期投机",
	a_share_leader_tactics: "陈小群龙头战法",
	beijing_chaogu_first_board: "北京炒家首板",
};
const { Text } = Typography;
const price = (value: number | null) => value == null || !Number.isFinite(value) ? "未记录" : `¥${value.toFixed(4)}`;
const percent = (value: number | null) => value == null || !Number.isFinite(value) ? "未验证" : `${value.toFixed(2)}%`;
const stamp = (value: string | null) => value ? value.replace("T", " ").replace(/(?:\.\d+)?\+08:00$/, "") : "未记录";
const red = { color: "#cf1322", fontSize: "clamp(22px, 2.3vw, 32px)", fontWeight: 800, lineHeight: 1.5 };
const familyNames: Record<string, string> = {
	high_beta_sentiment: "高弹性情绪/龙头",
	first_board: "首板次日套利",
	overnight: "隔夜尾盘确认",
	trend_structure: "趋势结构",
	catalyst: "事件催化",
	capital_flow: "资金流",
	blended: "多战法综合",
	generic: "通用",
};
const trustNames: Record<string, string> = {
	trusted: "可信跟投",
	canary: "小仓验证",
	observe: "仅观察",
	disabled: "暂停跟投",
};

function BuyCard({ item, now, unavailable }: { item: StrategyBuyRecord, now: number, unavailable: boolean }) {
	const follow = item.follow;
	const expires = follow ? Date.parse(follow.expires_at) : Number.NaN;
	const expired = !Number.isFinite(expires) || now >= expires;
	const stale = unavailable || expired;
	const label = stale ? "等待刷新确认" : follow?.label;
	const quantity = item.buy_quantity;
	const performance = follow?.strategy_performance;
	const lots = quantity == null ? "未记录" : `${(quantity / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 手（${quantity.toLocaleString("zh-CN")} 股）`;
	return (
		<article style={{ padding: 16, background: "#fff", border: "1px solid #ffa39e", borderRadius: 10, minWidth: 0, overflowWrap: "anywhere" }}>
			<Text strong style={{ color: "#cf1322", fontSize: 21 }}>{`${names[item.strategy_type] || item.strategy_type} · ${item.stock_name}（${item.stock_code}）`}</Text>
			<div style={red}>{`买入价格 ${price(item.buy_price)}`}</div>
			<div style={red}>{`买入 ${lots}`}</div>
			<Text type="secondary">{`${stamp(item.bought_at || item.buy_date)} · ${item.portfolio_name} · 本笔模拟成交`}</Text>
			<div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
				<Text strong>买入原因：</Text>
				{item.buy_reason || "原始成交未记录原因"}
			</div>
			{item.verification_status !== "verified" && <Alert style={{ marginTop: 8 }} type="warning" showIcon message="成交数据待核验" description={item.verification_issue || "缺少完整原始成交证据"} />}
			{follow && performance && (
				<div style={{ marginTop: 14, padding: 12, background: "#fafafa", borderRadius: 8 }}>
					<div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #e8e8e8" }}>
						<Text strong>战法特点：</Text>
						<div>
							{familyNames[performance.strategy_family || ""] || performance.strategy_family || "未记录"}
							{performance.settlement_label ? ` · ${performance.settlement_label}` : ""}
							{performance.entry_buffer_pct == null ? "" : ` · 最大追价 ${performance.entry_buffer_pct.toFixed(2)}%`}
							{performance.min_risk_reward_ratio == null ? "" : ` · 最低盈亏比 ${performance.min_risk_reward_ratio.toFixed(2)}`}
						</div>
						<div style={{ marginTop: 6 }}><Text strong>战法综合表现：</Text></div>
						<div>
							{`固定周期胜率 ${percent(performance.win_rate_pct)} · 近${performance.recent_sample_count}笔胜率 ${percent(performance.recent_win_rate_pct)} · 综合质量分 ${performance.quality_score?.toFixed(1) ?? "未验证"}`}
						</div>
						<div>
							{`该战法保本胜率 ${percent(performance.break_even_win_rate_pct)} · 胜率安全边际 ${performance.win_rate_edge_pct == null ? "未验证" : `${performance.win_rate_edge_pct >= 0 ? "+" : ""}${performance.win_rate_edge_pct.toFixed(2)}个百分点`}`}
						</div>
						<div>
							{`成熟样本 ${performance.sample_count} 笔（前向 ${performance.forward_sample_count} 笔）`}
							{performance.win_rate_ci95_pct ? ` · 胜率95%区间 ${performance.win_rate_ci95_pct[0].toFixed(1)}%–${performance.win_rate_ci95_pct[1].toFixed(1)}%` : ""}
						</div>
						<div>
							{`成本后平均收益 ${percent(performance.estimated_net_avg_return_pct)} · 盈利因子 ${performance.profit_factor?.toFixed(2) ?? "未验证"} · ${trustNames[performance.trust_status || ""] || "可信度未验证"}${performance.trust_score == null ? "" : ` ${performance.trust_score.toFixed(1)}分`}`}
						</div>
						{performance.trust_reason && <Text type="secondary">{performance.trust_reason}</Text>}
					</div>
					<Space wrap>
						<Text strong>是否值得跟投：</Text>
						<Tag color={!stale && follow.status === "consider" ? "red" : "default"}>{label}</Tag>
					</Space>
					<div style={{ marginTop: 6 }}>{stale ? "判断已过期或连接不可用，等待最新行情与信号复核。" : follow.reasons.join("；")}</div>
					{follow.current_price != null && <div style={{ marginTop: 6 }}>{`参考行情 ${price(follow.current_price)} · 行情时间 ${stamp(follow.quote_at)}`}</div>}
					{follow.entry_price != null && <div>{`参考卖一 ${price(follow.entry_price)}${follow.price_change_from_buy_pct == null ? "" : ` · 较本笔买价 ${follow.price_change_from_buy_pct > 0 ? "+" : ""}${follow.price_change_from_buy_pct.toFixed(2)}%`}`}</div>}
					{follow.entry_zone_low != null && follow.entry_zone_high != null && <div>{`信号买入区间 ${price(follow.entry_zone_low)}–${price(follow.entry_zone_high)}`}</div>}
					{follow.stop_loss_price != null && follow.target_price != null && <div>{`止损参考 ${price(follow.stop_loss_price)} · 目标参考 ${price(follow.target_price)}${follow.risk_reward_ratio == null ? "" : ` · 成本后盈亏比 ${follow.risk_reward_ratio.toFixed(2)}`}`}</div>}
					<Text type="secondary" style={{ display: "block", marginTop: 6 }}>{`判断时间 ${stamp(follow.assessed_at)}${follow.signal_at ? ` · 信号时间 ${stamp(follow.signal_at)}` : ""}（北京时间）`}</Text>
				</div>
			)}
		</article>
	);
}

export default function StrategyBuyAlerts({ userId }: { userId: string }) {
	const [now, setNow] = useState(Date.now);
	const [online, setOnline] = useState(() => navigator.onLine);
	const [selectedDay, setSelectedDay] = useState<string | null>(null);
	useEffect(() => {
		const update = () => {
			setNow(Date.now());
			setOnline(navigator.onLine);
		};
		const timer = window.setInterval(update, 1000);
		window.addEventListener("focus", update);
		window.addEventListener("online", update);
		window.addEventListener("offline", update);
		document.addEventListener("visibilitychange", update);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", update);
			window.removeEventListener("online", update);
			window.removeEventListener("offline", update);
			document.removeEventListener("visibilitychange", update);
		};
	}, []);
	const today = beijingTradeDate(new Date(now));
	const day = selectedDay || today;
	const isToday = day === today;
	const query = useQuery({
		queryKey: ["today-buy-alerts", userId, day],
		queryFn: async ({ signal }) => {
			const response = isToday ? await fetchTodayStrategyBuys(signal) : await fetchStrategyBuysByDate(day, signal);
			if (response.status !== "success" || !response.data)
				throw new Error(response.message || "模拟买入读取失败");
			return response.data;
		},
		refetchInterval: isToday ? 15000 : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: isToday ? "always" : false,
		retry: false,
		gcTime: 0,
	});
	const mismatch = !!query.data && query.data.trading_date !== day;
	const items = mismatch ? [] : (query.data?.items || []).filter(item => item.buy_date === day);
	const failed = query.isError || mismatch || !online;
	const strategyCount = new Set(items.map(item => item.strategy_type)).size;
	const dateLabel = isToday ? "今日" : `${day} `;
	const title = items.length ? `${dateLabel}模拟买入 · ${items.length} 笔 · ${strategyCount} 个战法` : failed ? `${dateLabel}模拟买入检查未完成` : query.isPending ? `正在检查全部战法${dateLabel}买入…` : `全部${query.data?.strategy_count || 14}个战法 · ${dateLabel}暂无模拟买入`;
	const selectDate = (value: string) => setSelectedDay(value === today ? null : value);
	return (
		<section aria-label={isToday ? "全部战法今日模拟买入" : "全部战法历史模拟买入"} style={{ margin: "16px 16px 0", padding: 16, borderRadius: 12, border: `2px solid ${items.length ? "#ff4d4f" : "#d9d9d9"}`, background: items.length ? "#fff1f0" : "#fff" }}>
			<Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
				<Text strong style={{ color: items.length ? "#cf1322" : undefined, fontSize: items.length ? 24 : 14 }}>{title}</Text>
				<Space wrap>
					<Button size="small" onClick={() => selectDate(dayjs(day).subtract(1, "day").format("YYYY-MM-DD"))}>前一天</Button>
					<DatePicker
						aria-label="查询买入日期"
						size="small"
						value={dayjs(day)}
						allowClear={false}
						format="YYYY-MM-DD"
						disabledDate={value => value.format("YYYY-MM-DD") > today}
						onChange={value => value && selectDate(value.format("YYYY-MM-DD"))}
					/>
					<Button size="small" disabled={isToday} onClick={() => selectDate(dayjs(day).add(1, "day").format("YYYY-MM-DD"))}>后一天</Button>
					<Button size="small" disabled={isToday} onClick={() => setSelectedDay(null)}>回到今天</Button>
					<Text type="secondary">{isToday ? "北京时间 · 每15秒更新" : "北京时间 · 历史成交"}</Text>
					<Button size="small" icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>刷新买入</Button>
				</Space>
			</Space>
			{failed && <Alert style={{ marginTop: 12 }} type="warning" showIcon message={isToday ? "今日买入更新失败" : "历史买入查询失败"} description={mismatch ? (isToday ? "服务器与本地日期不一致，请校准时间后刷新。" : "返回日期与所选日期不一致，请重新查询。") : isToday ? "暂时保留已读取的当天成交，新买入可能尚未显示；跟投判断等待刷新。" : "所选日期的成交记录暂时无法完整读取，请重试。"} />}
			{query.data?.warnings?.map(warning => <Alert key={warning} style={{ marginTop: 8 }} type="warning" showIcon message={warning} />)}
			{items.length > 0 && <div style={{ marginTop: 10, marginBottom: 12 }}><Text type="secondary">{isToday ? "手数按100股折算。跟投结论综合战法自身结算周期、历史胜率与样本可信度、当前信号、价格和风控；请结合自身持仓判断。" : "按实际成交逐笔展示当时的买入价格、股数和原因，包含已清仓记录。手数按100股折算。"}</Text></div>}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 12 }} aria-live="polite" aria-relevant="additions text">
				{items.map(item => <BuyCard key={`${item.portfolio_id}:${item.trade_id}`} item={isToday ? item : { ...item, follow: null }} now={now} unavailable={failed} />)}
			</div>
		</section>
	);
}
