import type { OvernightData, OvernightStock } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchOvernightRecommendations, refreshOvernightRecommendations } from "#src/api/strategy";
import RecommendationHistory from "#src/components/RecommendationHistory";
import { LineChartOutlined, MoonOutlined, ReloadOutlined, RiseOutlined, StockOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Card, Col, Empty, message, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from "antd";

import React, { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

const levelColors: Record<string, string> = {
	强烈推荐: "#f5222d",
	推荐: "#fa8c16",
	关注: "#1890ff",
	观望: "#8c8c8c",
};

const levelBg: Record<string, string> = {
	强烈推荐: "#fff1f0",
	推荐: "#fff7e6",
	关注: "#e6f7ff",
	观望: "#f5f5f5",
};

const OvernightPage: React.FC = () => {
	const [data, setData] = useState<OvernightData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchOvernightRecommendations(13);
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

	const handleRefresh = async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		message.loading({ content: "正在七步筛选+AI分析，需要2-3分钟...", key: "refresh", duration: 0 });
		const timer = setInterval(() => {
			setRefreshSeconds(prev => prev + 1);
		}, 1000);
		try {
			const response = await refreshOvernightRecommendations(13);
			if (response.status === "success") {
				setData(response.data);
				message.success({ content: `刷新完成，共 ${response.data?.recommendations?.length || 0} 只推荐股`, key: "refresh" });
			}
			else {
				message.error({ content: "刷新失败", key: "refresh" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || "刷新超时，请稍后重试", key: "refresh" });
		}
		finally {
			clearInterval(timer);
			setRefreshing(false);
			setRefreshSeconds(0);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	const columns: ColumnsType<OvernightStock> = [
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
			render: (_: any, record: OvernightStock) => (
				<Space direction="vertical" size={0}>
					<Text strong>{record.name}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>{record.code}</Text>
				</Space>
			),
		},
		{
			title: "现价",
			dataIndex: "price",
			key: "price",
			width: 80,
			align: "right",
			render: (v: number) => (
				<Text strong>
					¥
					{v.toFixed(2)}
				</Text>
			),
		},
		{
			title: "涨幅",
			dataIndex: "change_pct",
			key: "change_pct",
			width: 80,
			align: "right",
			render: (v: number) => (
				<Text style={{ color: v >= 0 ? "#f5222d" : "#52c41a", fontWeight: "bold" }}>
					{v >= 0 ? "+" : ""}
					{v.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "信号类型",
			dataIndex: "signal_type",
			key: "signal_type",
			width: 200,
			render: (type: string) => (
				<Space wrap size={2}>
					{type.split(" + ").map(t => (
						<Tag
							key={t}
							color={
								t.includes("涨停")
									? "red"
									: t.includes("多头")
										? "green"
										: t.includes("台阶")
											? "blue"
											: "purple"
							}
							icon={
								t.includes("涨停")
									? <RiseOutlined />
									: t.includes("多头")
										? <LineChartOutlined />
										: t.includes("量能")
											? <StockOutlined />
											: undefined
							}
						>
							{t}
						</Tag>
					))}
				</Space>
			),
		},
		{
			title: "量比",
			dataIndex: "volume_ratio",
			key: "volume_ratio",
			width: 70,
			align: "right",
			render: (v: number) => (
				<Text style={{ color: v >= 2 ? "#f5222d" : v >= 1.5 ? "#fa8c16" : "#1890ff", fontWeight: "bold" }}>
					{v.toFixed(1)}
				</Text>
			),
		},
		{
			title: "换手率",
			dataIndex: "turnover_rate",
			key: "turnover_rate",
			width: 80,
			align: "right",
			render: (v: number) => (
				<Text>
					{v.toFixed(1)}
					%
				</Text>
			),
		},
		{
			title: "评分",
			dataIndex: "signal_score",
			key: "score",
			width: 70,
			align: "center",
			render: (v: number) => (
				<Text
					strong
					style={{
						color: v >= 80 ? "#f5222d" : v >= 65 ? "#fa8c16" : "#1890ff",
						fontSize: 16,
					}}
				>
					{v}
				</Text>
			),
		},
		{
			title: "推荐级别",
			dataIndex: "recommendation_level",
			key: "level",
			width: 90,
			align: "center",
			render: (level: string) => (
				<Tag
					style={{
						color: levelColors[level] || "#1890ff",
						backgroundColor: levelBg[level] || "#e6f7ff",
						border: `1px solid ${levelColors[level] || "#1890ff"}`,
						fontWeight: "bold",
					}}
				>
					{level}
				</Tag>
			),
		},
		{
			title: "推荐理由",
			dataIndex: "reasons",
			key: "reasons",
			width: 280,
			render: (reasons: string[]) => (
				<Space direction="vertical" size={2}>
					{(reasons || []).map(r => (
						<Text key={r} style={{ fontSize: 12 }}>
							•
							{r}
						</Text>
					))}
				</Space>
			),
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
					<Empty description="暂无隔夜施工法信号" image={Empty.PRESENTED_IMAGE_SIMPLE}>
						<Text type="secondary">隔夜施工法信号在14:10-14:25生成（七步筛选）</Text>
					</Empty>
				</Card>
			</div>
		);
	}

	return (
		<div style={{ padding: 24 }}>
			<Card
				bordered={false}
				style={{
					marginBottom: 24,
					background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
					borderRadius: 12,
				}}
			>
				<Row gutter={[24, 16]} align="middle">
					<Col span={12}>
						<Space align="center">
							<MoonOutlined style={{ fontSize: 32, color: "#ffd93d" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>
									🌙 隔夜施工法
								</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>
									14:30七步筛选强势股 → 尾盘买入 → 次日集合竞价/开盘卖出
								</Text>
							</div>
							<Button
								type="primary"
								ghost
								icon={<ReloadOutlined spin={refreshing} />}
								loading={refreshing}
								onClick={handleRefresh}
								style={{
									borderColor: "rgba(255,255,255,0.5)",
									color: "#fff",
									marginLeft: 12,
								}}
							>
								{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新推荐"}
							</Button>
						</Space>
					</Col>
					<Col span={12}>
						<Row gutter={16} justify="end">
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>候选股</span>}
									value={data.total}
									valueStyle={{ color: "#ffd93d", fontWeight: "bold" }}
									suffix="只"
								/>
							</Col>
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>AI增强</span>}
									value={data.llm_enhanced ? "已增强" : "基础"}
									valueStyle={{ color: data.llm_enhanced ? "#52c41a" : "#faad14", fontWeight: "bold" }}
								/>
							</Col>
							{data.generated_at && (
								<Col>
									<div>
										<span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>筛选时间</span>
										<div style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginTop: 4 }}>{data.generated_at}</div>
									</div>
								</Col>
							)}
						</Row>
					</Col>
				</Row>
			</Card>

			<Alert
				message="隔夜施工法交易规则"
				description="涨幅3-5% + 量比>1 + 换手率5-10% + 市值50-200亿 + 均线多头 + 量能台阶放大 → 尾盘14:55买入 → 次日集合竞价/开盘5分钟卖出。止损-2%，绝不隔第二夜！"
				type="info"
				showIcon
				style={{ marginBottom: 16, borderRadius: 8 }}
				closable
			/>

			{data.signal_summary && Object.keys(data.signal_summary).length > 0 && (
				<Card size="small" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
					<Space wrap>
						<Text strong>信号分布：</Text>
						{Object.entries(data.signal_summary).map(([type, count]) => (
							<Tag
								key={type}
								color={
									type.includes("涨停")
										? "red"
										: type.includes("多头")
											? "green"
											: type.includes("台阶")
												? "blue"
												: "purple"
								}
							>
								{type}
								:
								{count}
								只
							</Tag>
						))}
					</Space>
				</Card>
			)}

			<Card
				bordered={false}
				style={{ borderRadius: 12 }}
				title={(
					<Space>
						<MoonOutlined style={{ color: "#0f3460" }} />
						<Text strong>隔夜施工候选股</Text>
						<Tag color="blue">
							{data.recommendations.length}
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
					scroll={{ x: 1200 }}
					rowClassName={(record) => {
						if (record.recommendation_level === "强烈推荐")
							return "row-highlight-red";
						if (record.recommendation_level === "推荐")
							return "row-highlight-orange";
						return "";
					}}
				/>
			</Card>

			{data.strategy_report && (
				<Card bordered={false} style={{ marginTop: 16, borderRadius: 12, background: "#fafafa" }} title="📊 隔夜施工法分析报告">
					<Paragraph style={{ whiteSpace: "pre-wrap" }}>{data.strategy_report}</Paragraph>
				</Card>
			)}

			<style>
				{`
				.row-highlight-red { background-color: #fff1f0 !important; }
				.row-highlight-red:hover > td { background-color: #ffccc7 !important; }
				.row-highlight-orange { background-color: #fff7e6 !important; }
				.row-highlight-orange:hover > td { background-color: #ffe7ba !important; }
			`}
			</style>

			<RecommendationHistory strategyType="overnight" />

		</div>
	);
};

export default OvernightPage;
