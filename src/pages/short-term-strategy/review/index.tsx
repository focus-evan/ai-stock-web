import type { ReviewItem } from "#src/api/portfolio";

import {
	fetchPortfolioList,
	fetchReviews,
	triggerReview,
} from "#src/api/portfolio";
import {
	BookOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	ReloadOutlined,
	StarFilled,
	ThunderboltOutlined,
	TrophyOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
	Empty,
	List,
	message,
	Progress,
	Row,
	Select,
	Skeleton,
	Space,
	Statistic,
	Tag,
	Timeline,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 策略名称 */
function strategyLabel(type: string): string {
	if (type === "dragon_head")
		return "龙头战法";
	if (type === "event_driven")
		return "事件驱动";
	return "情绪战法";
}

/** 策略标签颜色 */
function strategyTagColor(type: string): string {
	if (type === "dragon_head")
		return "magenta";
	if (type === "event_driven")
		return "orange";
	return "cyan";
}

/** 策略渐变背景 */
function strategyGradient(type: string): string {
	if (type === "dragon_head")
		return "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)";
	if (type === "event_driven")
		return "linear-gradient(135deg, #f6d365 0%, #fda085 100%)";
	return "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)";
}

/** 评分颜色 */
function scoreColor(score: number): string {
	if (score >= 80)
		return "#52c41a";
	if (score >= 60)
		return "#1890ff";
	if (score >= 40)
		return "#faad14";
	return "#ff4d4f";
}

/** 评分等级 */
function scoreLevel(score: number): string {
	if (score >= 90)
		return "卓越";
	if (score >= 80)
		return "优秀";
	if (score >= 70)
		return "良好";
	if (score >= 60)
		return "合格";
	if (score >= 40)
		return "待改进";
	return "需加强";
}

/** 盈亏颜色 */
function profitColor(val: number): string {
	if (val > 0)
		return "#cf1322";
	if (val < 0)
		return "#3f8600";
	return "#8c8c8c";
}

export default function PortfolioReview() {
	const [loading, setLoading] = useState(true);
	const [reviews, setReviews] = useState<ReviewItem[]>([]);
	const [selectedStrategy, setSelectedStrategy] = useState<string | undefined>(undefined);
	const [portfolios, setPortfolios] = useState<Array<{ id: number, strategy_type: string, name: string }>>([]);
	const [triggerLoading, setTriggerLoading] = useState(false);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const [reviewsRes, portfoliosRes] = await Promise.all([
				fetchReviews({
					strategy_type: selectedStrategy,
					limit: 30,
				}),
				fetchPortfolioList(),
			]);
			if (reviewsRes?.data?.reviews) {
				setReviews(reviewsRes.data.reviews);
			}
			if (portfoliosRes?.data?.portfolios) {
				setPortfolios(portfoliosRes.data.portfolios);
			}
		}
		catch {
			message.error("加载复盘数据失败");
		}
		finally {
			setLoading(false);
		}
	}, [selectedStrategy]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleTriggerReview = async (portfolioId: number) => {
		setTriggerLoading(true);
		try {
			await triggerReview(portfolioId);
			message.success("复盘已触发，请稍后刷新查看");
			setTimeout(loadData, 3000);
		}
		catch {
			message.error("触发复盘失败");
		}
		finally {
			setTriggerLoading(false);
		}
	};

	return (
		<div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
			{/* 页头 */}
			<div style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				marginBottom: 24,
			}}
			>
				<div>
					<Title level={3} style={{ margin: 0 }}>
						<BookOutlined style={{ marginRight: 8, color: "#722ed1" }} />
						每日复盘
					</Title>
					<Text type="secondary">GPT-5.2 智能分析交易优劣，每日 16:00 自动生成</Text>
				</div>
				<Space>
					<Select
						placeholder="筛选策略"
						allowClear
						value={selectedStrategy}
						onChange={setSelectedStrategy}
						style={{ width: 160 }}
						options={[
							{ value: "dragon_head", label: "🐉 龙头战法" },
							{ value: "event_driven", label: "📡 事件驱动" },
							{ value: "sentiment", label: "💡 情绪战法" },
						]}
					/>
					<Tooltip title="刷新">
						<Button icon={<ReloadOutlined />} onClick={loadData} loading={loading} />
					</Tooltip>
				</Space>
			</div>

			{/* 手动触发区 */}
			{portfolios.length > 0 && (
				<Card
					size="small"
					style={{
						marginBottom: 24,
						background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
						border: "none",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<Text style={{ color: "#fff", fontSize: 14 }}>
							<ThunderboltOutlined style={{ marginRight: 6 }} />
							手动触发复盘分析
						</Text>
						<Space>
							{portfolios.map(p => (
								<Button
									key={p.id}
									size="small"
									loading={triggerLoading}
									onClick={() => handleTriggerReview(p.id)}
									style={{
										borderColor: "rgba(255,255,255,0.5)",
										color: "#fff",
										background: "rgba(255,255,255,0.15)",
									}}
								>
									{strategyLabel(p.strategy_type)}
									{" "}
									-
									{p.name}
								</Button>
							))}
						</Space>
					</div>
				</Card>
			)}

			{/* 复盘列表 */}
			{loading
				? (
					<Card>
						<Skeleton active paragraph={{ rows: 6 }} />
					</Card>
				)
				: reviews.length === 0
					? (
						<Card>
							<Empty description="暂无复盘数据，等待 16:00 自动生成或手动触发" />
						</Card>
					)
					: (
						<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
							{reviews.map(review => (
								<ReviewCard key={`${review.portfolio_id}-${review.trading_date}`} review={review} />
							))}
						</div>
					)}
		</div>
	);
}

/** 单条复盘卡片 */
function ReviewCard({ review }: { review: ReviewItem }) {
	const score = review.overall_score || 0;

	return (
		<Card
			hoverable
			style={{ borderRadius: 12, overflow: "hidden" }}
			styles={{
				header: {
					background: strategyGradient(review.strategy_type),
					borderBottom: "none",
					padding: "16px 24px",
				},
			}}
			title={(
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<Space>
						<Tag color={strategyTagColor(review.strategy_type)}>
							{strategyLabel(review.strategy_type)}
						</Tag>
						<Text strong style={{ color: "#fff", fontSize: 16 }}>
							{review.trading_date}
						</Text>
					</Space>
					<Space>
						<div style={{
							background: "rgba(255,255,255,0.2)",
							borderRadius: 8,
							padding: "4px 12px",
							display: "flex",
							alignItems: "center",
							gap: 6,
						}}
						>
							<StarFilled style={{ color: "#ffd700" }} />
							<Text strong style={{ color: "#fff", fontSize: 18 }}>
								{score}
							</Text>
							<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
								/ 100
							</Text>
						</div>
					</Space>
				</div>
			)}
		>
			{/* 概况统计 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
				<Col xs={6}>
					<Statistic
						title="综合评级"
						value={scoreLevel(score)}
						valueStyle={{ color: scoreColor(score), fontSize: 20, fontWeight: 700 }}
						prefix={<TrophyOutlined />}
					/>
					<Progress
						percent={score}
						showInfo={false}
						strokeColor={scoreColor(score)}
						size="small"
						style={{ marginTop: 4 }}
					/>
				</Col>
				<Col xs={6}>
					<Statistic
						title="当日收益"
						value={review.daily_profit}
						precision={2}
						prefix="¥"
						valueStyle={{ color: profitColor(review.daily_profit), fontSize: 18 }}
					/>
					<Text type="secondary" style={{ fontSize: 12 }}>
						(
						{review.daily_profit_pct >= 0 ? "+" : ""}
						{review.daily_profit_pct.toFixed(2)}
						%)
					</Text>
				</Col>
				<Col xs={4}>
					<Statistic title="交易笔数" value={review.trade_count} valueStyle={{ fontSize: 18 }} />
				</Col>
				<Col xs={4}>
					<Statistic
						title="买入"
						value={review.buy_count}
						valueStyle={{ color: "#cf1322", fontSize: 18 }}
					/>
				</Col>
				<Col xs={4}>
					<Statistic
						title="卖出"
						value={review.sell_count}
						valueStyle={{ color: "#3f8600", fontSize: 18 }}
					/>
				</Col>
			</Row>

			{/* 总评 */}
			<Card
				size="small"
				style={{
					background: "#fafafa",
					borderRadius: 8,
					marginBottom: 16,
					borderLeft: `4px solid ${scoreColor(score)}`,
				}}
			>
				<Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}>
					{review.overall_comment}
				</Paragraph>
			</Card>

			<Row gutter={[16, 16]}>
				{/* 操作亮点 */}
				<Col xs={24} md={12}>
					<Card
						size="small"
						title={(
							<Space>
								<CheckCircleOutlined style={{ color: "#52c41a" }} />
								<span>操作亮点</span>
							</Space>
						)}
						style={{ borderRadius: 8, height: "100%" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 40 } }}
					>
						<List
							size="small"
							dataSource={review.highlights || []}
							renderItem={item => (
								<List.Item style={{ padding: "6px 0", border: "none" }}>
									<Space>
										<Tag color="success" style={{ borderRadius: 12 }}>✓</Tag>
										<Text>{item}</Text>
									</Space>
								</List.Item>
							)}
						/>
					</Card>
				</Col>

				{/* 操作不足 */}
				<Col xs={24} md={12}>
					<Card
						size="small"
						title={(
							<Space>
								<CloseCircleOutlined style={{ color: "#ff4d4f" }} />
								<span>操作不足</span>
							</Space>
						)}
						style={{ borderRadius: 8, height: "100%" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 40 } }}
					>
						<List
							size="small"
							dataSource={review.shortcomings || []}
							renderItem={item => (
								<List.Item style={{ padding: "6px 0", border: "none" }}>
									<Space>
										<Tag color="error" style={{ borderRadius: 12 }}>✗</Tag>
										<Text>{item}</Text>
									</Space>
								</List.Item>
							)}
						/>
					</Card>
				</Col>

				{/* 经验教训 */}
				<Col xs={24} md={12}>
					<Card
						size="small"
						title={(
							<Space>
								<BulbOutlined style={{ color: "#faad14" }} />
								<span>经验教训</span>
							</Space>
						)}
						style={{ borderRadius: 8, height: "100%" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 40 } }}
					>
						<Timeline
							items={(review.lessons || []).map(item => ({
								color: "gold",
								children: <Text style={{ fontSize: 13 }}>{item}</Text>,
							}))}
						/>
					</Card>
				</Col>

				{/* 改进建议 */}
				<Col xs={24} md={12}>
					<Card
						size="small"
						title={(
							<Space>
								<WarningOutlined style={{ color: "#1890ff" }} />
								<span>改进建议</span>
							</Space>
						)}
						style={{ borderRadius: 8, height: "100%" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 40 } }}
					>
						<Timeline
							items={(review.suggestions || []).map(item => ({
								color: "blue",
								children: <Text style={{ fontSize: 13 }}>{item}</Text>,
							}))}
						/>
					</Card>
				</Col>
			</Row>

			{/* 持仓分析 */}
			{review.position_analysis && review.position_analysis.length > 0 && (
				<Card
					size="small"
					title="持仓逐一分析"
					style={{ borderRadius: 8, marginTop: 16 }}
					styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 40 } }}
				>
					{review.position_analysis.map(pa => (
						<div
							key={pa.stock_code}
							style={{
								padding: "10px 0",
								borderBottom: "1px dashed #f0f0f0",
							}}
						>
							<Space style={{ marginBottom: 4 }}>
								<Tag color="purple">{pa.stock_code}</Tag>
								<Text strong>{pa.stock_name}</Text>
								<Tag color="geekblue">{pa.action_suggestion}</Tag>
							</Space>
							<Paragraph
								type="secondary"
								style={{ margin: 0, fontSize: 13, paddingLeft: 8 }}
							>
								{pa.analysis}
							</Paragraph>
						</div>
					))}
				</Card>
			)}

			{/* 风险评估 */}
			{review.risk_assessment && (
				<Card
					size="small"
					style={{
						borderRadius: 8,
						marginTop: 12,
						background: "#fff7e6",
						borderColor: "#ffd591",
					}}
				>
					<Space align="start">
						<WarningOutlined style={{ color: "#fa8c16", fontSize: 16, marginTop: 2 }} />
						<div>
							<Text strong style={{ color: "#d46b08" }}>风险评估</Text>
							<Paragraph style={{ margin: "4px 0 0", fontSize: 13 }}>
								{review.risk_assessment}
							</Paragraph>
						</div>
					</Space>
				</Card>
			)}
		</Card>
	);
}
