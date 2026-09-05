import type { PortfolioQualityAudit } from "#src/api/portfolio";
import { fetchPortfolioQualityAudit } from "#src/api/portfolio";
import { Alert, Button, Card, Space, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

function formatAuditPercent(value?: number | null): string {
	return value == null || !Number.isFinite(value) ? "未验证" : `${value.toFixed(2)}%`;
}

export default function PortfolioAuditPanel() {
	const [accounts, setAccounts] = useState<PortfolioQualityAudit[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetchPortfolioQualityAudit();
			if (response.status !== "success")
				throw new Error("审计数据未就绪");
			setAccounts(response.data.accounts);
			setError("");
		}
		catch {
			setError("交易证据审计暂不可用，账户显示值尚未验证。");
		}
		finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		void load();
	}, [load]);
	return (
		<Card title="交易证据与账户核验" style={{ marginBottom: 20 }} extra={<Button onClick={() => void load()} loading={loading}>刷新核验</Button>}>
			<Space direction="vertical" style={{ width: "100%" }}>
				<Alert type={error ? "error" : "info"} showIcon message={error || "同时保留现行和归档组合；历史重建成交不计入胜率。"} description="固定周期推荐收益、卖单胜率与完整交易净胜率使用不同分母。分批卖出合并为一轮，缺少盘口或资金证据时显示未验证。" />
				<Table<PortfolioQualityAudit>
					rowKey="portfolio_id"
					loading={loading}
					dataSource={accounts}
					size="small"
					scroll={{ x: 1250 }}
					pagination={{ pageSize: 5 }}
					expandable={{ expandedRowRender: row => <Typography.Paragraph>{row.data_quality_issues.join("；") || "暂无未解释账务差异；仍需检查策略样本量与前向表现。"}</Typography.Paragraph> }}
					columns={[
						{ title: "组合（含历史）", dataIndex: "name", width: 190 },
						{ title: "状态", render: (_, row) => (
							<Tag color={row.data_quality_passed ? "green" : "orange"}>
								{row.status !== "active" ? "归档 / " : ""}
								{row.validation_status === "no_trades" ? "无成交" : row.data_quality_passed ? "账务已核验" : "未验证"}
							</Tag>
						) },
						{ title: "账面收益", render: (_, row) => formatAuditPercent(row.account_return_pct) },
						{ title: "卖单 / 完整轮次", render: (_, row) => `${row.sell_count} / ${row.closed_cycle_count}` },
						{ title: "核验后整轮净胜率", render: (_, row) => formatAuditPercent(row.verified_cycle_win_rate_pct) },
						{ title: "现金差额（元）", render: (_, row) => row.cash_residual.toFixed(2) },
						{ title: "排除重建成交", dataIndex: "excluded_reconstruction_trade_count" },
						{ title: "有证据前向交易日", dataIndex: "clean_forward_days" },
					]}
				/>
			</Space>
		</Card>
	);
}
