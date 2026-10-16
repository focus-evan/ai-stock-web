import type { StrategySellRecord } from "#src/api/strategy";
import { Alert, Tag, theme, Typography } from "antd";
import { names, percent, price, red, stamp } from "./format";
import { StrategyPerformanceDetails } from "./trade-details";

const { Text } = Typography;
const money = (value: number | null) => value == null || !Number.isFinite(value) ? "未记录" : `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SellCard({ item, unavailable }: { item: StrategySellRecord, unavailable: boolean }) {
	const { token } = theme.useToken();
	const policy = item.exit_policy;
	const quantity = item.sell_quantity;
	const lots = quantity == null ? "未记录" : `${(quantity / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 })} 手（${quantity.toLocaleString("zh-CN")} 股）`;
	return (
		<article style={{ padding: 16, background: token.colorBgContainer, border: `1px solid ${token.colorErrorBorder}`, borderRadius: 10, minWidth: 0, overflowWrap: "anywhere" }}>
			<Text strong style={{ color: "#cf1322", fontSize: 21 }}>{`${names[item.strategy_type] || item.strategy_type} · ${item.stock_name}（${item.stock_code}）`}</Text>
			<div style={red}>{`卖出价格 ${price(item.sell_price)}`}</div>
			<div style={red}>{`卖出 ${lots}`}</div>
			<Text type="secondary">{`${stamp(item.sold_at || item.sell_date)} · ${item.portfolio_name} · 本笔模拟成交`}</Text>
			<div style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
				<Text strong>卖出理由：</Text>
				{item.sell_reason || "原始成交未记录原因"}
			</div>
			<div style={{ marginTop: 8 }}>{`本笔成交金额 ${money(item.sell_amount)} · 已记录盈亏 ${money(item.profit)} · 已记录收益率 ${item.profit_pct == null ? "未记录" : percent(item.profit_pct)}`}</div>
			{item.verification_status !== "verified" && <Alert style={{ marginTop: 8 }} type="warning" showIcon message="成交数据待核验" description={item.verification_issue || "缺少完整原始成交证据，已记录盈亏尚未核验"} />}
			{(item.strategy_performance || policy) && (
				<div style={{ marginTop: 14, padding: 12, background: token.colorFillAlter, borderRadius: 8 }}>
					{item.strategy_performance && <StrategyPerformanceDetails performance={item.strategy_performance} showEntryRules={false} />}
					{policy && (
						<>
							<Text strong>战法卖出规则（当前配置）：</Text>
							<div>{`止损阈值 ${policy.stop_loss_pct == null ? "未配置" : `-${Math.abs(policy.stop_loss_pct).toFixed(2)}%`} · 止盈阈值 ${policy.take_profit_pct == null ? "未配置" : `${policy.take_profit_pct.toFixed(2)}%`} · 触发止盈${policy.take_profit_sell_pct === 100 ? "全额兑现" : `先兑现${policy.take_profit_sell_pct}%`}`}</div>
							{policy.rules.map(rule => <div key={rule} style={{ marginTop: 4 }}>{rule}</div>)}
						</>
					)}
					<div style={{ marginTop: 8 }}>
						<Tag>卖出已成交</Tag>
						<Text type="secondary">历史胜率与可信跟投评级用于复盘，不作为阻止止损、止盈的条件。跟随卖出需结合自身持仓成本与可卖数量。</Text>
					</div>
					{unavailable && <Text type="warning">更新失败，以上战法指标与配置为上次成功读取的结果。</Text>}
				</div>
			)}
		</article>
	);
}
