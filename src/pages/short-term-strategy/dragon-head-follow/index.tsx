import type { DragonHeadFollowItem, DragonHeadFollowStock } from "#src/api/strategy";

import { fetchDragonHeadFollow, triggerDragonHeadFollow } from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import {
	AlertOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CrownOutlined,
	ExclamationCircleOutlined,
	EyeOutlined,
	MinusCircleOutlined,
	PlusCircleOutlined,
	ReloadOutlined,
	SafetyOutlined,
	TeamOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Empty,
	message,
	Progress,
	Result,
	Row,
	Skeleton,
	Space,
	Statistic,
	Steps,
	Tag,
	Timeline,
	Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 操作动作颜色 */
function getActionColor(action: string): string {
	switch (action) {
		case "买入": case "加仓": return "#f5222d";
		case "卖出": case "减仓": case "清仓": return "#52c41a";
		case "持有": case "继续持有": return "#1890ff";
		case "观望": case "回避": return "#8c8c8c";
		default: return "#faad14";
	}
}

/** 操作动作图标 */
function getActionIcon(action: string) {
	switch (action) {
		case "买入": case "加仓": return <PlusCircleOutlined />;
		case "卖出": case "减仓": case "清仓": return <MinusCircleOutlined />;
		case "持有": case "继续持有": return <CheckCircleOutlined />;
		case "观望": case "回避": return <EyeOutlined />;
		default: return <ExclamationCircleOutlined />;
	}
}

/** 置信度颜色 */
function getConfidenceColor(score: number): string {
	if (score >= 80)
		return "#52c41a";
	if (score >= 60)
		return "#faad14";
	if (score >= 40)
		return "#fa8c16";
	return "#f5222d";
}

export default function DragonHeadFollow() {
	const [loading, setLoading] = useState(false);
	const [triggering, setTriggering] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [latest, setLatest] = useState<DragonHeadFollowItem | null>(null);
	const [history, setHistory] = useState<DragonHeadFollowItem[]>([]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchDragonHeadFollow(10);
			if (response.status === "success" && response.data) {
				setLatest(response.data.latest);
				setHistory(response.data.history);
			}
			else {
				setError("获取跟投指导数据失败");
			}
		}
		catch (err: any) {
			setError(err?.message || "网络请求失败");
		}
		finally {
			setLoading(false);
		}
	}, []);

	const handleTrigger = useCallback(async () => {
		setTriggering(true);
		message.loading({ content: "正在生成跟投指导，请稍候（约1-2分钟）...", key: "trigger", duration: 0 });
		try {
			const response = await triggerDragonHeadFollow();
			if (response.status === "success") {
				message.success({ content: response.message || "跟投指导已生成", key: "trigger" });
				await fetchData();
			}
			else {
				message.error({ content: "生成失败", key: "trigger" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || "生成失败，请稍后重试", key: "trigger" });
		}
		finally {
			setTriggering(false);
		}
	}, [fetchData]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Loading state
	if (loading && !latest) {
		return (
			<BasicContent>
				<div style={{ padding: 24 }}>
					<Skeleton active paragraph={{ rows: 3 }} />
					<div style={{ marginTop: 24 }}>
						<Skeleton active paragraph={{ rows: 8 }} />
					</div>
				</div>
			</BasicContent>
		);
	}

	// Error state
	if (error && !latest) {
		return (
			<BasicContent>
				<Result
					status="error"
					title="数据获取失败"
					subTitle={error}
					extra={(
						<Button type="primary" icon={<ReloadOutlined />} onClick={fetchData}>
							重新加载
						</Button>
					)}
				/>
			</BasicContent>
		);
	}

	// Empty state
	if (!latest) {
		return (
			<BasicContent>
				<Empty
					description="暂无跟投指导数据，点击下方按钮生成"
					style={{ marginTop: 80 }}
				>
					<Space>
						<Button onClick={fetchData} icon={<ReloadOutlined />}>
							刷新
						</Button>
						<Button type="primary" onClick={handleTrigger} loading={triggering} icon={<ThunderboltOutlined />}>
							生成跟投指导
						</Button>
					</Space>
				</Empty>
			</BasicContent>
		);
	}

	const buyStocks = latest.recommendations?.filter(s => ["买入", "加仓"].includes(s.action)) || [];
	const holdStocks = latest.recommendations?.filter(s => ["持有", "继续持有"].includes(s.action)) || [];
	const sellStocks = latest.recommendations?.filter(s => ["卖出", "减仓", "清仓"].includes(s.action)) || [];
	const watchStocks = latest.recommendations?.filter(s => ["观望", "回避"].includes(s.action)) || [];

	return (
		<BasicContent>
			<div style={{ padding: "0 0 24px 0" }}>
				{/* Header */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 16,
					}}
				>
					<Space align="center">
						<TeamOutlined style={{ fontSize: 24, color: "#1890ff" }} />
						<Title level={4} style={{ margin: 0 }}>
							龙头战法 · 实盘跟投指导
						</Title>
						<Tag color="processing">
							{latest.trading_date}
						</Tag>
						<Text type="secondary" style={{ fontSize: 12 }}>
							生成于
							{" "}
							{latest.generated_at}
						</Text>
					</Space>
					<Space>
						<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
							刷新
						</Button>
						<Button
							type="primary"
							icon={<ThunderboltOutlined />}
							onClick={handleTrigger}
							loading={triggering}
						>
							{triggering ? "生成中..." : "重新生成"}
						</Button>
					</Space>
				</div>

				{/* 置信度 & 概览 */}
				<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
					<Col xs={24} md={6}>
						<Card size="small" styles={{ body: { textAlign: "center", padding: "16px" } }}>
							<Progress
								type="circle"
								percent={latest.confidence_score}
								size={80}
								strokeColor={getConfidenceColor(latest.confidence_score)}
								format={pct => (
									<span style={{ fontSize: 18, fontWeight: 700 }}>
										{pct}
									</span>
								)}
							/>
							<div style={{ marginTop: 8 }}>
								<Text strong>整体置信度</Text>
							</div>
						</Card>
					</Col>
					<Col xs={24} md={18}>
						<Card
							size="small"
							title={(
								<Space>
									<CrownOutlined style={{ color: "#faad14" }} />
									<span>操作概览</span>
								</Space>
							)}
						>
							<Row gutter={16}>
								<Col span={6}>
									<Statistic
										title="买入信号"
										value={buyStocks.length}
										valueStyle={{ color: "#f5222d", fontWeight: 700 }}
										suffix="只"
									/>
								</Col>
								<Col span={6}>
									<Statistic
										title="持有"
										value={holdStocks.length}
										valueStyle={{ color: "#1890ff", fontWeight: 700 }}
										suffix="只"
									/>
								</Col>
								<Col span={6}>
									<Statistic
										title="卖出信号"
										value={sellStocks.length}
										valueStyle={{ color: "#52c41a", fontWeight: 700 }}
										suffix="只"
									/>
								</Col>
								<Col span={6}>
									<Statistic
										title="观望"
										value={watchStocks.length}
										valueStyle={{ color: "#8c8c8c", fontWeight: 700 }}
										suffix="只"
									/>
								</Col>
							</Row>
						</Card>
					</Col>
				</Row>

				{/* 市场概览 */}
				{latest.market_overview && (
					<Alert
						style={{ marginBottom: 16 }}
						type="info"
						showIcon
						icon={<AlertOutlined />}
						message={<Text strong>市场概览</Text>}
						description={latest.market_overview}
					/>
				)}

				{/* 策略总结 */}
				{latest.strategy_summary && (
					<Card
						size="small"
						title={(
							<Space>
								<SafetyOutlined style={{ color: "#722ed1" }} />
								<span>策略研判</span>
							</Space>
						)}
						style={{ marginBottom: 16 }}
					>
						<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
							{latest.strategy_summary}
						</div>
					</Card>
				)}

				{/* 风险提示 */}
				{latest.risk_warning && (
					<Alert
						style={{ marginBottom: 16 }}
						type="warning"
						showIcon
						message={<Text strong>风险提示</Text>}
						description={latest.risk_warning}
					/>
				)}

				{/* 操作指令卡片 */}
				{latest.recommendations && latest.recommendations.length > 0 && (
					<Card
						title={(
							<Space>
								<ThunderboltOutlined style={{ color: "#fa541c" }} />
								<span>个股操作指令</span>
								<Tag>
									{latest.stock_count}
									{" "}
									只
								</Tag>
							</Space>
						)}
						style={{ marginBottom: 16 }}
					>
						<Row gutter={[16, 16]}>
							{latest.recommendations.map((stock: DragonHeadFollowStock, idx: number) => (
								<Col xs={24} sm={12} lg={8} xl={6} key={stock.code || idx}>
									<Card
										size="small"
										hoverable
										style={{
											borderLeft: `4px solid ${getActionColor(stock.action)}`,
											height: "100%",
										}}
										styles={{ body: { padding: "12px 16px" } }}
									>
										{/* 股票名+代码+操作 */}
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
											<Space>
												<Text strong style={{ fontSize: 15 }}>{stock.name}</Text>
												<Text type="secondary" style={{ fontSize: 12 }}>{stock.code}</Text>
											</Space>
											<Tag
												color={getActionColor(stock.action)}
												icon={getActionIcon(stock.action)}
												style={{ fontWeight: 700, fontSize: 13 }}
											>
												{stock.action}
											</Tag>
										</div>

										{/* 当前价格+涨跌幅 */}
										{stock.current_price != null && (
											<div style={{ marginBottom: 6 }}>
												<Text style={{ color: "#f5222d", fontWeight: 600, fontSize: 16 }}>
													¥
													{stock.current_price.toFixed(2)}
												</Text>
												{stock.change_pct != null && (
													<Text
														style={{
															marginLeft: 8,
															color: stock.change_pct >= 0 ? "#f5222d" : "#52c41a",
															fontWeight: 600,
														}}
													>
														{stock.change_pct >= 0 ? "+" : ""}
														{stock.change_pct.toFixed(2)}
														%
													</Text>
												)}
											</div>
										)}

										{/* 目标价+止损价 */}
										<Row gutter={8} style={{ marginBottom: 6 }}>
											{stock.target_price != null && (
												<Col span={12}>
													<Text type="secondary" style={{ fontSize: 11 }}>目标价</Text>
													<div>
														<Text style={{ color: "#f5222d", fontWeight: 600 }}>
															¥
															{stock.target_price.toFixed(2)}
														</Text>
													</div>
												</Col>
											)}
											{stock.stop_loss != null && (
												<Col span={12}>
													<Text type="secondary" style={{ fontSize: 11 }}>止损价</Text>
													<div>
														<Text style={{ color: "#52c41a", fontWeight: 600 }}>
															¥
															{stock.stop_loss.toFixed(2)}
														</Text>
													</div>
												</Col>
											)}
										</Row>

										{/* 仓位建议 */}
										{stock.position_pct != null && (
											<div style={{ marginBottom: 6 }}>
												<Text type="secondary" style={{ fontSize: 11 }}>建议仓位</Text>
												<Progress
													percent={stock.position_pct}
													size="small"
													strokeColor={getActionColor(stock.action)}
													format={pct => `${pct}%`}
												/>
											</div>
										)}

										{/* 置信度 */}
										{stock.confidence != null && (
											<div style={{ marginBottom: 6 }}>
												<Space>
													<Text type="secondary" style={{ fontSize: 11 }}>置信度</Text>
													<Tag color={getConfidenceColor(stock.confidence)} style={{ fontSize: 11 }}>
														{stock.confidence}
														%
													</Tag>
												</Space>
											</div>
										)}

										{/* 推荐理由 */}
										{stock.reason && (
											<div style={{ marginBottom: 4 }}>
												<Text style={{ fontSize: 12, color: "#595959" }}>
													💡
													{" "}
													{stock.reason}
												</Text>
											</div>
										)}

										{/* 风险提示 */}
										{stock.risk_warning && (
											<Text type="warning" style={{ fontSize: 11 }}>
												⚠️
												{" "}
												{stock.risk_warning}
											</Text>
										)}
									</Card>
								</Col>
							))}
						</Row>
					</Card>
				)}

				{/* 历史跟投指导 */}
				{history.length > 1 && (
					<Card
						title={(
							<Space>
								<ClockCircleOutlined style={{ color: "#1890ff" }} />
								<span>历史跟投指导</span>
							</Space>
						)}
					>
						<Timeline
							items={history.map((item, idx) => ({
								color: idx === 0 ? "blue" : "gray",
								children: (
									<div key={item.id}>
										<Space>
											<Text strong>{item.trading_date}</Text>
											<Tag>{item.session_type}</Tag>
											<Badge
												count={item.stock_count}
												style={{ backgroundColor: "#1890ff" }}
												overflowCount={99}
											/>
											<Text type="secondary" style={{ fontSize: 12 }}>
												置信度:
												{" "}
												{item.confidence_score}
												%
											</Text>
										</Space>
										{item.strategy_summary && (
											<Paragraph
												ellipsis={{ rows: 2, expandable: "collapsible" }}
												style={{ marginTop: 4, marginBottom: 0, fontSize: 13 }}
											>
												{item.strategy_summary}
											</Paragraph>
										)}
									</div>
								),
							}))}
						/>
					</Card>
				)}

				{/* 流程说明 */}
				<Card
					title={(
						<Space>
							<SafetyOutlined style={{ color: "#52c41a" }} />
							<span>跟投指导生成流程</span>
						</Space>
					)}
					style={{ marginTop: 16 }}
					size="small"
				>
					<Steps
						size="small"
						items={[
							{
								title: "08:30 盘前候选池",
								description: "基于昨日涨停数据生成观察池",
								status: "finish",
							},
							{
								title: "09:35 竞价确认",
								description: "开盘5分钟后确认主线龙头",
								status: "finish",
							},
							{
								title: "09:45 上午交易",
								description: "龙头封板窗口期执行买入",
								status: "finish",
							},
							{
								title: "14:30 下午调仓",
								description: "止损/止盈/换仓调整",
								status: "finish",
							},
							{
								title: "15:30 跟投指导",
								description: "生成次日操作信号",
								status: "process",
							},
						]}
					/>
				</Card>
			</div>

			{/* Custom styles */}
			<style>
				{`
				.ant-card-hoverable:hover {
					box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
					transform: translateY(-2px);
					transition: all 0.3s;
				}
				`}
			</style>
		</BasicContent>
	);
}
