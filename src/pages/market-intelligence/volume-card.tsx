import { fetchVolume, refreshVolume } from "#src/api/market-intelligence";
import { useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Collapse, Empty, List, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { formatTime, safeHref } from "./data";

const { Text, Paragraph, Title } = Typography;
const amount = (value: number | null) => value === null ? "待补齐" : `${(value / 1e8).toLocaleString("zh-CN", { maximumFractionDigits: 0 })} 亿元`;
const change = (value: number | null) => value === null ? "待确认" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function VolumeCard() {
	const { message } = App.useApp();
	const [refreshing, setRefreshing] = useState(false);
	const query = useQuery({ queryKey: ["market-intelligence-volume"], queryFn: fetchVolume, refetchInterval: 60000 });
	const data = query.data?.data;
	const latest = data?.latest;
	const intraday = latest?.phase === "intraday";
	async function refresh() {
		setRefreshing(true);
		try {
			const result = await refreshVolume();
			if (result.status === "failed")
				message.warning(result.error || "行情暂不可用，已保留上次结果");
			else if (result.status !== "completed")
				message.info("正在更新或刚刚更新，请稍后查看");
			await query.refetch();
		}
		catch { message.error("量能更新未完成，请稍后重试"); }
		finally { setRefreshing(false); }
	}
	return (
		<Card title="A股量能分析" extra={<Button onClick={refresh} loading={refreshing}>更新量能</Button>} style={{ borderTop: "3px solid #1677ff" }}>
			<Space direction="vertical" size="middle" style={{ width: "100%" }}>
				<Space wrap>
					<Tag color={data?.runtime.running ? "blue" : "default"}>{data?.runtime.running ? "按交易节奏自动跟踪" : "量能自动任务未运行"}</Tag>
					<Text type="secondary">北京时间 · 交易日更新 · 休市沿用最近交易日</Text>
				</Space>
				{data?.runtime.checkpoints && <Text type="secondary">{data.runtime.checkpoints.map(c => `${c.time} ${c.name}`).join(" → ")}</Text>}
				{query.isError && <Alert type="error" message="量能数据读取失败" action={<Button onClick={() => query.refetch()}>重试</Button>} />}
				{data && !data.runtime.calendar_known && <Alert type="warning" message="交易日历待更新，自动跟踪暂停推定交易日" />}
				{data?.stale && <Alert type="warning" showIcon message="当前显示的是上次量能记录，本检查点数据尚未更新" />}
				{data?.last_attempt?.error && <Alert type="warning" showIcon message="最近一次量能更新未完成" description={data.last_attempt.error} />}
				{latest
					? (
						<>
							<Space wrap>
								<Tag>{intraday ? "盘中观察" : "收盘实值"}</Tag>
								<Text type="secondary">
									行情截至：
									{formatTime(latest.as_of)}
									{" "}
									· 更新于：
									{formatTime(latest.observed_at)}
								</Text>
							</Space>
							<Title level={4} style={{ margin: 0 }}>{latest.headline}</Title>
							<Paragraph style={{ margin: 0 }}>{latest.summary}</Paragraph>
							<Row gutter={[16, 16]} style={{ width: "100%" }}>
								<Col xs={24} sm={12} xl={6}><Statistic title={intraday ? "截至当前已成交" : "全天成交额"} value={amount(latest.amount)} /></Col>
								<Col xs={24} sm={12} xl={6}><Statistic title={latest.comparison_label} value={change(latest.comparison_pct)} /></Col>
								<Col xs={24} sm={12} xl={6}>
									<Statistic title="此前5个交易日日均成交" value={amount(latest.average_5)} />
									{!intraday && (
										<Text type="secondary">
											相差
											{change(latest.vs_average_5_pct)}
										</Text>
									)}
								</Col>
								<Col xs={24} sm={12} xl={6}>
									<Statistic title="此前20个交易日日均成交" value={amount(latest.average_20)} />
									{!intraday && (
										<Text type="secondary">
											相差
											{change(latest.vs_average_20_pct)}
										</Text>
									)}
								</Col>
							</Row>
							<Space wrap>
								{latest.indices.map(index => (
									<Tag key={index.name}>
										{index.name}
										指数
										{" "}
										{change(index.change_pct)}
									</Tag>
								))}
							</Space>
							<Paragraph style={{ margin: 0 }}>
								<Text strong>通俗理解：</Text>
								{latest.meaning}
							</Paragraph>
							<Paragraph style={{ margin: 0 }}>
								<Text strong>有没有延续：</Text>
								{latest.continuity}
							</Paragraph>
							<Paragraph style={{ margin: 0 }}>
								<Text strong>接下来怎么看：</Text>
								{latest.next_watch}
							</Paragraph>
							{intraday && latest.estimated_close_amount !== null && <Alert type="info" message={`全天预估：${amount(latest.estimated_close_amount)}（估算）`} description={latest.estimate_note} />}
							<Text type="secondary">{latest.scope}</Text>
							<Collapse items={[
								{ key: "method", label: "计算口径、数据来源与判断边界", children: (
									<Space direction="vertical">
										<Paragraph>{latest.method}</Paragraph>
										<List size="small" dataSource={latest.limitations} renderItem={item => <List.Item>{item}</List.Item>} />
										<Space wrap>{latest.sources.map(source => <a key={source.url} href={safeHref(source.url)} target="_blank" rel="noreferrer">{source.name}</a>)}</Space>
									</Space>
								) },
								{ key: "history", label: "最近量能跟踪记录", children: (
									<Table
										rowKey="observed_at"
										dataSource={data?.history || []}
										size="small"
										scroll={{ x: 720 }}
										pagination={{ pageSize: 5 }}
										columns={[
											{ title: "行情时点", dataIndex: "as_of", render: formatTime },
											{ title: "成交额", dataIndex: "amount", render: amount },
											{ title: "比较口径", dataIndex: "comparison_label" },
											{ title: "变化", dataIndex: "comparison_pct", render: change },
											{ title: "当时判断", dataIndex: "headline" },
										]}
									/>
								) },
							]}
							/>
						</>
					)
					: !query.isLoading && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="量能数据尚未生成，可点击更新量能" />}
				{data?.runtime.next_run_at && (
					<Text type="secondary">
						下一次自动检查：
						{formatTime(data.runtime.next_run_at)}
					</Text>
				)}
			</Space>
		</Card>
	);
}
