import { fetchTrendMomentumRecommendations, refreshTrendMomentumRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "⚡",
	title: "趋势动量",
	subtitle: "强势趋势 · 动量持续",
	strategyType: "trend_momentum",
	fetchData: (limit = 13) => fetchTrendMomentumRecommendations(limit),
	refreshData: (limit = 13) => refreshTrendMomentumRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileTrendMomentum() {
	return <MobileStrategyPage config={config} />;
}
