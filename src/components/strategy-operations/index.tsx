import type { StrategyOperationAccount, StrategyOperations } from "#src/api/portfolio/operations";
import { fetchStrategyOperations } from "#src/api/portfolio/operations";
import { Alert, Button, Card, Space, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

import { metric } from "./format";

export default function StrategyOperationsPanel() {
	const [data, setData] = useState<StrategyOperations>();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetchStrategyOperations();
			if (response.status !== "success")
				throw new Error("unavailable");
			setData(response.data);
			setError("");
		}
		catch {
			setError("运行诊断暂不可用，请稍后刷新。缺少数据不代表收益为零。");
		}
		finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	return (
		<Card title="近月运行与收益" style={{ marginBottom: 20 }} extra={<Button loading={loading} onClick={() => void load()}>刷新诊断</Button>}>
			<Space direction="vertical" style={{ width: "100%" }}>
				{error && <Alert type="error" showIcon message={error} />}
				<Alert
					type="info"
					showIcon
					message={data ? `${data.start_date} 至 ${data.end_date}${data.is_intraday ? "（盘中）" : "（完整交易日）"}` : "正在读取统计区间"}
					description="账面资产变化与已核验交易分开统计。历史修复流水保留对账，整轮含修复或证据不全时不计模型战绩；没有有效样本不显示0%胜率。"
				/>
				{data && (
					<Typography.Text>{`在用账户账面损益：${metric(data.totals.book_pnl, "元")}；账务流水 ${data.totals.ledger_trade_count} 条，其中修复记录 ${data.totals.accounting_repair_count} 条。`}</Typography.Text>
				)}
				<Table<StrategyOperationAccount>
					rowKey="portfolio_id"
					loading={loading}
					dataSource={data?.accounts || []}
					size="small"
					scroll={{ x: 1180 }}
					pagination={{ pageSize: 8 }}
					expandable={{ expandedRowRender: row => (
						<Space direction="vertical">
							<Typography.Text>
								统计基点：
								{row.book.baseline_date || "缺失"}
								；最近资产记录：
								{row.book.through_date || "缺失"}
								；最近扫描：
								{row.operation.last_scan_at || "无记录"}
							</Typography.Text>
							<Typography.Text>{row.operation.blocking_reasons.map(item => `${item.reason}（${item.count}条）`).join("；") || row.operation.label}</Typography.Text>
							{row.operation.last_rejections.length > 0 && (
								<Typography.Text>
									最近未成交原因：
									{row.operation.last_rejections.map(item => `${item.stock_code}：${item.reason}`).join("；")}
								</Typography.Text>
							)}
							<Typography.Text type="secondary">{row.model.note}</Typography.Text>
						</Space>
					) }}
					columns={[
						{ title: "战法账户", width: 210, render: (_, row) => (
							<>
								{row.name}
								{" "}
								·
								{" "}
								{row.portfolio_id}
								{row.new_account_in_period && <Tag>本期新建</Tag>}
							</>
						) },
						{ title: "运行状态", width: 230, render: (_, row) => <Tag color={row.operation.status === "waiting_trigger" ? "blue" : "orange"} style={{ whiteSpace: "normal" }}>{row.operation.label}</Tag> },
						{ title: "本期账面收益", render: (_, row) => row.book.return_pct == null ? "缺少净值基点" : `${metric(row.book.return_pct, "%")}${row.book.stale ? "（记录未齐）" : ""}` },
						{ title: "核验后完整轮次", render: (_, row) => `${row.model.closed_cycle_count} 轮 / 排除 ${row.model.excluded_closed_cycle_count} 轮` },
						{ title: "完整轮次净损益", render: (_, row) => metric(row.model.net_pnl, "元") },
						{ title: "完整轮次胜率", render: (_, row) => metric(row.model.win_rate_pct, "%") },
						{ title: "修复流水（不计战绩）", dataIndex: ["ledger", "accounting_repair_count"] },
					]}
				/>
			</Space>
		</Card>
	);
}
