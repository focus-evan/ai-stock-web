import type { UnwindExecution } from "#src/api/strategy";
import { Alert, Col, Collapse, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { effectiveSignal } from "./execution-signal";

export default function ExecutionStatus({ data, currency }: { data?: UnwindExecution, currency: string }) {
	const clock = useRef({ received: performance.now(), server: Date.parse(data?.server_time || "") });
	const [, render] = useState(0);
	useEffect(() => {
		clock.current = { received: performance.now(), server: Date.parse(data?.server_time || "") };
		const timer = window.setInterval(() => render(value => value + 1), 1000);
		return () => window.clearInterval(timer);
	}, [data]);
	const now = clock.current.server + performance.now() - clock.current.received;
	const signal = effectiveSignal(data, Number.isFinite(now) ? now : Number.POSITIVE_INFINITY);
	const plan = data?.plan;
	const money = (value?: number | null) => value == null ? "—" : `${currency}${value.toFixed(3)}`;
	const textTime = (value?: string) => value ? value.replace("T", " ").replace(/\+08:00$/, "") : "未取得";
	return (
		<section aria-label="当前操作与当天预案" style={{ marginBottom: 18 }}>
			<Alert
				type={signal.action === "WAIT" ? "info" : "warning"}
				showIcon
				message={(
					<Space wrap>
						<Typography.Text strong style={{ fontSize: 22 }}>
							现在：
							{signal.label}
						</Typography.Text>
						<Tag>盘中触发跟踪</Tag>
					</Space>
				)}
				description={(
					<Space direction="vertical" style={{ width: "100%" }}>
						<Typography.Text>{signal.reason || "当天跟踪尚未就绪，点击刷新检查"}</Typography.Text>
						<Row gutter={[16, 10]} style={{ width: "100%" }}>
							<Col xs={12} md={6}><Statistic title="当前操作股数" value={signal.shares} suffix="股" /></Col>
							<Col xs={12} md={6}><Statistic title={signal.action === "SELL" ? "卖出限价（不低于）" : signal.action === "BUY_BACK" ? "买回限价（不高于）" : "当前下单价格"} value={money(signal.limit_price)} /></Col>
							<Col xs={12} md={6}><Statistic title="观察报价（以时间为准）" value={money(signal.quote?.price)} /></Col>
							<Col xs={12} md={6}>
								<Typography.Text type="secondary">
									行情时间
									<br />
									{textTime(signal.quote?.as_of)}
									<br />
									{signal.quote?.source || "行情未就绪"}
								</Typography.Text>
							</Col>
						</Row>
						<Typography.Text type="secondary">
							核验时间：
							{textTime(signal.checked_at)}
							。行情超过120秒或收市后自动转为等待。
						</Typography.Text>
						{signal.validation_status === "shadow" && <Typography.Text type="warning">新规则正在验证；条件满足会留档提醒，验证信号不代表已成交或已实现降本。</Typography.Text>}
						{signal.requires_manual_confirmation && <Typography.Text type="warning">小仓位滚动占比较高，请核对剩余底仓与可卖旧仓。</Typography.Text>}
						<Typography.Text type="danger">
							失效条件：
							{signal.invalid_conditions?.join("；") || "无当天有效预案、行情过期或市场休市时不操作"}
						</Typography.Text>
					</Space>
				)}
			/>
			{plan && (
				<div style={{ padding: "14px 0" }}>
					<Space wrap>
						<Typography.Text strong>
							{plan.trading_date}
							{" "}
							当天预案
						</Typography.Text>
						<Tag>{plan.origin}</Tag>
						<Typography.Text type="secondary">
							基准：
							{plan.basis_date}
							{" "}
							收盘数据
						</Typography.Text>
					</Space>
					<Row gutter={[12, 12]} style={{ marginTop: 12 }}>
						<Col xs={24} md={8}>
							<Typography.Text>
								候选卖价不低于：
								{money(plan.sell_zone_low)}
								<br />
								计划最多卖出
								{" "}
								{plan.sell_shares}
								{" "}
								股
							</Typography.Text>
						</Col>
						<Col xs={24} md={8}>
							<Typography.Text>
								成交后买回不高于：
								{money(signal.buyback_target_price ?? plan.buyback_price)}
								<br />
								买回数量以实际已卖股数及资金池为上限
							</Typography.Text>
						</Col>
						<Col xs={24} md={8}>
							<Typography.Text type="danger">
								突破
								{money(plan.cancel_sell_above)}
								{" "}
								取消卖出
								<br />
								跌破
								{money(plan.pause_buy_below)}
								{" "}
								暂停买回
							</Typography.Text>
						</Col>
					</Row>
					<Typography.Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
						{plan.confirmation}
						{" "}
						预案价位不是当前下单指令，以“现在”卡片为准。
					</Typography.Paragraph>
				</div>
			)}
			<Collapse
				style={{ marginTop: 12 }}
				items={[
					{ key: "events", label: `盘中状态记录（${data?.events?.length || 0}）`, children: (
						<Table
							size="small"
							pagination={{ pageSize: 5 }}
							rowKey={row => `${row.checked_at}-${row.action}`}
							dataSource={[...(data?.events || [])].reverse()}
							columns={[
								{ title: "时间", dataIndex: "checked_at", render: textTime },
								{ title: "动作", dataIndex: "label" },
								{ title: "原因", dataIndex: "reason" },
							]}
						/>
					) },
					{ key: "review", label: "盘后实际成交复盘", children: data?.review
						? (
							<Space direction="vertical">
								<Typography.Text>
									已录入
									{data.review.trade_count}
									{" "}
									笔成交，费用
									{money(data.review.fees)}
									，实际降本
									{money(data.review.realized_reduction)}
									，已卖待回
									{data.review.pending_buyback_shares}
									{" "}
									股。
								</Typography.Text>
								<Typography.Text type="secondary">
									{data.review.note}
									；复盘时间：
									{textTime(data.review.reviewed_at)}
								</Typography.Text>
							</Space>
						)
						: <Typography.Text type="secondary">16:40后更新。触发提示不会自动记作成交，需按券商实际成交录入。</Typography.Text> },
				]}
			/>
		</section>
	);
}
