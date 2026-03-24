import { fetchCombinedRecommendations, refreshCombinedRecommendations } from "#src/api/strategy";
import { MobileAlertBanner } from "#src/components/MobileStrategy";
import { MobileStrategyPage } from "#src/components/MobileStrategy/MobileStrategyPage";

const config = {
	icon: "🎯",
	title: "综合战法",
	subtitle: "多策略共振 · 综合研判",
	strategyType: "combined",
	fetchData: (limit = 13) => fetchCombinedRecommendations(limit),
	refreshData: (limit = 13) => refreshCombinedRecommendations(limit),
	getStocks: (data: any) => data?.recommendations || [],
	getStats: (data: any) => [
		{ label: "推荐总数", value: data?.total ?? 0, color: "#1677ff" },
		{ label: "强烈推荐", value: (data?.recommendations || []).filter((s: any) => s.recommendation_level === "强烈推荐").length, color: "#ff4d4f" },
		{ label: "来源策略", value: data?.source_strategies?.length ?? "-", color: "#722ed1" },
	],
	renderAlert: (data: any) => data?.market_analysis
		? (
			<MobileAlertBanner
				type="info"
				message="综合市场研判"
				description={data.market_analysis}
			/>
		)
		: null,
};

export default function MobileCombined() {
	return <MobileStrategyPage config={config} />;
}
