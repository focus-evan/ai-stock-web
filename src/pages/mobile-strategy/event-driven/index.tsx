import { fetchEventDrivenRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "📡",
	title: "事件驱动",
	subtitle: "政策事件 · 催化涨升",
	strategyType: "event_driven",
	fetchData: (limit = 13) => fetchEventDrivenRecommendations(limit, false),
	refreshData: (limit = 13) => fetchEventDrivenRecommendations(limit, true),
	getStocks: (data: any) => data?.recommendations || [],
};

export default function MobileEventDriven() {
	return <MobileStrategyPage config={config} />;
}
