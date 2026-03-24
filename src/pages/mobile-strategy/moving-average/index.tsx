import { fetchMovingAverageRecommendations, refreshMovingAverageRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "📈",
	title: "均线战法",
	subtitle: "均线多头 · 趋势放量",
	strategyType: "moving_average",
	fetchData: (limit = 13) => fetchMovingAverageRecommendations(limit),
	refreshData: (limit = 13) => refreshMovingAverageRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileMovingAverage() {
	return <MobileStrategyPage config={config} />;
}
