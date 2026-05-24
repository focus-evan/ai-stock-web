import type { OvernightData, OvernightStock } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchOvernightRecommendations, refreshOvernightRecommendations } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";

import { AlertOutlined, LineChartOutlined, MoonOutlined, ReloadOutlined, RiseOutlined, SafetyOutlined, StockOutlined } from "@ant-design/icons";
import { Alert, Badge, Button, Card, Col, Empty, message, Row, Skeleton, Space, Statistic, Table, Tabs, Tag, Typography } from "antd";
import React, { useEffect, useMemo, useState } from "react";

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

function executionTagColor(level?: string) {
	switch (level) {
		case "强烈推荐": return "red";
		case "推荐": return "orange";
		default: return "blue";
	}
}

function executionCardPalette(verdict: string) {
	switch (verdict) {
		case "竞价优先兑现":
			return { border: "#f5222d", tag: "red", badgeBg: "#fff1f0", badgeText: "#cf1322" };
		case "开盘冲高择机卖":
			return { border: "#fa8c16", tag: "orange", badgeBg: "#fff7e6", badgeText: "#d46b08" };
		case "低开不及预期直接走":
			return { border: "#722ed1", tag: "purple", badgeBg: "#f9f0ff", badgeText: "#531dab" };
		default:
			return { border: "#8c8c8c", tag: "default", badgeBg: "#fafafa", badgeText: "#595959" };
	}
}

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

	const executionRules = useMemo(() => ({
		execution_window: data?.execution_rules?.execution_window || "14:55尾盘确认后买入",
		sell_window: data?.execution_rules?.sell_window || "次日集合竞价 / 开盘5分钟卖出",
		exit_rule: data?.execution_rules?.exit_rule || "绝不隔第二夜，竞价不及预期直接走",
		overnight_risk: data?.execution_rules?.overnight_risk || "低开、竞价走弱、隔夜情绪反转",
		execution_verdict_hint: data?.execution_rules?.execution_verdict_hint || "按推荐级别与强弱决定竞价优先兑现、开盘冲高卖或低开直接走",
	}), [data]);

	const renderStrategyContent = (payload: OvernightData | null) => {
		if (!payload || payload.recommendations.length === 0) {
			return (
				<BasicContent>
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
								<Col span={14}>
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
									</Space>
								</Col>
								<Col span={10} style={{ textAlign: "right" }}>
									<Button
										type="primary"
										size="large"
										icon={<ReloadOutlined spin={refreshing} />}
										loading={refreshing}
										onClick={handleRefresh}
										style={{
											background: "linear-gradient(135deg, #ffd93d 0%, #ff9a00 100%)",
											border: "none",
											fontWeight: "bold",
											height: 44,
											paddingInline: 28,
											borderRadius: 8,
											boxShadow: "0 4px 15px rgba(255, 217, 61, 0.4)",
										}}
									>
										{refreshing ? `AI筛选中 ${refreshSeconds}s...` : "立即筛选推荐"}
									</Button>
								</Col>
							</Row>
						</Card>

						<Card bordered={false} style={{ borderRadius: 12, textAlign: "center", padding: "40px 0" }}>
							<Empty
								image={Empty.PRESENTED_IMAGE_SIMPLE}
								description={(
									<Space direction="vertical" size={8}>
										<Text strong style={{ fontSize: 16 }}>暂无隔夜施工法推荐</Text>
										<Text type="secondary">定时任务将在每个交易日 14:30 自动执行七步筛选</Text>
										<Text type="secondary">你也可以点击上方「立即筛选推荐」手动触发</Text>
									</Space>
								)}
							/>
						</Card>

						<Card
							bordered={false}
							style={{ borderRadius: 12, marginTop: 16 }}
							title={(
								<Space>
									<MoonOutlined style={{ color: "#0f3460" }} />
									<Text strong>七步筛选体系</Text>
								</Space>
							)}
						>
							<Row gutter={[16, 12]}>
								{[
									{ step: "①", label: "涨幅3-5%", desc: "日内温和上涨，非暴涨" },
									{ step: "②", label: "量比 > 1", desc: "成交活跃度高于平均" },
									{ step: "③", label: "换手5-10%", desc: "筹码充分换手" },
									{ step: "④", label: "市值50-200亿", desc: "中盘股灵活度高" },
									{ step: "⑤", label: "量能台阶放大", desc: "资金持续流入信号" },
									{ step: "⑥", label: "均线多头排列", desc: "5>10>20>60日均线" },
									{ step: "⑦", label: "分时强于均价", desc: "盘中维持强势运行" },
								].map(item => (
									<Col xs={12} sm={8} md={6} key={item.step}>
										<Card size="small" style={{ borderRadius: 8, borderLeft: "3px solid #0f3460", background: "#f8f9ff" }}>
											<Text strong style={{ color: "#0f3460" }}>
												{item.step}
												{" "}
												{item.label}
											</Text>
											<br />
											<Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
										</Card>
									</Col>
								))}
							</Row>
						</Card>

						<Alert message="隔夜施工法交易铁律" description="尾盘14:55买入 → 次日集合竞价/开盘5分钟卖出。止损-2%，绝不隔第二夜！" type="warning" showIcon style={{ marginTop: 16, borderRadius: 8 }} />
						<RecommendationHistory strategyType="overnight" />
					</div>
				</BasicContent>
			);
		}

		return (
			<BasicContent>
				<div style={{ padding: 24 }}>
					<Card bordered={false} style={{ marginBottom: 24, background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", borderRadius: 12 }}>
						<Row gutter={[24, 16]} align="middle">
							<Col span={12}>
								<Space align="center">
									<MoonOutlined style={{ fontSize: 32, color: "#ffd93d" }} />
									<div>
										<Title level={3} style={{ margin: 0, color: "#fff" }}>🌙 隔夜施工法</Title>
										<Text style={{ color: "rgba(255,255,255,0.85)" }}>14:30七步筛选强势股 → 尾盘买入 → 次日集合竞价/开盘卖出</Text>
									</div>
									<Button
										type="primary"
										ghost
										icon={<ReloadOutlined spin={refreshing} />}
										loading={refreshing}
										onClick={handleRefresh}
										style={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", marginLeft: 12 }}
									>
										{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新推荐"}
									</Button>
								</Space>
							</Col>
							<Col span={12}>
								<Row gutter={16} justify="end">
									<Col><Statistic title={<span style={{ color: "rgba(255,255,255,0.65)" }}>候选股</span>} value={payload.total} valueStyle={{ color: "#ffd93d", fontWeight: "bold" }} suffix="只" /></Col>
									<Col><Statistic title={<span style={{ color: "rgba(255,255,255,0.65)" }}>AI增强</span>} value={payload.llm_enhanced ? "已增强" : "基础"} valueStyle={{ color: payload.llm_enhanced ? "#52c41a" : "#faad14", fontWeight: "bold" }} /></Col>
									{payload.generated_at && (
										<Col>
											<div>
												<span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>筛选时间</span>
												<div style={{ color: "#fff", fontSize: 14, fontWeight: "bold", marginTop: 4 }}>{payload.generated_at}</div>
											</div>
										</Col>
									)}
								</Row>
							</Col>
						</Row>
					</Card>

					<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
						<Col xs={24} md={8}><Card><Statistic title="候选股" value={payload.total} valueStyle={{ color: "#0f3460" }} /></Card></Col>
						<Col xs={24} md={8}><Card><Statistic title="强烈推荐" value={payload.recommendations.filter(item => item.recommendation_level === "强烈推荐").length} valueStyle={{ color: "#f5222d" }} /></Card></Col>
						<Col xs={24} md={8}><Card><Statistic title="推荐" value={payload.recommendations.filter(item => item.recommendation_level === "推荐").length} valueStyle={{ color: "#fa8c16" }} /></Card></Col>
					</Row>

					<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
						<Col xs={24} lg={12}>
							<Card title={(
								<Space>
									<SafetyOutlined />
									<span>执行纪律</span>
								</Space>
							)}
							>
								<Paragraph>
									尾盘买点：
									{executionRules.execution_window}
								</Paragraph>
								<Paragraph>
									次日卖点：
									{executionRules.sell_window}
								</Paragraph>
								<Paragraph>
									退出铁律：
									{executionRules.exit_rule}
								</Paragraph>
								<Paragraph>
									隔夜风险：
									{executionRules.overnight_risk}
								</Paragraph>
							</Card>
						</Col>
						<Col xs={24} lg={12}>
							<Card title={(
								<Space>
									<MoonOutlined />
									<span>七步筛选体系</span>
								</Space>
							)}
							>
								<Row gutter={[12, 12]}>
									{[
										{ step: "①", label: "涨幅3-5%" },
										{ step: "②", label: "量比 > 1" },
										{ step: "③", label: "换手5-10%" },
										{ step: "④", label: "市值50-200亿" },
										{ step: "⑤", label: "量能台阶放大" },
										{ step: "⑥", label: "均线多头排列" },
										{ step: "⑦", label: "分时强于均价" },
									].map(item => (
										<Col xs={12} sm={8} key={item.step}>
											<Tag color="blue">
												{item.step}
												{" "}
												{item.label}
											</Tag>
										</Col>
									))}
								</Row>
							</Card>
						</Col>
					</Row>

					{payload.signal_summary && Object.keys(payload.signal_summary).length > 0 && (
						<Card size="small" bordered={false} style={{ marginBottom: 16, borderRadius: 8 }}>
							<Space wrap>
								<Text strong>信号分布：</Text>
								{Object.entries(payload.signal_summary).map(([type, count]) => (
									<Tag key={type} color={type.includes("涨停") ? "red" : type.includes("多头") ? "green" : type.includes("台阶") ? "blue" : "purple"}>
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
						style={{ borderRadius: 12, marginBottom: 16 }}
						title={(
							<Space>
								<MoonOutlined style={{ color: "#0f3460" }} />
								<Text strong>隔夜施工候选股</Text>
								<Tag color="blue">
									{payload.recommendations.length}
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
							dataSource={payload.recommendations}
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

					{payload.strategy_report && (
						<Card
							bordered={false}
							style={{ marginBottom: 16, borderRadius: 12, background: "#fafafa" }}
							title={(
								<Space>
									<AlertOutlined />
									<span>AI/策略报告</span>
								</Space>
							)}
						>
							<Paragraph style={{ whiteSpace: "pre-wrap" }}>{payload.strategy_report}</Paragraph>
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
			</BasicContent>
		);
	};

	const renderExecutionContent = (payload: OvernightData | null) => {
		const list = payload?.recommendations || [];
		return (
			<BasicContent>
				<div style={{ paddingBottom: 24 }}>
					<Card
						style={{ marginBottom: 16 }}
						title={(
							<Space>
								<SafetyOutlined />
								<span>次日执行纪律</span>
							</Space>
						)}
					>
						<Alert
							type="warning"
							showIcon
							message="隔夜施工法不是隔日持有策略"
							description={`尾盘买点：${executionRules.execution_window}；次日卖点：${executionRules.sell_window}；退出铁律：${executionRules.exit_rule}；主要风险：${executionRules.overnight_risk}；执行分层：${executionRules.execution_verdict_hint}`}
						/>
					</Card>

					<Card
						title={(
							<Space>
								<MoonOutlined style={{ color: "#0f3460" }} />
								<span>次日执行清单</span>
							</Space>
						)}
					>
						{list.length === 0
							? <Empty description="暂无隔夜执行清单，请先生成隔夜推荐" />
							: (
								<Row gutter={[16, 16]}>
									{list.slice(0, 8).map((item) => {
										const level = item.recommendation_level || "关注";
										const verdict = item.execution_verdict || (level === "强烈推荐" ? "竞价优先兑现" : level === "推荐" ? "开盘冲高择机卖" : "低开不及预期直接走");
										const sellHint = verdict === "竞价优先兑现"
											? "次日竞价优先兑现，不强留。"
											: verdict === "开盘冲高择机卖"
												? "若竞价一般，等开盘冲高择机卖出。"
												: verdict === "低开不及预期直接走"
													? "若竞价或开盘弱于预期，直接防守离场。"
													: "信号不足，仅观察不执行。";
										const palette = executionCardPalette(verdict);
										return (
											<Col xs={24} sm={12} lg={8} xl={6} key={item.code}>
												<Card size="small" hoverable style={{ height: "100%", borderLeft: `4px solid ${palette.border}` }}>
													<Space direction="vertical" size={8} style={{ width: "100%" }}>
														<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
															<div>
																<Text strong>{item.name}</Text>
																<Text type="secondary" style={{ marginLeft: 6 }}>{item.code}</Text>
															</div>
															<Space wrap>
																<Tag color={executionTagColor(level)}>{level}</Tag>
															</Space>
														</div>
														<div style={{ padding: "10px 12px", borderRadius: 10, background: palette.badgeBg, border: `1px solid ${palette.border}` }}>
															<Text strong style={{ color: palette.badgeText, display: "block", fontSize: 15 }}>
																次日动作：
																{verdict}
															</Text>
															<Text style={{ color: palette.badgeText, fontSize: 12 }}>{sellHint}</Text>
														</div>
														<Text>{item.reason_short || item.signal_type}</Text>
														<Text type="secondary">
															尾盘买入：
															{item.execution_window || executionRules.execution_window}
														</Text>
														<Text type="secondary">
															次日卖出：
															{item.sell_window || executionRules.sell_window}
														</Text>
														<Text type="secondary">
															执行铁律：
															{item.exit_rule || executionRules.exit_rule}
														</Text>
														<Text type="secondary">
															风险提示：
															{item.overnight_risk || executionRules.overnight_risk}
														</Text>
													</Space>
												</Card>
											</Col>
										);
									})}
								</Row>
							)}
					</Card>
				</div>
			</BasicContent>
		);
	};

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
				<Alert message="加载失败" description={error} type="error" showIcon action={<a onClick={fetchData}>重试</a>} />
			</div>
		);
	}

	return (
		<Tabs
			defaultActiveKey="main"
			items={[
				{
					key: "main",
					label: "策略研判",
					children: renderStrategyContent(data),
				},
				{
					key: "execution",
					label: "次日执行 / 实盘跟投指导",
					children: renderExecutionContent(data),
				},
				{
					key: "follow",
					label: "推荐跟踪",
					children: <StrategyFollowTab strategyType="overnight" isOvernight={true} />,
				},
			]}
		/>
	);
};

export default OvernightPage;
