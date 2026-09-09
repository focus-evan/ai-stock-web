import type { StrategyFollowType, StrategyTradeCycle, StrategyTradeJournalData, StrategyTradeStatus } from "#src/api/strategy";
import { fetchStrategyTradeJournal } from "#src/api/strategy";
import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Segmented, Space, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;
const labels = { holding: "持仓中", partial: "部分卖出", closed: "已清仓", incomplete: "记录待核验" };
const colors = { holding: "blue", partial: "gold", closed: "default", incomplete: "orange" };
const priceText = (value: number | null) => value == null ? "—" : `¥${value.toFixed(4)}`;
const reasonText = (value: string | null) => value || "未记录";

export default function StrategyTradeJournal({ strategyType }: { strategyType: StrategyFollowType }) {
	const [status, setStatus] = useState<StrategyTradeStatus>("all");
	const [page, setPage] = useState(1);
	const [revision, setRevision] = useState(0);
	const requestKey = `${strategyType}:${status}:${page}:${revision}`;
	const [result, setResult] = useState<{ key: string, data: StrategyTradeJournalData | null, error: string } | null>(null);
	const loading = result?.key !== requestKey;
	const data = loading ? null : result.data;
	const error = loading ? "" : result.error;

	useEffect(() => {
		let active = true;
		fetchStrategyTradeJournal(strategyType, status, 20, (page - 1) * 20)
			.then((response) => {
				if (!active)
					return;
				if (response.status !== "success" || !response.data)
					throw new Error(response.message || "获取交易跟进失败");
				setResult({ key: requestKey, data: response.data, error: "" });
			})
			.catch(() => {
				if (active)
					setResult({ key: requestKey, data: null, error: "获取交易跟进失败，请确认登录状态后重试" });
			});
		return () => {
			active = false;
		};
	}, [strategyType, status, page, requestKey]);

	const reasonCell = (value: string) => <div title={value} style={{ whiteSpace: "pre-wrap", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{value}</div>;
	const columns = [
		{ title: "股票", key: "stock", width: 170, render: (_: unknown, item: StrategyTradeCycle) => (
			<>
				<Text strong>{item.stock_name}</Text>
				<br />
				<Text type="secondary">{item.stock_code}</Text>
				<br />
				<Text type="secondary" style={{ fontSize: 12 }}>{item.portfolio_name}</Text>
			</>
		) },
		{ title: "状态", key: "status", width: 120, render: (_: unknown, item: StrategyTradeCycle) => <Tag color={colors[item.status]}>{labels[item.status]}</Tag> },
		{ title: "买入日期", dataIndex: "buy_date", width: 115, render: (value: string | null) => value || "未记录" },
		{ title: "买入原因", dataIndex: "buy_reason", width: 250, render: (value: string | null) => reasonCell(reasonText(value)) },
		{ title: "买入价格", dataIndex: "buy_price", width: 120, render: priceText },
		{ title: "卖出日期", dataIndex: "sell_date", width: 115, render: (value: string | null) => value || "未卖出" },
		{ title: "卖出价格", dataIndex: "sell_price", width: 120, render: priceText },
		{ title: "卖出原因", key: "sell_reason", width: 250, render: (_: unknown, item: StrategyTradeCycle) => reasonCell(item.sell_count ? reasonText(item.sell_reason) : "未卖出") },
	];

	return (
		<div>
			<Space wrap style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
				<Segmented
					value={status}
					onChange={(value) => {
						setStatus(value as StrategyTradeStatus);
						setPage(1);
					}}
					options={[
						{ label: "全部交易", value: "all" },
						{ label: "持仓中", value: "holding" },
						{ label: "已清仓", value: "closed" },
						{ label: "记录待核验", value: "incomplete" },
					]}
				/>
				<Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRevision(value => value + 1)}>刷新交易记录</Button>
			</Space>
			<Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
				每条记录对应一次建仓到清仓。分批成交时显示首次买入日期、最近卖出日期及各方向成交均价；展开可查看每笔成交的日期、价格、数量和原因。
			</Text>
			{data && (
				<Space wrap style={{ marginBottom: 12 }}>
					<Tag>
						共
						{data.summary.total}
						{" "}
						次交易跟进
					</Tag>
					<Tag color="blue">
						持仓
						{data.summary.holding}
					</Tag>
					<Tag>
						已清仓
						{data.summary.closed}
					</Tag>
					{data.summary.incomplete > 0 && (
						<Tag color="orange">
							待核验
							{data.summary.incomplete}
						</Tag>
					)}
					{data.summary.excluded_reconstruction_count > 0 && (
						<Text type="secondary">
							已排除
							{data.summary.excluded_reconstruction_count}
							{" "}
							笔历史重建交易
						</Text>
					)}
				</Space>
			)}
			{error
				? <Alert type="error" showIcon message={error} action={<Button onClick={() => setRevision(value => value + 1)}>重试</Button>} />
				: (
					<Table<StrategyTradeCycle>
						rowKey="id"
						loading={loading}
						columns={columns}
						dataSource={data?.items || []}
						scroll={{ x: 1360 }}
						locale={{ emptyText: <Empty description={status === "all" ? "暂无实际模拟成交，买入成交后自动记录" : "暂无符合条件的交易记录"} /> }}
						pagination={{ current: page, pageSize: 20, total: data?.total || 0, showSizeChanger: false, onChange: setPage }}
						expandable={{
							expandedRowRender: item => (
								<div>
									{item.issues.length > 0 && <Alert type="warning" message={item.issues.join("；")} style={{ marginBottom: 8 }} />}
									<Text>
										剩余持仓：
										{item.remaining_quantity == null ? "待核验" : `${item.remaining_quantity} 股`}
									</Text>
									<Table
										rowKey="trade_id"
										size="small"
										pagination={false}
										dataSource={item.executions}
										columns={[
											{ title: "成交日期", dataIndex: "date", render: (value: string | null) => value || "未记录" },
											{ title: "方向", dataIndex: "direction", render: (value: string) => value === "buy" ? "买入" : "卖出" },
											{ title: "成交价格", dataIndex: "price", render: priceText },
											{ title: "成交数量", dataIndex: "quantity", render: (value: number | null) => value == null ? "未记录" : `${value} 股` },
											{ title: "成交原因", dataIndex: "reason", render: reasonText },
										]}
									/>
								</div>
							),
						}}
					/>
				)}
		</div>
	);
}
