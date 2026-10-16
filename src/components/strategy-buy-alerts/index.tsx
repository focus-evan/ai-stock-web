import type { StrategyBuyRecord, StrategyBuysByDate, StrategySellsByDate } from "#src/api/strategy";
import { fetchStrategyBuysByDate, fetchStrategySellsByDate, fetchTodayStrategyBuys } from "#src/api/strategy";
import { ReloadOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, DatePicker, Space, Tabs, Tag, theme, Typography } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { beijingTradeDate } from "../short-term-trade-alerts/data";
import { names, price, red, stamp } from "./format";
import SellCard from "./sell-card";
import { StrategyPerformanceDetails } from "./trade-details";

const { Text } = Typography;

function BuyCard({ item, now, unavailable }: { item: StrategyBuyRecord, now: number, unavailable: boolean }) {
	const { token } = theme.useToken();
	const follow = item.follow;
	const expires = follow ? Date.parse(follow.expires_at) : Number.NaN;
	const expired = !Number.isFinite(expires) || now >= expires;
	const stale = unavailable || expired;
	const label = stale ? "等待刷新确认" : follow?.label;
	const quantity = item.buy_quantity;
	const performance = follow?.strategy_performance;
	const lots = quantity == null ? "未记录" : `${(quantity / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 手（${quantity.toLocaleString("zh-CN")} 股）`;
	return (
		<article style={{ padding: 16, background: token.colorBgContainer, border: `1px solid ${token.colorErrorBorder}`, borderRadius: 10, minWidth: 0, overflowWrap: "anywhere" }}>
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
					<StrategyPerformanceDetails performance={performance} />
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
	const { token } = theme.useToken();
	const [now, setNow] = useState(Date.now);
	const [online, setOnline] = useState(() => navigator.onLine);
	const [direction, setDirection] = useState<"buy" | "sell">("buy");
	const side = direction === "buy" ? "买入" : "卖出";
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
	const query = useQuery<StrategyBuysByDate | StrategySellsByDate>({
		queryKey: ["strategy-trade-alerts", userId, day, direction],
		queryFn: async ({ signal }) => {
			const response = direction === "sell" ? await fetchStrategySellsByDate(day, signal) : isToday ? await fetchTodayStrategyBuys(signal) : await fetchStrategyBuysByDate(day, signal);
			if (response.status !== "success" || !response.data)
				throw new Error(response.message || `模拟${side}读取失败`);
			return response.data;
		},
		refetchInterval: isToday ? 15000 : false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: isToday ? "always" : false,
		retry: false,
		gcTime: 0,
	});
	const mismatch = !!query.data && query.data.trading_date !== day;
	const items = mismatch ? [] : (query.data?.items || []).filter(item => direction === "sell" ? "sell_date" in item && item.sell_date === day : "buy_date" in item && item.buy_date === day);
	const failed = query.isError || mismatch || !online;
	const strategyCount = new Set(items.map(item => item.strategy_type)).size;
	const dateLabel = isToday ? "今日" : `${day} `;
	const title = items.length ? `${dateLabel}模拟${side} · ${items.length} 笔 · ${strategyCount} 个战法` : failed ? `${dateLabel}模拟${side}检查未完成` : query.isPending ? `正在检查全部战法${dateLabel}${side}…` : `全部${query.data?.strategy_count ?? Object.keys(names).length}个战法 · ${dateLabel}暂无模拟${side}`;
	const selectDate = (value: string) => setSelectedDay(value === today ? null : value);
	const content = (
		<>
			<Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
				<Text strong style={{ color: items.length ? "#cf1322" : undefined, fontSize: items.length ? 24 : 14 }}>{title}</Text>
				<Space wrap>
					<Button size="small" onClick={() => selectDate(dayjs(day).subtract(1, "day").format("YYYY-MM-DD"))}>前一天</Button>
					<DatePicker
						aria-label={`查询${side}日期`}
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
					<Button aria-label={`刷新${side}`} size="small" icon={<ReloadOutlined aria-hidden />} loading={query.isFetching} onClick={() => void query.refetch()}>{`刷新${side}`}</Button>
				</Space>
			</Space>
			{failed && <Alert style={{ marginTop: 12 }} type="warning" showIcon message={isToday ? `今日${side}更新失败` : `历史${side}查询失败`} description={mismatch ? (isToday ? "服务器与本地日期不一致，请校准时间后刷新。" : "返回日期与所选日期不一致，请重新查询。") : isToday ? `暂时保留已读取的当天成交，新${side}可能尚未显示${direction === "buy" ? "；跟投判断等待刷新" : ""}。` : "所选日期的成交记录暂时无法完整读取，请重试。"} />}
			{query.data?.warnings?.map(warning => <Alert key={warning} style={{ marginTop: 8 }} type="warning" showIcon message={warning} />)}
			{items.length > 0 && <div style={{ marginTop: 10, marginBottom: 12 }}><Text type="secondary">{direction === "sell" ? (isToday ? "按实际成交逐笔展示卖出价格、数量、理由和已记录盈亏。战法综合表现与买入页同口径；退出规则为当前配置，实际触发以本笔原始卖出理由为准。手数按100股折算。" : "按实际成交逐笔展示当时的卖出价格、股数和原因，包含分批卖出与已清仓记录。手数按100股折算。") : isToday ? "手数按100股折算。跟投结论综合战法自身结算周期、历史胜率与样本可信度、当前信号、价格和风控；请结合自身持仓判断。" : "按实际成交逐笔展示当时的买入价格、股数和原因，包含已清仓记录。手数按100股折算。"}</Text></div>}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 12 }} aria-live="polite" aria-relevant="additions text">
				{items.map(item => "sell_date" in item
					? <SellCard key={`${item.portfolio_id}:${item.trade_id}`} item={isToday ? item : { ...item, strategy_performance: null, exit_policy: null }} unavailable={failed} />
					: <BuyCard key={`${item.portfolio_id}:${item.trade_id}`} item={isToday ? item : { ...item, follow: null }} now={now} unavailable={failed} />)}
			</div>
		</>
	);
	return (
		<section aria-label={`全部战法${isToday ? "今日" : "历史"}模拟${side}`} style={{ margin: "16px 16px 0", padding: items.length || failed ? 16 : "12px 16px", borderRadius: 12, border: `1px solid ${items.length ? token.colorErrorBorder : token.colorBorderSecondary}`, background: items.length ? token.colorErrorBg : token.colorBgContainer }}>
			<Tabs
				activeKey={direction}
				onChange={key => setDirection(key as "buy" | "sell")}
				items={[
					{ key: "buy", label: "当天买入", children: direction === "buy" ? content : null },
					{ key: "sell", label: "当天卖出", children: direction === "sell" ? content : null },
				]}
			/>
		</section>
	);
}
