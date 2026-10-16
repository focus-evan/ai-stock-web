import type { StrategyTradeCycle } from "#src/api/strategy";
import { theme, Tooltip, Typography } from "antd";

export default function ClosedPnl({ item }: { item: StrategyTradeCycle }) {
	const { token } = theme.useToken();
	const pnl = item.pnl;
	if (item.status === "holding" || item.status === "partial")
		return <Typography.Text type="secondary">未清仓，暂不结算本轮盈亏</Typography.Text>;
	if (item.status !== "closed" || item.verification_status === "anomalous" || !pnl || pnl.basis === "unavailable" || pnl.amount == null || pnl.return_pct == null)
		return <Typography.Text type="warning">盈亏待核验</Typography.Text>;
	const verified = item.performance_eligible && item.verification_status === "verified" && pnl.basis === "net_estimated_costs";
	const profitable = pnl.amount > 0;
	const losing = pnl.amount < 0;
	const color = verified ? profitable ? token.colorError : losing ? token.colorSuccess : token.colorTextSecondary : token.colorTextSecondary;
	const background = verified ? profitable ? token.colorErrorBg : losing ? token.colorSuccessBg : token.colorFillAlter : token.colorFillAlter;
	const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}¥${Math.abs(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	const percent = `${pnl.return_pct > 0 ? "+" : ""}${pnl.return_pct.toFixed(2)}%`;
	const label = pnl.basis === "net_estimated_costs" ? "清仓净盈亏" : "清仓账面盈亏";
	const note = item.verification_status === "repaired" ? "修复账目 · 不计战绩" : verified ? "已扣留存估算费用" : pnl.basis === "gross_costs_missing" ? "费用未齐 · 待核验" : "成交证据待核验";
	const detail = `本轮卖出金额 ¥${pnl.sell_amount?.toFixed(2)} − 买入金额 ¥${pnl.buy_amount?.toFixed(2)}${pnl.estimated_cost == null ? "；费用记录不完整，暂未扣费" : ` − 估算费用 ¥${pnl.estimated_cost.toFixed(2)}`}。收益率按本轮买入资金计算，分批成交逐笔汇总。`;
	return (
		<Tooltip title={detail}>
			<div aria-label={`${item.stock_name} 本轮清仓盈亏`} style={{ background, borderRadius: 8, padding: "10px 12px", minWidth: 150, fontVariantNumeric: "tabular-nums" }}>
				<div style={{ fontSize: 12, color: token.colorTextSecondary }}>{label}</div>
				<div style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1.5, whiteSpace: "nowrap" }}>{money(pnl.amount)}</div>
				<div style={{ color, fontSize: 14, fontWeight: 600 }}>{percent}</div>
				<div style={{ color: token.colorTextSecondary, fontSize: 11, marginTop: 3 }}>{note}</div>
			</div>
		</Tooltip>
	);
}
