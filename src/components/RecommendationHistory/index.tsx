import type { RecommendationHistoryItem } from "#src/api/strategy";
import { fetchRecommendationHistory } from "#src/api/strategy";
import {
	CalendarOutlined,
	ClockCircleOutlined,
	HistoryOutlined,
	LeftOutlined,
	RightOutlined,
	StockOutlined,
} from "@ant-design/icons";
import {
	Badge,
	Button,
	Card,
	Col,
	Empty,
	Row,
	Space,
	Spin,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import React, { useEffect, useMemo, useState } from "react";

const { Text } = Typography;

/** session 类型映射 */
const SESSION_LABELS: Record<string, { label: string, color: string }> = {
	morning: { label: "早盘", color: "blue" },
	afternoon: { label: "午盘", color: "orange" },
	manual: { label: "手动刷新", color: "purple" },
	auto: { label: "定时", color: "green" },
};

/** 推荐等级配色 */
const LEVEL_STYLES: Record<string, { color: string, bg: string, border: string, tag: string }> = {
	强烈推荐: { color: "#cf1322", bg: "#fff1f0", border: "#ffa39e", tag: "red" },
	推荐: { color: "#d46b08", bg: "#fff7e6", border: "#ffd591", tag: "orange" },
	关注: { color: "#096dd9", bg: "#e6f7ff", border: "#91d5ff", tag: "blue" },
	回避: { color: "#8c8c8c", bg: "#fafafa", border: "#d9d9d9", tag: "default" },
};

const defaultLevel = { color: "#096dd9", bg: "#e6f7ff", border: "#91d5ff", tag: "blue" };

/** 格式化价格 */
function fmtPrice(v: any): string {
	if (!v)
		return "";
	if (typeof v === "number")
		return `¥${v.toFixed(2)}`;
	return String(v);
}

interface Props {
	strategyType?: string
	limit?: number
	title?: string
}

const RecommendationHistory: React.FC<Props> = ({
	strategyType,
	limit = 30,
	title = "历史推荐记录",
}) => {
	const [items, setItems] = useState<RecommendationHistoryItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const resp = await fetchRecommendationHistory(strategyType, limit, true);
				if (resp.status === "success")
					setItems(resp.data.items || []);
			}
			catch (e) {
				console.error("Failed to load recommendation history", e);
			}
			finally {
				setLoading(false);
			}
		})();
	}, [strategyType, limit]);

	// 按日期分组
	const grouped = useMemo(() => {
		const map: Record<string, RecommendationHistoryItem[]> = {};
		for (const item of items) {
			const d = item.trading_date || "未知";
			if (!map[d])
				map[d] = [];
			map[d].push(item);
		}
		return map;
	}, [items]);

	const sortedDates = useMemo(
		() => Object.keys(grouped).sort((a, b) => b.localeCompare(a)),
		[grouped],
	);

	const [dateIdx, setDateIdx] = useState(0);

	// 当日期列表变化时重置到最新日期
	useEffect(() => {
		setDateIdx(0);
	}, [sortedDates.length]);

	const currentDate = sortedDates[dateIdx] || "";
	const currentItems = grouped[currentDate] || [];

	// 合并当天所有 session 的推荐
	const allStocks = useMemo(() => {
		const result: Array<{ stock: any, session: string, generatedAt: string }> = [];
		for (const rec of currentItems) {
			const recs = rec.recommendations || [];
			for (const stock of recs) {
				result.push({
					stock,
					session: rec.session_type,
					generatedAt: rec.generated_at,
				});
			}
		}
		return result;
	}, [currentItems]);

	// ---------- Render ----------

	if (loading) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
					<Spin tip="加载历史推荐..." />
				</div>
			</Card>
		);
	}

	if (!items.length) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<Empty description="暂无历史推荐记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
			</Card>
		);
	}

	// 当天 session 信息
	const latestSession = currentItems[0];
	const sessionInfo = latestSession ? SESSION_LABELS[latestSession.session_type] || { label: latestSession.session_type, color: "default" } : null;

	return (
		<Card
			bordered={false}
			style={{
				borderRadius: 12,
				marginTop: 20,
				overflow: "hidden",
			}}
			styles={{ header: { borderBottom: "none", padding: "16px 24px 0" }, body: { padding: "12px 24px 24px" } }}
			title={(
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
					{/* 左侧：标题 + 总数 */}
					<Space size={8}>
						<HistoryOutlined style={{ color: "#722ed1", fontSize: 18 }} />
						<Text strong style={{ fontSize: 15 }}>{title}</Text>
						<Badge
							count={sortedDates.length}
							style={{ backgroundColor: "#722ed1" }}
							overflowCount={99}
							title={`共 ${sortedDates.length} 天记录`}
						/>
					</Space>

					{/* 右侧：日期导航 */}
					<Space size={4}>
						<Button
							size="small"
							type="text"
							icon={<LeftOutlined />}
							disabled={dateIdx >= sortedDates.length - 1}
							onClick={() => setDateIdx(i => Math.min(i + 1, sortedDates.length - 1))}
						/>

						<Tag
							icon={<CalendarOutlined />}
							color="processing"
							style={{
								margin: 0,
								fontSize: 14,
								fontWeight: 600,
								padding: "2px 12px",
								borderRadius: 6,
								cursor: "default",
							}}
						>
							{currentDate}
						</Tag>

						<Button
							size="small"
							type="text"
							icon={<RightOutlined />}
							disabled={dateIdx <= 0}
							onClick={() => setDateIdx(i => Math.max(i - 1, 0))}
						/>
					</Space>
				</div>
			)}
		>
			{/* 元信息条 */}
			<div style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				marginBottom: 16,
				padding: "8px 16px",
				background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
				borderRadius: 8,
				flexWrap: "wrap",
				gap: 8,
			}}
			>
				<Space size={12} wrap>
					{sessionInfo && <Tag color={sessionInfo.color}>{sessionInfo.label}</Tag>}
					<Space size={4}>
						<StockOutlined style={{ color: "#722ed1" }} />
						<Text strong style={{ color: "#722ed1" }}>
							{allStocks.length}
							{" "}
							只
						</Text>
					</Space>
					{latestSession?.generated_at && (
						<Space size={4}>
							<ClockCircleOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
							<Text type="secondary" style={{ fontSize: 12 }}>
								{latestSession.generated_at}
							</Text>
						</Space>
					)}
				</Space>

				{/* 日期跳转快捷按钮 */}
				<Space size={4} wrap>
					{sortedDates.slice(0, 5).map((d, i) => (
						<Tag
							key={d}
							style={{
								cursor: "pointer",
								margin: 0,
								fontWeight: i === dateIdx ? 600 : 400,
								borderRadius: 4,
							}}
							color={i === dateIdx ? "purple" : undefined}
							onClick={() => setDateIdx(i)}
						>
							{d.slice(5)}
						</Tag>
					))}
					{sortedDates.length > 5 && (
						<Text type="secondary" style={{ fontSize: 11 }}>
							...共
							{sortedDates.length}
							天
						</Text>
					)}
				</Space>
			</div>

			{/* 推荐股票卡片网格 */}
			{allStocks.length === 0
				? <Empty description="该日无推荐数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
				: (
					<Row gutter={[12, 12]}>
						{allStocks.map(({ stock }, si) => {
							const code = stock.code || stock.stock_code || "";
							const name = stock.name || stock.stock_name || "未知";
							const changePct: number = stock.change_pct ?? 0;
							const bp = stock.suggested_buy_price || stock.buy_price_range || "";
							const sp = stock.suggested_sell_price || stock.target_price || "";
							const sl = stock.stop_loss_price || "";
							const advice = stock.operation_advice || stock.operation_suggestion || stock.llm_operation || "";
							const reason = stock.buy_reason || stock.llm_reason || (stock.reasons || []).join("；") || "";
							const level: string = stock.recommendation_level || "";
							const ls = LEVEL_STYLES[level] || defaultLevel;

							return (
								<Col key={`${code}-${si}`} xs={24} sm={12} lg={8}>
									<div style={{
										borderRadius: 10,
										border: `1px solid ${ls.border}`,
										background: "#fff",
										overflow: "hidden",
										height: "100%",
										display: "flex",
										flexDirection: "column",
										transition: "box-shadow 0.2s, transform 0.2s",
									}}
									>
										{/* 顶部彩条 + 股票名/代码/等级 */}
										<div style={{
											background: ls.bg,
											padding: "10px 14px 8px",
											borderBottom: `1px solid ${ls.border}`,
										}}
										>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<div>
													<Text strong style={{ fontSize: 15, color: "#262626" }}>{name}</Text>
													<Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{code}</Text>
												</div>
												{level
													? <Tag color={ls.tag} style={{ margin: 0, fontWeight: 600 }}>{level}</Tag>
													: null}
											</div>
											{/* 涨跌幅 */}
											{changePct !== 0 && (
												<Text style={{
													fontSize: 13,
													fontWeight: 600,
													color: changePct >= 0 ? "#cf1322" : "#389e0d",
												}}
												>
													涨跌:
													{changePct >= 0 ? "+" : ""}
													{changePct.toFixed(2)}
													%
												</Text>
											)}
										</div>

										{/* 价格区 */}
										{(bp || sp || sl)
											? (
												<div style={{ display: "flex", padding: "8px 14px", gap: 4, flexWrap: "wrap" }}>
													{bp && (
														<Tag color="green" style={{ margin: 0, fontSize: 12 }}>
															买:
															{fmtPrice(bp)}
														</Tag>
													)}
													{sp && (
														<Tag color="red" style={{ margin: 0, fontSize: 12 }}>
															目标:
															{fmtPrice(sp)}
														</Tag>
													)}
													{sl && (
														<Tag style={{ margin: 0, fontSize: 12, color: "#8c8c8c" }}>
															止损:
															{fmtPrice(sl)}
														</Tag>
													)}
												</div>
											)
											: null}

										{/* 推荐理由 */}
										{reason && (
											<Tooltip title={reason} placement="top">
												<div style={{
													padding: "4px 14px",
													fontSize: 12,
													color: "#595959",
													lineHeight: "18px",
													display: "-webkit-box",
													WebkitLineClamp: 3,
													WebkitBoxOrient: "vertical" as const,
													overflow: "hidden",
													flex: 1,
												}}
												>
													💡
													{" "}
													{reason}
												</div>
											</Tooltip>
										)}

										{/* 操作建议 */}
										{advice && (
											<div style={{
												margin: "0 10px 10px",
												padding: "6px 10px",
												background: "linear-gradient(90deg, #eef2ff 0%, #e0e7ff 100%)",
												borderRadius: 6,
												fontSize: 12,
												color: "#4338ca",
												lineHeight: "18px",
											}}
											>
												📋
												{" "}
												{advice}
											</div>
										)}
									</div>
								</Col>
							);
						})}
					</Row>
				)}
		</Card>
	);
};

export default RecommendationHistory;
