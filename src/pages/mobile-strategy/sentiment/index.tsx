import type { SentimentData } from "#src/api/strategy";
import { fetchSentimentData, refreshSentimentRecommendations } from "#src/api/strategy";
import {
	MobileAlertBanner,
	MobileEmpty,
	MobilePageHeader,
	MobileStatRow,
	MobileStockCard,
	MobileStrategyContainer,
	SectionTitle,
} from "#src/components/MobileStrategy";
import { useCallback, useEffect, useState } from "react";

export default function MobileSentiment() {
	const [data, setData] = useState<SentimentData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await fetchSentimentData(30);
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
			const resp = await refreshSentimentRecommendations(13);
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

	const stocks = data?.stock_picks?.stocks || [];

	return (
		<MobileStrategyContainer loading={loading}>
			<MobilePageHeader
				icon="❤️"
				title="情绪战法"
				subtitle="市场情绪 · 短线机会"
				date={data?.generated_at?.slice(0, 10)}
				count={stocks.length}
				refreshing={refreshing}
				refreshSeconds={refreshSeconds}
				onRefresh={handleRefresh}
			/>

			{!data || !stocks.length
				? <MobileEmpty description="暂无情绪推荐数据" />
				: (
					<div style={{ paddingBottom: 24 }}>
						<div style={{ marginTop: 12 }}>
							<MobileStatRow items={[
								{ label: "情绪分位", value: data.today ? `${Math.round((data.today.sentiment_percentile || 0) * 100)}%` : "-", color: "#722ed1" },
								{ label: "涨停家数", value: data.today?.limit_up_count ?? "-", color: "#ff4d4f" },
								{ label: "晋级率", value: data.today ? `${((data.today.promotion_rate || 0) * 100).toFixed(1)}%` : "-", color: "#fa8c16" },
							]}
							/>
						</div>

						{data.signal && (
							<MobileAlertBanner
								type="info"
								message={`当前信号: ${data.signal}`}
								description={data.llm_analysis?.operation_advice || ""}
							/>
						)}

						<SectionTitle>📊 今日情绪推荐</SectionTitle>
						<div style={{ padding: "0 16px" }}>
							{stocks.map((stock: any, i: number) => (
								<MobileStockCard key={stock.stock_code || i} stock={stock} />
							))}
						</div>
					</div>
				)}
		</MobileStrategyContainer>
	);
}
