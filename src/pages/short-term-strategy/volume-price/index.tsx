import type { VolumePriceData, VolumePriceStock } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchVolumePriceRecommendations } from "#src/api/strategy";
import { BarChartOutlined, FireOutlined, ReloadOutlined } from "@ant-design/icons";
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

const signalColors: Record<string, string> = {
	"量价齐升": "red",
	"底部放量": "volcano",
	"缩量回调后放量反转": "gold",
	"异常放量": "orange",
	"量价背离（风险）": "default",
};

const VolumePricePage: React.FC = () => {
	const [data, setData] = useState<VolumePriceData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchVolumePriceRecommendations(13);
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

	const columns: ColumnsType<VolumePriceStock> = [
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
			render: (_: any, record: VolumePriceStock) => (
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
			width: 150,
			render: (type: string) => (
				<Tag color={signalColors[type] || "blue"} icon={<FireOutlined />}>
					{type}
				</Tag>
			),
		},
		{
			title: "5日量比",
			dataIndex: "vol_ratio_5",
			key: "vol_ratio_5",
			width: 80,
			align: "right",
			render: (v: number) => (
				<Text style={{ color: v >= 2 ? "#f5222d" : v >= 1.5 ? "#fa8c16" : "#1890ff", fontWeight: "bold" }}>
					{v.toFixed(1)}
					x
				</Text>
			),
		},
		{
			title: "5日价格趋势",
			dataIndex: "price_trend_5d",
			key: "price_trend_5d",
			width: 100,
			align: "right",
			render: (v: number) => (
				<Text style={{ color: v >= 0 ? "#f5222d" : "#52c41a" }}>
					{v >= 0 ? "↑" : "↓"}
					{" "}
					{Math.abs(v).toFixed(1)}
					%
				</Text>
			),
		},
		{
			title: "5日量能趋势",
			dataIndex: "vol_trend_5d",
			key: "vol_trend_5d",
			width: 100,
			align: "right",
			render: (v: number) => (
				<Text style={{ color: v >= 0 ? "#f5222d" : "#52c41a" }}>
					{v >= 0 ? "↑" : "↓"}
					{" "}
					{Math.abs(v).toFixed(1)}
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
					<Empty description="暂无量价信号" image={Empty.PRESENTED_IMAGE_SIMPLE}>
						<Text type="secondary">当前暂无量价异动信号，请在交易时段查看</Text>
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
					background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
					borderRadius: 12,
				}}
			>
				<Row gutter={[24, 16]} align="middle">
					<Col span={12}>
						<Space align="center">
							<BarChartOutlined style={{ fontSize: 32, color: "#fff" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>量价关系</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>
									量为价先，通过量价异动捕捉主力动向
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
						</Row>
					</Col>
				</Row>
			</Card>

			{data.signal_summary && Object.keys(data.signal_summary).length > 0 && (
				<Card size="small" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
					<Space wrap>
						<Text strong>信号分布：</Text>
						{Object.entries(data.signal_summary).map(([type, count]) => (
							<Tag key={type} color={signalColors[type] || "blue"}>
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
						<FireOutlined style={{ color: "#f5222d" }} />
						<Text strong>量价信号股</Text>
						<Tag color="red">
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
					scroll={{ x: 1300 }}
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
				<Card bordered={false} style={{ marginTop: 16, borderRadius: 12, background: "#fafafa" }} title="📊 策略分析报告">
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
		</div>
	);
};

export default VolumePricePage;
