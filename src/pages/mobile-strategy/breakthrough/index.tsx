import { fetchBreakthroughRecommendations, refreshBreakthroughRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "🚀",
	title: "突破战法",
	subtitle: "价格突破 · 量能放大",
	strategyType: "breakthrough",
	fetchData: (limit = 13) => fetchBreakthroughRecommendations(limit),
	refreshData: (limit = 13) => refreshBreakthroughRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileBreakthrough() {
	return <MobileStrategyPage config={config} />;
}
