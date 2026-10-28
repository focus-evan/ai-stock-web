import type { UnwindExecution, UnwindSignal } from "#src/api/strategy";
import type { RegularPriceBand } from "./execution-presentation";
import { Space, Typography } from "antd";
import { beijingClock, executionMoney, priceRangeNote } from "./execution-presentation";

export default function ExecutionDetails({ data, signal, band, currency }: { data?: UnwindExecution, signal: UnwindSignal, band?: RegularPriceBand, currency: string }) {
	const plan = data?.plan;
	const technical = plan?.technical;
	const money = (value?: number | null) => executionMoney(value, currency);
	const number = (value?: number) => value == null || !Number.isFinite(value) ? "未取得" : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
	const source = signal.quote?.source;
	const conditions = (signal.invalid_conditions || []).filter(condition =>
		condition !== (plan?.cancel_sell_above == null ? "" : `突破${plan.cancel_sell_above}取消卖出`)
		&& condition !== (plan?.pause_buy_below == null ? "" : `跌破${plan.pause_buy_below}暂停买回`));
	return (
		<Space direction="vertical" style={{ width: "100%" }}>
			<Typography.Text>
				{signal.review_v2?.triggered_at ? `原始触发说明（${beijingClock(signal.review_v2.triggered_at, true)}）：` : ""}
				{signal.reason || "当前没有可执行操作"}
			</Typography.Text>
			{signal.review_v2?.triggered_at && (
				<Typography.Text type="secondary">
					复核触发时间：
					{beijingClock(signal.review_v2.triggered_at, true)}
				</Typography.Text>
			)}
			{signal.automatic_fundamental_review?.message && <Typography.Text type="secondary">{signal.automatic_fundamental_review.message}</Typography.Text>}
			{signal.market_emotion?.reason && <Typography.Text type="secondary">{signal.market_emotion.reason}</Typography.Text>}
			{plan && (
				<div style={{ width: "100%" }}>
					<Typography.Text strong>
						价位依据：
						{plan.basis_date}
						收盘快照
					</Typography.Text>
					<Typography.Paragraph type="secondary" style={{ margin: "6px 0" }}>
						观察价与10日结构边界用于后续复核，不等于今天可以下单的价格。当前操作以上方结论为准。
					</Typography.Paragraph>
					{band && (
						<Typography.Text type="secondary">
							按常规
							{band.ratePct}
							%涨跌幅估算，今日范围为
							{money(band.lower)}
							—
							{money(band.upper)}
							（昨收
							{money(band.previousClose)}
							）；特殊交易日以交易所实际限制为准。
						</Typography.Text>
					)}
					<div className="unwind-execution-details">
						<div className="unwind-execution-detail">
							<Typography.Text strong>
								卖出观察价
								{money(plan.sell_zone_low)}
							</Typography.Text>
							<p>
								<Typography.Text type="secondary">
									{priceRangeNote(plan.sell_zone_low, band) || "需重新核验是否具备当日触发条件"}
									。
									{plan.sell_shares > 0 ? `计划数量上限${plan.sell_shares}股，仍需当前信号确认。` : "当前没有可执行卖出数量。"}
								</Typography.Text>
							</p>
							{plan.sell_reason && <p><Typography.Text type="secondary">{plan.sell_reason}</Typography.Text></p>}
						</div>
						<div className="unwind-execution-detail">
							<Typography.Text strong>
								{signal.buyback_target_price != null ? "已卖持仓买回目标" : "假设卖出后的买回测算"}
								{" "}
								{money(signal.buyback_target_price ?? plan.buyback_price)}
							</Typography.Text>
							<p><Typography.Text type="secondary">实际卖出后按成交价、费用和资金池重算；没有已卖持仓时，不构成买回指令。</Typography.Text></p>
						</div>
						<div className="unwind-execution-detail">
							<Typography.Text strong>
								结构取消卖出线
								{money(plan.cancel_sell_above)}
							</Typography.Text>
							<p>
								<Typography.Text>
									10日最高价
									{money(technical?.resistance_10d)}
									{" "}
									+ 0.25 × ATR14
									{number(technical?.atr14)}
									，再按最小价位向上取整。
								</Typography.Text>
							</p>
							<p>
								<Typography.Text type="secondary">
									{priceRangeNote(plan.cancel_sell_above, band)}
									；针对未成交卖单，不是当前卖出价格。
								</Typography.Text>
							</p>
						</div>
						<div className="unwind-execution-detail">
							<Typography.Text strong>
								结构暂停买回线
								{money(plan.pause_buy_below)}
							</Typography.Text>
							<p>
								<Typography.Text>
									10日最低价
									{money(technical?.support_10d)}
									{" "}
									− 0.5 × ATR14
									{number(technical?.atr14)}
									，再按最小价位向下取整。
								</Typography.Text>
							</p>
							<p>
								<Typography.Text type="secondary">
									{priceRangeNote(plan.pause_buy_below, band)}
									；用于重新评估下行风险，不是买回目标价。
								</Typography.Text>
							</p>
						</div>
					</div>
					<Typography.Paragraph type="secondary" style={{ margin: "12px 0 0" }}>{plan.confirmation}</Typography.Paragraph>
				</div>
			)}
			{conditions.length > 0 && (
				<Typography.Text type="secondary">
					其他核验条件：
					{conditions.join("；")}
				</Typography.Text>
			)}
			{signal.validation_status === "shadow" && <Typography.Text type="warning">技术信号尚在验证，未确认前只观察，不作为成交或已实现降本。</Typography.Text>}
			{signal.requires_manual_confirmation && <Typography.Text type="warning">小仓位滚动占比较高，请核对剩余底仓与可卖旧仓。</Typography.Text>}
			<Typography.Text type="secondary">
				报价时间：
				{beijingClock(signal.quote?.as_of, true)}
				；核验时间：
				{beijingClock(signal.checked_at, true)}
				；行情来源：
				{source?.includes("tencent") ? "腾讯行情" : source?.includes("sina") ? "新浪行情" : source || "未取得"}
				。
			</Typography.Text>
		</Space>
	);
}
