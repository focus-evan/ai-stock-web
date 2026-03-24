import type { ReviewItem } from "#src/api/portfolio";

import {
	fetchPortfolioList,
	fetchReviews,
	triggerReview,
} from "#src/api/portfolio";
import {
	BookOutlined,
	BulbOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	DownOutlined,
	HistoryOutlined,
	ReloadOutlined,
	RightOutlined,
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
	Pagination,
	Progress,
	Row,
	Space,
	Statistic,
	Tag,
	Timeline,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 策略配置映射 */
const STRATEGY_CONFIG: Record<string, {
	label: string
	emoji: string
	tagColor: string
	gradient: string
	order: number
}> = {
	dragon_head: {
		label: "龙头战法",
		emoji: "🐉",
		tagColor: "magenta",
		gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
		order: 1,
	},
	event_driven: {
		label: "事件驱动",
		emoji: "📡",
		tagColor: "orange",
		gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
		order: 2,
	},
	sentiment: {
		label: "情绪战法",
		emoji: "💡",
		tagColor: "cyan",
		gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
		order: 3,
	},
	breakthrough: {
		label: "突破战法",
		emoji: "🚀",
		tagColor: "volcano",
		gradient: "linear-gradient(135deg, #ff6a00 0%, #ee0979 100%)",
		order: 4,
	},
	volume_price: {
		label: "量价关系",
		emoji: "📊",
		tagColor: "geekblue",
		gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
		order: 5,
	},
	overnight: {
		label: "隔夜施工法",
		emoji: "🌙",
		tagColor: "purple",
		gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
		order: 6,
	},
	auction: {
		label: "隔夜施工法",
		emoji: "🌙",
		tagColor: "purple",
		gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
		order: 6,
	},
	moving_average: {
		label: "均线战法",
		emoji: "📈",
		tagColor: "green",
		gradient: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
		order: 7,
	},
	combined: {
		label: "综合战法",
		emoji: "🎯",
		tagColor: "gold",
		gradient: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
		order: 8,
	},
	trend_momentum: {
		label: "趋势动量",
		emoji: "🔥",
		tagColor: "red",
		gradient: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
		order: 9,
	},
	northbound: {
		label: "北向资金",
		emoji: "🧭",
		tagColor: "blue",
		gradient: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)",
		order: 10,
	},
};

const DEFAULT_STRATEGY = {
	label: "未知战法",
	emoji: "❓",
	tagColor: "default" as string,
	gradient: "linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)",
	order: 99,
};

function getStrategyConfig(type: string) {
	return STRATEGY_CONFIG[type] || DEFAULT_STRATEGY;
}

/** 策略名称 */
function strategyLabel(type: string): string {
	return getStrategyConfig(type).label;
}

/** 策略标签颜色 */
function _strategyTagColor(type: string): string {
	return getStrategyConfig(type).tagColor;
}

/** 策略渐变背景 */
function strategyGradient(type: string): string {
	return getStrategyConfig(type).gradient;
}

/** 策略 Emoji */
function strategyEmoji(type: string): string {
	return getStrategyConfig(type).emoji;
}

/** 策略排序顺序 */
const STRATEGY_ORDER: Record<string, number> = Object.fromEntries(
	Object.entries(STRATEGY_CONFIG).map(([key, cfg]) => [key, cfg.order]),
);

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

/** 盈亏颜色（优化对比度） */
function profitColor(val: number): string {
	if (val > 0)
		return "#ff4d4f";
	if (val < 0)
		return "#52c41a";
	return "#8c8c8c";
}

/** 每页显示条数 */
const PAGE_SIZE = 10;

export default function PortfolioReview() {
	const [loading, setLoading] = useState(true);
	const [reviews, setReviews] = useState<ReviewItem[]>([]);
	const [portfolios, setPortfolios] = useState<Array<{ id: number, strategy_type: string, name: string }>>([]);
	const [triggerLoading, setTriggerLoading] = useState(false);
	// 每个策略独立分页
	const [pageMap, setPageMap] = useState<Record<string, number>>({});
	// 展开的复盘卡片 key
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const [reviewsRes, portfoliosRes] = await Promise.all([
				fetchReviews({ limit: 100 }),
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
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	/** 按策略分组 */
	const groupedReviews = useMemo(() => {
		const groups: Record<string, ReviewItem[]> = {};
		for (const review of reviews) {
			const st = review.strategy_type;
			if (!groups[st]) {
				groups[st] = [];
			}
			groups[st].push(review);
		}
		// 按策略排序
		const sorted = Object.entries(groups).sort(
			([a], [b]) => (STRATEGY_ORDER[a] || 99) - (STRATEGY_ORDER[b] || 99),
		);
		return sorted;
	}, [reviews]);

	/** 策略统计信息 */
	const strategyStats = useMemo(() => {
		const stats: Record<string, {
			count: number
			avgScore: number
			totalProfit: number
			latestDate: string
		}> = {};
		for (const [type, items] of groupedReviews) {
			const totalScore = items.reduce((acc, r) => acc + (r.overall_score || 0), 0);
			const totalProfit = items.reduce((acc, r) => acc + (r.daily_profit || 0), 0);
			stats[type] = {
				count: items.length,
				avgScore: items.length > 0 ? Math.round(totalScore / items.length) : 0,
				totalProfit: Math.round(totalProfit * 100) / 100,
				latestDate: items.length > 0 ? items[0].trading_date : "-",
			};
		}
		return stats;
	}, [groupedReviews]);

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

	const toggleExpand = (key: string) => {
		setExpandedKeys((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			}
			else {
				next.add(key);
			}
			return next;
		});
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
					<Text type="secondary">GPT-5.2 智能分析交易优劣 · 按战法归类查看所有历史复盘</Text>
				</div>
				<Space>
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

			{/* 按战法分组的复盘 */}
			{loading
				? (
					<Card>
						<div style={{ padding: 40, textAlign: "center" }}>
							<ReloadOutlined spin style={{ fontSize: 24, color: "#722ed1" }} />
							<div style={{ marginTop: 12, color: "#8c8c8c" }}>加载复盘数据中...</div>
						</div>
					</Card>
				)
				: groupedReviews.length === 0
					? (
						<Card>
							<Empty description="暂无复盘数据，等待 16:00 自动生成或手动触发" />
						</Card>
					)
					: (
						<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
							{groupedReviews.map(([strategyType, items]) => {
								const stats = strategyStats[strategyType];
								const currentPage = pageMap[strategyType] || 1;
								const pagedItems = items.slice(
									(currentPage - 1) * PAGE_SIZE,
									currentPage * PAGE_SIZE,
								);

								return (
									<StrategyGroup
										key={strategyType}
										strategyType={strategyType}
										reviews={pagedItems}
										stats={stats}
										totalCount={items.length}
										currentPage={currentPage}
										onPageChange={(page) => {
											setPageMap(prev => ({ ...prev, [strategyType]: page }));
										}}
										expandedKeys={expandedKeys}
										onToggleExpand={toggleExpand}
									/>
								);
							})}
						</div>
					)}
		</div>
	);
}

/** 单个战法分组 */
function StrategyGroup({
	strategyType,
	reviews,
	stats,
	totalCount,
	currentPage,
	onPageChange,
	expandedKeys,
	onToggleExpand,
}: {
	strategyType: string
	reviews: ReviewItem[]
	stats: { count: number, avgScore: number, totalProfit: number, latestDate: string }
	totalCount: number
	currentPage: number
	onPageChange: (page: number) => void
	expandedKeys: Set<string>
	onToggleExpand: (key: string) => void
}) {
	return (
		<Card
			style={{
				borderRadius: 16,
				overflow: "hidden",
				boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
			}}
			styles={{
				header: {
					background: strategyGradient(strategyType),
					borderBottom: "none",
					padding: "20px 24px",
				},
				body: {
					padding: "16px 24px 20px",
				},
			}}
			title={(
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<Space size="middle">
						<span style={{ fontSize: 24 }}>{strategyEmoji(strategyType)}</span>
						<div>
							<Text strong style={{ color: "#fff", fontSize: 18 }}>
								{strategyLabel(strategyType)}
							</Text>
							<div style={{ marginTop: 2 }}>
								<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>
									<HistoryOutlined style={{ marginRight: 4 }} />
									共
									{" "}
									{stats.count}
									{" "}
									次复盘 · 最新
									{" "}
									{stats.latestDate}
								</Text>
							</div>
						</div>
					</Space>
					<Space size="large">
						<div style={{
							background: "rgba(255,255,255,0.15)",
							borderRadius: 10,
							padding: "8px 16px",
							textAlign: "center",
						}}
						>
							<div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>平均评分</div>
							<div style={{ color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
								<StarFilled style={{ color: "#ffd700", marginRight: 4, fontSize: 14 }} />
								{stats.avgScore}
							</div>
						</div>
						<div style={{
							background: "rgba(255,255,255,0.15)",
							borderRadius: 10,
							padding: "8px 16px",
							textAlign: "center",
						}}
						>
							<div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>累计收益</div>
							<div style={{
								color: "#fff",
								fontSize: 20,
								fontWeight: 700,
								lineHeight: 1.2,
								textShadow: "0 1px 3px rgba(0,0,0,0.2)",
							}}
							>
								{stats.totalProfit >= 0 ? "+" : ""}
								¥
								{stats.totalProfit.toLocaleString()}
							</div>
						</div>
					</Space>
				</div>
			)}
		>
			{/* 复盘时间线 */}
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{reviews.map((review) => {
					const key = `${review.portfolio_id}-${review.trading_date}`;
					const isExpanded = expandedKeys.has(key);
					return (
						<ReviewRow
							key={key}
							review={review}
							isExpanded={isExpanded}
							onToggle={() => onToggleExpand(key)}
						/>
					);
				})}
			</div>

			{/* 分页 */}
			{totalCount > PAGE_SIZE && (
				<div style={{ textAlign: "center", marginTop: 16 }}>
					<Pagination
						current={currentPage}
						total={totalCount}
						pageSize={PAGE_SIZE}
						onChange={onPageChange}
						showSizeChanger={false}
						showTotal={total => `共 ${total} 条复盘`}
						size="small"
					/>
				</div>
			)}
		</Card>
	);
}

/** 单条复盘行（可展开） */
function ReviewRow({
	review,
	isExpanded,
	onToggle,
}: {
	review: ReviewItem
	isExpanded: boolean
	onToggle: () => void
}) {
	const score = review.overall_score || 0;

	return (
		<div
			style={{
				border: "1px solid #f0f0f0",
				borderRadius: 10,
				overflow: "hidden",
				transition: "box-shadow 0.2s",
				boxShadow: isExpanded ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
			}}
		>
			{/* 摘要行（可点击展开） */}
			<div
				onClick={onToggle}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "12px 16px",
					cursor: "pointer",
					background: isExpanded ? "#fafafa" : "#fff",
					transition: "background 0.2s",
				}}
			>
				<Space size="middle">
					{isExpanded
						? <DownOutlined style={{ color: "#722ed1", fontSize: 12 }} />
						: <RightOutlined style={{ color: "#bfbfbf", fontSize: 12 }} />}
					<Space>
						<CalendarOutlined style={{ color: "#8c8c8c" }} />
						<Text strong>{review.trading_date}</Text>
					</Space>
					<Tag
						color={score >= 80 ? "success" : score >= 60 ? "processing" : score >= 40 ? "warning" : "error"}
						style={{ borderRadius: 12, minWidth: 70, textAlign: "center" }}
					>
						<StarFilled style={{ marginRight: 2 }} />
						{" "}
						{score}
						分 ·
						{" "}
						{scoreLevel(score)}
					</Tag>
				</Space>
				<Space size="large">
					<Tooltip title={`买入 ${review.buy_count} 笔 / 卖出 ${review.sell_count} 笔`}>
						<Text type="secondary" style={{ fontSize: 13 }}>
							{review.trade_count}
							{" "}
							笔交易
						</Text>
					</Tooltip>
					<Text
						strong
						style={{
							color: profitColor(review.daily_profit),
							fontSize: 14,
							minWidth: 80,
							textAlign: "right",
						}}
					>
						{review.daily_profit >= 0 ? "+" : ""}
						¥
						{review.daily_profit.toFixed(2)}
					</Text>
					<Text
						style={{
							fontSize: 12,
							minWidth: 60,
							textAlign: "right",
							color: profitColor(review.daily_profit_pct),
							fontWeight: 600,
						}}
					>
						{review.daily_profit_pct >= 0 ? "+" : ""}
						{review.daily_profit_pct.toFixed(2)}
						%
					</Text>
				</Space>
			</div>

			{/* 展开详情 */}
			{isExpanded && (
				<div style={{ padding: "0 16px 16px", background: "#fafafa" }}>
					<ReviewDetail review={review} />
				</div>
			)}
		</div>
	);
}

/** 复盘详情（展开后的内容） */
function ReviewDetail({ review }: { review: ReviewItem }) {
	const score = review.overall_score || 0;

	return (
		<div>
			{/* 概况统计 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 16, marginTop: 8 }}>
				<Col xs={6}>
					<Statistic
						title="综合评级"
						value={scoreLevel(score)}
						valueStyle={{ color: scoreColor(score), fontSize: 18, fontWeight: 700 }}
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
						valueStyle={{ color: profitColor(review.daily_profit), fontSize: 16 }}
					/>
					<Text style={{ fontSize: 12, color: profitColor(review.daily_profit_pct), fontWeight: 600 }}>
						(
						{review.daily_profit_pct >= 0 ? "+" : ""}
						{review.daily_profit_pct.toFixed(2)}
						%)
					</Text>
				</Col>
				<Col xs={4}>
					<Statistic title="交易笔数" value={review.trade_count} valueStyle={{ fontSize: 16 }} />
				</Col>
				<Col xs={4}>
					<Statistic
						title="买入"
						value={review.buy_count}
						valueStyle={{ color: "#ff4d4f", fontSize: 16 }}
					/>
				</Col>
				<Col xs={4}>
					<Statistic
						title="卖出"
						value={review.sell_count}
						valueStyle={{ color: "#52c41a", fontSize: 16 }}
					/>
				</Col>
			</Row>

			{/* 总评 */}
			<Card
				size="small"
				style={{
					background: "#fff",
					borderRadius: 8,
					marginBottom: 12,
					borderLeft: `4px solid ${scoreColor(score)}`,
				}}
			>
				<Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.8 }}>
					{review.overall_comment}
				</Paragraph>
			</Card>

			<Row gutter={[12, 12]}>
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
						style={{ borderRadius: 8, height: "100%", background: "#fff" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 36, padding: "0 12px" } }}
					>
						<List
							size="small"
							dataSource={review.highlights || []}
							renderItem={item => (
								<List.Item style={{ padding: "4px 0", border: "none" }}>
									<Space>
										<Tag color="success" style={{ borderRadius: 12 }}>✓</Tag>
										<Text style={{ fontSize: 13 }}>{item}</Text>
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
						style={{ borderRadius: 8, height: "100%", background: "#fff" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 36, padding: "0 12px" } }}
					>
						<List
							size="small"
							dataSource={review.shortcomings || []}
							renderItem={item => (
								<List.Item style={{ padding: "4px 0", border: "none" }}>
									<Space>
										<Tag color="error" style={{ borderRadius: 12 }}>✗</Tag>
										<Text style={{ fontSize: 13 }}>{item}</Text>
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
						style={{ borderRadius: 8, height: "100%", background: "#fff" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 36, padding: "0 12px" } }}
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
						style={{ borderRadius: 8, height: "100%", background: "#fff" }}
						styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 36, padding: "0 12px" } }}
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
					style={{ borderRadius: 8, marginTop: 12, background: "#fff" }}
					styles={{ header: { borderBottom: "1px solid #f0f0f0", minHeight: 36, padding: "0 12px" } }}
				>
					{review.position_analysis.map(pa => (
						<div
							key={pa.stock_code}
							style={{
								padding: "8px 0",
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
		</div>
	);
}
