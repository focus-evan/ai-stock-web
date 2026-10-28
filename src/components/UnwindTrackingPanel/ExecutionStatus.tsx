import type { UnwindExecution } from "#src/api/strategy";
import { Alert, Collapse, Space, Table, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { beijingClock, executionMoney, executionSummary, executionTime, priceRangeNote, regularPriceBand } from "./execution-presentation";
import { effectiveSignal } from "./execution-signal";
import ExecutionDetails from "./ExecutionDetails";
import "./execution-status.css";

export default function ExecutionStatus({ data, currency, stockCode, stockName }: { data?: UnwindExecution, currency: string, stockCode?: string, stockName?: string }) {
	const clock = useRef({ received: performance.now(), server: executionTime(data?.server_time) });
	const [, render] = useState(0);
	useEffect(() => {
		clock.current = { received: performance.now(), server: executionTime(data?.server_time) };
		const timer = window.setInterval(() => render(value => value + 1), 1000);
		return () => window.clearInterval(timer);
	}, [data]);
	const now = clock.current.server + performance.now() - clock.current.received;
	const serverNow = Number.isFinite(now) ? now : Number.POSITIVE_INFINITY;
	const signal = effectiveSignal(data, serverNow);
	const summary = executionSummary(signal, serverNow);
	const band = regularPriceBand(data, stockCode, stockName, serverNow);
	const sellRange = priceRangeNote(data?.plan?.sell_zone_low, band);
	const outOfRange = sellRange.startsWith("高于") || sellRange.startsWith("低于");
	const money = (value?: number | null) => executionMoney(value, currency);
	return (
		<section className="unwind-execution-status" aria-label="当前操作与预案依据" style={{ marginBottom: 18 }}>
			<Alert
				type={summary.executable ? "warning" : "info"}
				showIcon
				message={(
					<Space wrap size={8}>
						<Typography.Text strong className="unwind-execution-headline">{summary.title}</Typography.Text>
						{summary.status && <Tag>{summary.status}</Tag>}
						{summary.executable && signal.requires_manual_confirmation && <Tag color="orange">需核对底仓</Tag>}
					</Space>
				)}
				description={(
					<Space direction="vertical" size={4} style={{ width: "100%" }}>
						{summary.executable && (
							<div className="unwind-execution-order">
								<Typography.Text strong>
									{signal.shares}
									{" "}
									股
								</Typography.Text>
								<Typography.Text strong>
									{signal.action === "SELL" ? "卖出限价（不低于）" : "买回限价（不高于）"}
									{" "}
									{money(signal.limit_price)}
								</Typography.Text>
							</div>
						)}
						<Typography.Text>{summary.reason}</Typography.Text>
						<div className="unwind-execution-quote">
							{signal.quote?.price != null && signal.quote.price > 0
								? (
									<>
										{summary.quoteFresh ? "报价" : "上次报价"}
										{" "}
										{money(signal.quote.price)}
										{" "}
										·
										{" "}
										{beijingClock(signal.quote.as_of, !summary.quoteFresh)}
										{!summary.quoteFresh && "（待更新）"}
									</>
								)
								: "行情待更新"}
							{summary.executable && (
								<>
									{" "}
									· 有效至
									{beijingClock(signal.valid_until)}
								</>
							)}
						</div>
					</Space>
				)}
			/>
			<Collapse
				style={{ marginTop: 10 }}
				items={[
					{ key: "basis", label: outOfRange ? "复核与价位依据（卖出观察价超出今日常规范围）" : "复核与价位依据", children: <ExecutionDetails data={data} signal={signal} band={band} currency={currency} /> },
					{ key: "events", label: `盘中状态记录（${data?.events?.length || 0}）`, children: (
						<Table
							size="small"
							pagination={{ pageSize: 5 }}
							rowKey={row => `${row.checked_at}-${row.action}`}
							dataSource={[...(data?.events || [])].reverse()}
							columns={[
								{ title: "时间", dataIndex: "checked_at", render: value => beijingClock(value, true) },
								{ title: "动作", dataIndex: "label" },
								{ title: "原因", dataIndex: "reason", render: (_value, row) => executionSummary(row, executionTime(row.checked_at)).reason },
							]}
						/>
					) },
					{ key: "review", label: "盘后实际成交复盘", children: data?.review
						? (
							<Space direction="vertical">
								<Typography.Text>
									已录入
									{data.review.trade_count}
									笔成交，费用
									{money(data.review.fees)}
									，实际降本
									{money(data.review.realized_reduction)}
									，已卖待回
									{data.review.pending_buyback_shares}
									股。
								</Typography.Text>
								<Typography.Text type="secondary">
									{data.review.note}
									；复盘时间：
									{beijingClock(data.review.reviewed_at, true)}
								</Typography.Text>
							</Space>
						)
						: <Typography.Text type="secondary">16:40后更新。触发提示不会自动记作成交，需按券商实际成交录入。</Typography.Text> },
				]}
			/>
		</section>
	);
}
