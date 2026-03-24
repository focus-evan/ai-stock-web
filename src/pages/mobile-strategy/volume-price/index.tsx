import { fetchVolumePriceRecommendations, refreshVolumePriceRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "📊",
	title: "量价关系",
	subtitle: "量能验证 · 趋势共振",
	strategyType: "volume_price",
	fetchData: (limit = 13) => fetchVolumePriceRecommendations(limit),
	refreshData: (limit = 13) => refreshVolumePriceRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileVolumePrice() {
	return <MobileStrategyPage config={config} />;
}
