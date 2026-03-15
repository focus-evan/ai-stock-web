import type { BreakthroughData, BreakthroughStock } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchBreakthroughRecommendations } from "#src/api/strategy";
import { ReloadOutlined, RiseOutlined, RocketOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Alert, Badge, Card, Col, Empty, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from "antd";
import React, { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

const levelColors: Record<string, string> = {
	强烈推荐: "#f5222d",
	推荐: "#fa8c16",
	关注: "#1890ff",
	回避: "#8c8c8c",
};

const levelBg: Record<string, string> = {
	强烈推荐: "#fff1f0",
	推荐: "#fff7e6",
	关注: "#e6f7ff",
	回避: "#f5f5f5",
};

const BreakthroughPage: React.FC = () => {
	const [data, setData] = useState<BreakthroughData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchBreakthroughRecommendations(13);
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

	const columns: ColumnsType<BreakthroughStock> = [
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
			render: (_: any, record: BreakthroughStock) => (
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
			title: "突破类型",
			dataIndex: "breakthrough_type",
			key: "breakthrough_type",
			width: 130,
			render: (type: string) => (
				<Tag color={type.includes("60日") ? "red" : "orange"} icon={<RiseOutlined />}>
					{type}
				</Tag>
			),
		},
		{
			title: "突破价",
			dataIndex: "breakthrough_price",
			key: "breakthrough_price",
			width: 80,
			align: "right",
			render: (v: number) => (
				<Text>
					¥
					{v.toFixed(2)}
				</Text>
			),
		},
		{
			title: "量比",
			dataIndex: "volume_ratio",
			key: "volume_ratio",
			width: 70,
			align: "right",
			render: (v: number, record: BreakthroughStock) => (
				<Text style={{ color: record.is_volume_confirmed ? "#52c41a" : "#faad14", fontWeight: "bold" }}>
					{v.toFixed(1)}
					x
				</Text>
			),
		},
		{
			title: "放量确认",
			dataIndex: "is_volume_confirmed",
			key: "is_volume_confirmed",
			width: 80,
			align: "center",
			render: (v: boolean) => (
				v ? <Tag color="success">✓ 确认</Tag> : <Tag color="warning">⚠ 未确认</Tag>
			),
		},
		{
			title: "评分",
			dataIndex: "breakthrough_score",
			key: "score",
			width: 70,
			align: "center",
			render: (v: number) => (
				<Text
					strong
					style={{
						color: v >= 85 ? "#f5222d" : v >= 65 ? "#fa8c16" : "#1890ff",
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
					{reasons.map(r => (
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
					<Empty description="暂无突破信号" image={Empty.PRESENTED_IMAGE_SIMPLE}>
						<Text type="secondary">当前市场暂无符合条件的突破信号股，请在交易时间段内查看</Text>
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
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					borderRadius: 12,
				}}
			>
				<Row gutter={[24, 16]} align="middle">
					<Col span={12}>
						<Space align="center">
							<RocketOutlined style={{ fontSize: 32, color: "#fff" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>突破战法</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>
									关注关键阻力位突破 + 放量确认信号
								</Text>
							</div>
						</Space>
					</Col>
					<Col span={12}>
						<Row gutter={16} justify="end">
							<Col>
								<Statistic
									title={<span style={{ color: "rgba(255,255,255,0.65)" }}>信号总数</span>}
									value={data.total}
									valueStyle={{ color: "#fff", fontWeight: "bold" }}
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

			{data.breakthrough_summary && Object.keys(data.breakthrough_summary).length > 0 && (
				<Card
					size="small"
					bordered={false}
					style={{ marginBottom: 16, borderRadius: 8 }}
				>
					<Space wrap>
						<Text strong>突破类型分布：</Text>
						{Object.entries(data.breakthrough_summary).map(([type, count]) => (
							<Tag key={type} color={type.includes("60日") ? "red" : "orange"}>
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
						<ThunderboltOutlined style={{ color: "#722ed1" }} />
						<Text strong>突破信号股</Text>
						<Tag color="purple">
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
				<Card
					bordered={false}
					style={{ marginTop: 16, borderRadius: 12, background: "#fafafa" }}
					title="📊 策略分析报告"
				>
					<Paragraph style={{ whiteSpace: "pre-wrap" }}>
						{data.strategy_report}
					</Paragraph>
				</Card>
			)}

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

export default BreakthroughPage;
