import { fetchNorthboundRecommendations, refreshNorthboundRecommendations } from "#src/api/strategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "🏦",
	title: "北向资金",
	subtitle: "外资追踪 · 聪明钱流",
	strategyType: "northbound",
	fetchData: (limit = 13) => fetchNorthboundRecommendations(limit),
	refreshData: (limit = 13) => refreshNorthboundRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
	getStats: (data: any) => [
		{ label: "推荐总数", value: data?.total ?? 0, color: "#1677ff" },
		{ label: "净流入", value: data?.market_overview?.net_inflow != null ? `${(data.market_overview.net_inflow / 1e8).toFixed(1)}亿` : "-", color: "#ff4d4f" },
		{ label: "AI增强", value: data?.llm_enhanced ? "✅" : "●", color: "#52c41a" },
	],
};

export default function MobileNorthbound() {
	return <MobileStrategyPage config={config} />;
}
