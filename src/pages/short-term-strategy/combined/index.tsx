import type { CombinedData, CombinedStock } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchCombinedRecommendations } from "#src/api/strategy";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CheckCircleFilled,
	DollarOutlined,
	MergeCellsOutlined,
	ReloadOutlined,
	StarFilled,
	TrophyOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Card,
	Col,
	Empty,
	Progress,
	Row,
	Skeleton,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";

const { Title, Text } = Typography;

/** 战法标签配色 */
const strategyColors: Record<string, string> = {
	"龙头战法": "#f5222d",
	"情绪战法": "#eb2f96",
	"事件驱动": "#722ed1",
	"突破战法": "#1890ff",
	"量价关系": "#13c2c2",
	"竞价/尾盘": "#faad14",
	"均线战法": "#52c41a",
};

/** 覆盖数量颜色 */
const overlapColors: Record<number, string> = {
	2: "#1890ff",
	3: "#722ed1",
	4: "#f5222d",
	5: "#cf1322",
	6: "#820014",
	7: "#5c0011",
};

const CombinedPage: React.FC = () => {
	const [data, setData] = useState<CombinedData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchCombinedRecommendations(10, 2);
			if (response.status === "success") {
				setData(response.data);
			}
			else {
				setError(response.message || "获取数据失败");
			}
		}
		catch (e: any) {
			setError(e?.message || "网络请求失败");
		}
		finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const columns: ColumnsType<CombinedStock> = [
		{
			title: "排名",
			dataIndex: "rank",
			key: "rank",
			width: 60,
			align: "center",
			render: (rank: number) => (
				<Badge
					count={rank}
					style={{
						backgroundColor: rank <= 3 ? "#f5222d" : rank <= 6 ? "#fa8c16" : "#1890ff",
						fontWeight: "bold",
					}}
				/>
			),
		},
		{
			title: "股票",
			key: "stock",
			width: 140,
			render: (_: any, record: CombinedStock) => (
				<Space direction="vertical" size={0}>
					<Text strong>{record.name}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
				</Space>
			),
		},
		{
			title: "覆盖战法数",
			dataIndex: "overlap_count",
			key: "overlap_count",
			width: 110,
			align: "center",
			sorter: (a, b) => a.overlap_count - b.overlap_count,
			render: (count: number) => (
				<Space>
					<Badge
						count={count}
						style={{
							backgroundColor: overlapColors[count] || "#1890ff",
							fontWeight: "bold",
							fontSize: 14,
						}}
						overflowCount={10}
					/>
					<Text
						strong
						style={{
							color: overlapColors[count] || "#1890ff",
							fontSize: 13,
						}}
					>
						个战法
					</Text>
				</Space>
			),
		},
		{
			title: "命中战法",
			dataIndex: "strategy_names",
			key: "strategies",
			width: 300,
			render: (names: string[]) => (
				<Space wrap size={[4, 4]}>
					{(names || []).map(name => (
						<Tag
							key={name}
							color={strategyColors[name] || "#1890ff"}
							style={{ margin: 0, fontWeight: 500 }}
						>
							{name}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "综合评分",
			dataIndex: "combined_score",
			key: "combined_score",
			width: 100,
			align: "center",
			sorter: (a, b) => a.combined_score - b.combined_score,
			render: (score: number) => (
				<Text
					strong
					style={{
						color: score >= 80 ? "#f5222d" : score >= 60 ? "#fa8c16" : "#1890ff",
						fontSize: 16,
					}}
				>
					{score}
				</Text>
			),
		},
		{
			title: "平均分",
			dataIndex: "avg_score",
			key: "avg_score",
			width: 80,
			align: "center",
			render: (score: number) => (
				<Text style={{ color: "#595959" }}>
					{score}
				</Text>
			),
		},
		{
			title: "最高分",
			dataIndex: "max_score",
			key: "max_score",
			width: 80,
			align: "center",
			render: (score: number) => (
				<Text strong style={{ color: "#fa8c16" }}>
					{score}
				</Text>
			),
		},
		{
			title: "各战法评分详情",
			key: "details",
			width: 350,
			render: (_: any, record: CombinedStock) => (
				<Space direction="vertical" size={2}>
					{(record.strategies || []).map((strategyKey, idx) => {
						const detail = record.strategy_details[strategyKey];
						const name = (record.strategy_names || [])[idx] || strategyKey;
						const score = detail?.score ?? "-";
						const rank = detail?.rank;
						return (
							<Space key={strategyKey} size={4}>
								<Tag
									color={strategyColors[name] || "#1890ff"}
									style={{ margin: 0, minWidth: 68, textAlign: "center" }}
								>
									{name}
								</Tag>
								<Text style={{ fontSize: 12 }}>
									评分:
									{" "}
									<Text strong>{score}</Text>
								</Text>
								{rank && (
									<Text type="secondary" style={{ fontSize: 12 }}>
										(第
										{rank}
										名)
									</Text>
								)}
								{detail?.reason && (
									<Tooltip title={detail.reason}>
										<Text
											type="secondary"
											style={{
												fontSize: 11,
												maxWidth: 120,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap",
												display: "inline-block",
												verticalAlign: "middle",
											}}
										>
											{detail.reason}
										</Text>
									</Tooltip>
								)}
							</Space>
						);
					})}
				</Space>
			),
		},
		{
			title: "操作指导",
			key: "operation_guide",
			width: 200,
			render: (_: any, record: CombinedStock) => {
				const cp = record.current_price || 0;
				const bp = record.suggested_buy_price || 0;
				const sp = record.suggested_sell_price || 0;
				const sl = record.stop_loss_price || 0;
				if (!cp) {
					return <Text type="secondary" style={{ fontSize: 12 }}>暂无价格数据</Text>;
				}
				return (
					<Space direction="vertical" size={2} style={{ width: "100%" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
							<Text style={{ fontSize: 12, color: "#8c8c8c" }}>
								<DollarOutlined />
								{" "}
								参考价
							</Text>
							<Text strong style={{ fontSize: 14, color: "#262626" }}>
								¥
								{cp.toFixed(2)}
							</Text>
						</div>
						<div style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "#f6ffed",
							padding: "2px 8px",
							borderRadius: 4,
							border: "1px solid #b7eb8f",
						}}
						>
							<Text style={{ fontSize: 12, color: "#52c41a" }}>
								<ArrowDownOutlined />
								{" "}
								买入价
							</Text>
							<Text strong style={{ fontSize: 13, color: "#389e0d" }}>
								¥
								{bp.toFixed(2)}
							</Text>
						</div>
						<div style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "#fff1f0",
							padding: "2px 8px",
							borderRadius: 4,
							border: "1px solid #ffa39e",
						}}
						>
							<Text style={{ fontSize: 12, color: "#f5222d" }}>
								<ArrowUpOutlined />
								{" "}
								目标价
							</Text>
							<Text strong style={{ fontSize: 13, color: "#cf1322" }}>
								¥
								{sp.toFixed(2)}
							</Text>
						</div>
						<div style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							background: "#fafafa",
							padding: "2px 8px",
							borderRadius: 4,
							border: "1px dashed #d9d9d9",
						}}
						>
							<Text style={{ fontSize: 11, color: "#8c8c8c" }}>⛔ 止损价</Text>
							<Text style={{ fontSize: 12, color: "#8c8c8c" }}>
								¥
								{sl.toFixed(2)}
							</Text>
						</div>
					</Space>
				);
			},
		},
	];

	if (loading) {
		return (
			<div style={{ padding: 24 }}>
				<Skeleton active paragraph={{ rows: 2 }} />
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: 24 }}>
				<Alert
					message="加载失败"
					description={error}
					type="error"
					showIcon
					action={<a onClick={fetchData}>重试</a>}
				/>
			</div>
		);
	}

	if (!data || data.recommendations.length === 0) {
		return (
			<div style={{ padding: 24 }}>
				<Card>
					<Empty description="暂无综合推荐" image={Empty.PRESENTED_IMAGE_SIMPLE}>
						<Text type="secondary">
							当前没有被 2 个及以上战法同时推荐的股票，请等待各战法推荐生成后查看
						</Text>
					</Empty>
				</Card>
			</div>
		);
	}

	// 统计数据
	const avgOverlap = data.recommendations.length > 0
		? (data.recommendations.reduce((s, r) => s + r.overlap_count, 0) / data.recommendations.length).toFixed(1)
		: "0";
	const maxOverlap = data.recommendations.length > 0
		? Math.max(...data.recommendations.map(r => r.overlap_count))
		: 0;
	const contribution = data.strategy_contribution || {};
	const sourceStrategies = data.source_strategies || {};

	return (
		<div style={{ padding: 24 }}>
			{/* 顶部 Banner */}
			<Card
				bordered={false}
				style={{
					marginBottom: 24,
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
					borderRadius: 12,
				}}
			>
				<Row gutter={[24, 16]} align="middle">
					<Col span={12}>
						<Space align="center">
							<MergeCellsOutlined style={{ fontSize: 32, color: "#fff" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>综合战法</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>
									七种战法推荐交集 · 多重验证 · 强共识股
								</Text>
							</div>
						</Space>
					</Col>
					<Col span={12}>
						<Row gutter={16} justify="end">
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>交集股数</span>}
									value={data.total}
									valueStyle={{ color: "#fff", fontWeight: "bold" }}
									suffix="只"
								/>
							</Col>
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>最高覆盖</span>}
									value={maxOverlap}
									valueStyle={{ color: "#ffd666", fontWeight: "bold" }}
									suffix="个战法"
								/>
							</Col>
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>平均覆盖</span>}
									value={avgOverlap}
									valueStyle={{ color: "#fff", fontWeight: "bold" }}
									suffix="个"
								/>
							</Col>
							{data.generated_at && (
								<Col>
									<Statistic
										title={<span style={{ color: "rgba(255,255,255,0.65)" }}>更新时间</span>}
										value={data.generated_at.split(" ")[1] || data.generated_at}
										valueStyle={{ color: "#fff", fontSize: 14 }}
									/>
								</Col>
							)}
						</Row>
					</Col>
				</Row>
			</Card>

			{/* 战法贡献度 */}
			{Object.keys(contribution).length > 0 && (
				<Card
					bordered={false}
					size="small"
					style={{ marginBottom: 16, borderRadius: 8 }}
					title={(
						<Space>
							<TrophyOutlined style={{ color: "#faad14" }} />
							<Text strong>各战法贡献度</Text>
							<Text type="secondary" style={{ fontSize: 12 }}>（贡献了多少只交集股票）</Text>
						</Space>
					)}
				>
					<Row gutter={[16, 12]}>
						{Object.entries(contribution).map(([name, count]) => {
							const total = data.total;
							const pct = total > 0 ? Math.round((count / total) * 100) : 0;
							const sourceCount = sourceStrategies[name] ?? 0;
							return (
								<Col key={name} xs={12} sm={8} md={6}>
									<Card
										size="small"
										bordered={false}
										style={{
											background: "#fafafa",
											borderRadius: 8,
											textAlign: "center",
										}}
									>
										<Tag
											color={strategyColors[name] || "#1890ff"}
											style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}
										>
											{name}
										</Tag>
										<div style={{ marginBottom: 4 }}>
											<Text strong style={{ fontSize: 20 }}>{count}</Text>
											<Text type="secondary">
												{" "}
												/
												{sourceCount}
												{" "}
												只
											</Text>
										</div>
										<Progress
											percent={pct}
											size="small"
											strokeColor={strategyColors[name] || "#1890ff"}
											showInfo={false}
										/>
									</Card>
								</Col>
							);
						})}
					</Row>
				</Card>
			)}

			{/* 核心推荐卡片 - Top 3 */}
			{data.recommendations.length >= 3 && (
				<Row gutter={16} style={{ marginBottom: 16 }}>
					{data.recommendations.slice(0, 3).map((stock, idx) => (
						<Col key={stock.code} xs={24} sm={8}>
							<Card
								bordered={false}
								style={{
									borderRadius: 12,
									background: idx === 0
										? "linear-gradient(135deg, #fff2e8, #fff7e6)"
										: idx === 1
											? "linear-gradient(135deg, #f0f5ff, #e6f7ff)"
											: "linear-gradient(135deg, #f6ffed, #fcffe6)",
									border: `1px solid ${idx === 0 ? "#ffd591" : idx === 1 ? "#91d5ff" : "#b7eb8f"}`,
								}}
							>
								<Space direction="vertical" style={{ width: "100%" }}>
									<Space>
										<StarFilled style={{
											color: idx === 0 ? "#faad14" : idx === 1 ? "#1890ff" : "#52c41a",
											fontSize: 20,
										}}
										/>
										<Text strong style={{ fontSize: 18 }}>{stock.name}</Text>
										<Text type="secondary">{stock.code}</Text>
									</Space>
									<Space>
										<Tag
											color={overlapColors[stock.overlap_count] || "#1890ff"}
											style={{ fontWeight: 600 }}
										>
											{stock.overlap_count}
											{" "}
											个战法推荐
										</Tag>
										<Text strong style={{ fontSize: 16, color: "#f5222d" }}>
											综合评分:
											{" "}
											{stock.combined_score}
										</Text>
									</Space>
									<Space wrap size={[4, 4]}>
										{(stock.strategy_names || []).map(name => (
											<Tag
												key={name}
												color={strategyColors[name] || "#1890ff"}
												icon={<CheckCircleFilled />}
												style={{ margin: 0 }}
											>
												{name}
											</Tag>
										))}
									</Space>
									{/* 操作指导价格区 */}
									{(stock.current_price ?? 0) > 0 && (
										<div style={{
											marginTop: 8,
											padding: "8px 12px",
											background: "rgba(255,255,255,0.85)",
											borderRadius: 8,
											border: "1px solid rgba(0,0,0,0.06)",
										}}
										>
											<Text strong style={{ fontSize: 12, color: "#8c8c8c", display: "block", marginBottom: 4 }}>
												<DollarOutlined />
												{" "}
												次日操作指导
											</Text>
											<Row gutter={8}>
												<Col span={8}>
													<div style={{ textAlign: "center" }}>
														<Text style={{ fontSize: 11, color: "#52c41a" }}>买入 ↓</Text>
														<div>
															<Text strong style={{ fontSize: 14, color: "#389e0d" }}>
																{(stock.suggested_buy_price || 0).toFixed(2)}
															</Text>
														</div>
													</div>
												</Col>
												<Col span={8}>
													<div style={{ textAlign: "center" }}>
														<Text style={{ fontSize: 11, color: "#f5222d" }}>目标 ↑</Text>
														<div>
															<Text strong style={{ fontSize: 14, color: "#cf1322" }}>
																{(stock.suggested_sell_price || 0).toFixed(2)}
															</Text>
														</div>
													</div>
												</Col>
												<Col span={8}>
													<div style={{ textAlign: "center" }}>
														<Text style={{ fontSize: 11, color: "#8c8c8c" }}>止损 ⛔</Text>
														<div>
															<Text style={{ fontSize: 14, color: "#8c8c8c" }}>
																{(stock.stop_loss_price || 0).toFixed(2)}
															</Text>
														</div>
													</div>
												</Col>
											</Row>
										</div>
									)}
								</Space>
							</Card>
						</Col>
					))}
				</Row>
			)}

			{/* 详细推荐表格 */}
			<Card
				bordered={false}
				style={{ borderRadius: 12 }}
				title={(
					<Space>
						<MergeCellsOutlined style={{ color: "#722ed1" }} />
						<Text strong>多战法交集推荐股</Text>
						<Tag color="purple">
							{data.recommendations.length}
							{" "}
							只
						</Tag>
					</Space>
				)}
				extra={(
					<a onClick={fetchData}>
						<ReloadOutlined />
						{" "}
						刷新
					</a>
				)}
			>
				<Table
					columns={columns}
					dataSource={data.recommendations}
					rowKey="code"
					pagination={false}
					size="small"
					scroll={{ x: 1500 }}
					rowClassName={(record) => {
						if (record.overlap_count >= 4)
							return "row-highlight-red";
						if (record.overlap_count >= 3)
							return "row-highlight-orange";
						return "";
					}}
				/>
			</Card>

			{/* 操作说明 */}
			<Alert
				style={{ marginTop: 16, borderRadius: 8 }}
				type="info"
				showIcon
				icon={<DollarOutlined />}
				message="操作指导说明"
				description={(
					<Space direction="vertical" size={4}>
						<Text style={{ fontSize: 13 }}>
							<Text strong style={{ color: "#389e0d" }}>建议买入价</Text>
							：当前价 × 98%，次日开盘回调时低吸，不追高。
						</Text>
						<Text style={{ fontSize: 13 }}>
							<Text strong style={{ color: "#cf1322" }}>目标卖出价</Text>
							：当前价 × 105%，短线目标 5% 收益。到达后分批止盈。
						</Text>
						<Text style={{ fontSize: 13 }}>
							<Text strong style={{ color: "#8c8c8c" }}>止损价</Text>
							：当前价 × 95%，跌破止损线果断离场，控制风险。
						</Text>
						<Text type="secondary" style={{ fontSize: 12 }}>
							⚠️ 以上价格为算法参考值，实际操作请结合盘面情况。遵循 T+1 规则，当天买入次日方可卖出。
						</Text>
					</Space>
				)}
			/>

			<style>
				{`
				.row-highlight-red {
					background-color: #fff1f0 !important;
				}
				.row-highlight-red:hover > td {
					background-color: #ffccc7 !important;
				}
				.row-highlight-orange {
					background-color: #fff7e6 !important;
				}
				.row-highlight-orange:hover > td {
					background-color: #ffe7ba !important;
				}
			`}
			</style>
		</div>
	);
};

export default CombinedPage;
