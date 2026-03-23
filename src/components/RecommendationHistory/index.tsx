import type { RecommendationHistoryItem } from "#src/api/strategy";
import { fetchRecommendationHistory } from "#src/api/strategy";
import {
	CalendarOutlined,
	ClockCircleOutlined,
	HistoryOutlined,
	StockOutlined,
} from "@ant-design/icons";
import {
	Badge,
	Card,
	Col,
	Collapse,
	Empty,
	Row,
	Space,
	Spin,
	Tag,
	Timeline,
	Tooltip,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";

const { Text } = Typography;

/** 策略类型中文映射 */
const STRATEGY_LABELS: Record<string, string> = {
	dragon_head: "龙头战法",
	sentiment: "情绪战法",
	event_driven: "事件驱动",
	breakthrough: "突破战法",
	volume_price: "量价关系",
	auction: "竞价/尾盘",
	moving_average: "均线战法",
	combined: "综合战法",
	northbound: "北向资金",
	trend_momentum: "趋势动量",
	moat_value: "护城河价值",
};

/** session 类型映射 */
const SESSION_LABELS: Record<string, { label: string, color: string }> = {
	morning: { label: "早盘", color: "blue" },
	afternoon: { label: "午盘", color: "orange" },
	manual: { label: "手动刷新", color: "purple" },
	auto: { label: "定时", color: "green" },
};

interface Props {
	/** 策略类型(如 dragon_head)，传入则只查该策略 */
	strategyType?: string
	/** 历史条数上限 */
	limit?: number
	/** 标题 */
	title?: string
}

const RecommendationHistory: React.FC<Props> = ({
	strategyType,
	limit = 20,
	title = "📜 历史推荐记录",
}) => {
	const [items, setItems] = useState<RecommendationHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const resp = await fetchRecommendationHistory(strategyType, limit, true);
				if (resp.status === "success") {
					setItems(resp.data.items || []);
				}
			}
			catch (e) {
				console.error("Failed to load recommendation history", e);
			}
			finally {
				setLoading(false);
			}
		};
		load();
	}, [strategyType, limit]);

	if (loading) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
				<Spin tip="加载历史推荐...">
					<div style={{ height: 100 }} />
				</Spin>
			</Card>
		);
	}

	if (!items.length) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 16 }}>
				<Empty description="暂无历史推荐记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
			</Card>
		);
	}

	// 按日期分组
	const grouped: Record<string, RecommendationHistoryItem[]> = {};
	for (const item of items) {
		const date = item.trading_date || "未知日期";
		if (!grouped[date])
			grouped[date] = [];
		grouped[date].push(item);
	}
	const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

	return (
		<Card
			bordered={false}
			style={{ borderRadius: 12, marginTop: 16 }}
			title={(
				<Space>
					<HistoryOutlined style={{ color: "#722ed1" }} />
					<Text strong>{title}</Text>
					<Badge count={items.length} style={{ backgroundColor: "#722ed1" }} overflowCount={99} />
				</Space>
			)}
		>
			<Timeline
				mode="left"
				items={sortedDates.map(date => ({
					color: date === sortedDates[0] ? "blue" : "gray",
					label: (
						<Space size={4}>
							<CalendarOutlined />
							<Text strong style={{ fontSize: 13 }}>{date}</Text>
						</Space>
					),
					children: (
						<Collapse
							size="small"
							ghost
							defaultActiveKey={date === sortedDates[0] ? grouped[date].map((_: any, i: number) => `${date}-${i}`) : []}
							items={grouped[date].map((rec, idx) => {
								const sessionInfo = SESSION_LABELS[rec.session_type] || { label: rec.session_type, color: "default" };
								const strategyLabel = STRATEGY_LABELS[rec.strategy_type] || rec.strategy_type;
								const recs = rec.recommendations || [];

								return {
									key: `${date}-${idx}`,
									label: (
										<Space size={8}>
											<Tag color={sessionInfo.color}>{sessionInfo.label}</Tag>
											{!strategyType && <Tag>{strategyLabel}</Tag>}
											<StockOutlined />
											<Text style={{ fontSize: 12 }}>
												{rec.stock_count}
												只
											</Text>
											<ClockCircleOutlined style={{ color: "#8c8c8c", fontSize: 11 }} />
											<Text type="secondary" style={{ fontSize: 11 }}>{rec.generated_at}</Text>
										</Space>
									),
									children: (
										<div>
											{recs.length === 0
												? (
													<Text type="secondary" style={{ fontSize: 12 }}>无推荐明细</Text>
												)
												: (
													<Row gutter={[8, 8]}>
														{recs.map((stock: any, si: number) => {
															const code = stock.code || stock.stock_code || "";
															const name = stock.name || stock.stock_name || "未知";
															const changePct = stock.change_pct ?? 0;
															const bp = stock.suggested_buy_price || stock.buy_price_range || "";
															const sp = stock.suggested_sell_price || stock.target_price || "";
															const sl = stock.stop_loss_price || "";
															const advice = stock.operation_advice || stock.operation_suggestion || stock.llm_operation || "";
															const reason = stock.buy_reason || stock.llm_reason || (stock.reasons || []).join("；") || "";
															const level = stock.recommendation_level || "";

															return (
																<Col key={`${code}-${si}`} xs={24} sm={12} md={8}>
																	<Card
																		size="small"
																		bordered
																		style={{
																			borderRadius: 8,
																			borderLeft: `3px solid ${
																				level === "强烈推荐"
																					? "#f5222d"
																					: level === "推荐"
																						? "#fa8c16"
																						: "#1890ff"
																			}`,
																		}}
																	>
																		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
																			<Space size={4}>
																				<Text strong style={{ fontSize: 14 }}>{name}</Text>
																				<Text type="secondary" style={{ fontSize: 11 }}>{code}</Text>
																			</Space>
																			{level && (
																				<Tag
																					color={
																						level === "强烈推荐"
																							? "red"
																							: level === "推荐"
																								? "orange"
																								: level === "回避"
																									? "default"
																									: "blue"
																					}
																					style={{ margin: 0, fontSize: 11 }}
																				>
																					{level}
																				</Tag>
																			)}
																		</div>

																		{changePct !== 0 && (
																			<Text style={{ fontSize: 12, color: changePct >= 0 ? "#f5222d" : "#52c41a" }}>
																				涨跌:
																				{changePct >= 0 ? "+" : ""}
																				{changePct.toFixed(2)}
																				%
																			</Text>
																		)}

																		{(bp || sp || sl) && (
																			<div style={{
																				display: "flex",
																				gap: 8,
																				margin: "4px 0",
																				fontSize: 11,
																				flexWrap: "wrap",
																			}}
																			>
																				{bp && (
																					<span style={{ color: "#389e0d" }}>
																						买:
																						{typeof bp === "number" ? `¥${bp.toFixed(2)}` : bp}
																					</span>
																				)}
																				{sp && (
																					<span style={{ color: "#cf1322" }}>
																						目标:
																						{typeof sp === "number" ? `¥${sp.toFixed(2)}` : sp}
																					</span>
																				)}
																				{sl && (
																					<span style={{ color: "#8c8c8c" }}>
																						止损:
																						{typeof sl === "number" ? `¥${sl.toFixed(2)}` : sl}
																					</span>
																				)}
																			</div>
																		)}

																		{reason && (
																			<Tooltip title={reason}>
																				<Text style={{
																					fontSize: 11,
																					color: "#595959",
																					display: "-webkit-box",
																					WebkitLineClamp: 2,
																					WebkitBoxOrient: "vertical" as const,
																					overflow: "hidden",
																				}}
																				>
																					💡
																					{reason}
																				</Text>
																			</Tooltip>
																		)}

																		{advice && (
																			<div style={{
																				marginTop: 4,
																				padding: "3px 6px",
																				background: "#f0f5ff",
																				borderRadius: 4,
																				fontSize: 11,
																				color: "#2f54eb",
																			}}
																			>
																				📋
																				{advice}
																			</div>
																		)}
																	</Card>
																</Col>
															);
														})}
													</Row>
												)}
										</div>
									),
								};
							})}
						/>
					),
				}))}
			/>
		</Card>
	);
};

export default RecommendationHistory;
