import { fetchAuctionRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "⏰",
	title: "竞价/尾盘",
	subtitle: "集合竞价 · 尾盘低吸",
	strategyType: "auction",
	fetchData: (limit = 13) => fetchAuctionRecommendations(limit),
	// auction 暂无单独的 refresh 接口，直接重新 fetch
	refreshData: (limit = 13) => fetchAuctionRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileAuction() {
	return <MobileStrategyPage config={config} />;
}
