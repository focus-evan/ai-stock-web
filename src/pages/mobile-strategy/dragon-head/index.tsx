import type { DragonHeadData, StockRecommendation } from "#src/api/strategy";
import { fetchDragonHeadRecommendations, refreshDragonHeadRecommendations } from "#src/api/strategy";
import {
	MobileAlertBanner,
	MobileEmpty,
	MobilePageHeader,
	MobileStatRow,
	MobileStockCard,
	MobileStrategyContainer,
	SectionTitle,
} from "#src/components/MobileStrategy";
import { Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

const { Text } = Typography;

export default function MobileDragonHead() {
	const [data, setData] = useState<DragonHeadData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await fetchDragonHeadRecommendations(13);
			if (resp.status === "success" && resp.data)
				setData(resp.data);
		}
		catch (e) {
			console.error(e);
		}
		finally {
			setLoading(false);
		}
	}, []);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		const timer = setInterval(() => setRefreshSeconds(s => s + 1), 1000);
		try {
			const resp = await refreshDragonHeadRecommendations(13);
			if (resp.status === "success" && resp.data)
				setData(resp.data);
		}
		catch (e) {
			console.error(e);
		}
		finally {
			clearInterval(timer);
			setRefreshing(false);
			setRefreshSeconds(0);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const strongCount = data?.recommendations?.filter(r => r.recommendation_level === "强烈推荐").length || 0;
	const maxDays = data?.recommendations ? Math.max(...data.recommendations.map(r => r.limit_up_days), 0) : 0;

	return (
		<MobileStrategyContainer loading={loading}>
			<MobilePageHeader
				icon="👑"
				title="龙头战法"
				subtitle="连板龙头 · 主线主升"
				date={data?.trading_date}
				count={data?.recommendations?.length}
				refreshing={refreshing}
				refreshSeconds={refreshSeconds}
				onRefresh={handleRefresh}
			/>

			{!data || !data.recommendations?.length
				? <MobileEmpty description="暂无龙头推荐数据" />
				: (
					<div style={{ paddingBottom: 24 }}>
						{/* 统计 */}
						<div style={{ marginTop: 12 }}>
							<MobileStatRow items={[
								{ label: "推荐总数", value: data.total || data.recommendations.length, color: "#1677ff" },
								{ label: "强烈推荐", value: strongCount, color: "#ff4d4f" },
								{ label: "最高连板", value: `${maxDays}天`, color: "#fa541c" },
							]}
							/>
						</div>

						{/* 市场情绪 */}
						{data.market_sentiment && (
							<MobileAlertBanner
								type={data.market_sentiment.risk_level === "高" ? "error" : data.market_sentiment.risk_level === "中" ? "warning" : "success"}
								message={`市场: ${data.market_sentiment.phase}期 · 风险${data.market_sentiment.risk_level}`}
								description={data.market_sentiment.description}
							/>
						)}

						{/* 主线题材 */}
						{data.main_themes && data.main_themes.length > 0 && (
							<>
								<SectionTitle>🔥 今日主线题材</SectionTitle>
								<div style={{ margin: "0 16px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
									{data.main_themes.map((t, i) => (
										<Tag
											key={i}
											color={i === 0 ? "red" : i === 1 ? "orange" : "gold"}
											style={{ fontSize: 13, padding: "4px 12px" }}
										>
											{t.name}
											{t.details?.change_pct
												? (
													<span style={{ marginLeft: 4 }}>
														{t.details.change_pct > 0 ? "+" : ""}
														{t.details.change_pct.toFixed(2)}
														%
													</span>
												)
												: null}
										</Tag>
									))}
								</div>
							</>
						)}

						{/* 推荐列表 */}
						<SectionTitle>📊 推荐个股</SectionTitle>
						<div style={{ padding: "0 16px" }}>
							{data.recommendations.map((stock: StockRecommendation, i: number) => (
								<MobileStockCard
									key={stock.code || i}
									stock={stock}
									extraContent={stock.amount
										? (
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<Text type="secondary" style={{ fontSize: 11 }}>
													成交额
													{" "}
													<Text strong style={{ color: "#262626" }}>{stock.amount >= 1e8 ? `${(stock.amount / 1e8).toFixed(2)}亿` : `${(stock.amount / 1e4).toFixed(0)}万`}</Text>
												</Text>
												{stock.turnover_rate
													? (
														<Text type="secondary" style={{ fontSize: 11 }}>
															换手率
															{" "}
															<Text strong style={{ color: stock.turnover_rate > 15 ? "#d4380d" : "#262626" }}>
																{stock.turnover_rate.toFixed(2)}
																%
															</Text>
														</Text>
													)
													: null}
											</div>
										)
										: null}
								/>
							))}
						</div>
					</div>
				)}
		</MobileStrategyContainer>
	);
}
