import {
	clearCache,
	getCacheStats,
} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	ClearOutlined,
	DatabaseOutlined,
	PieChartOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Button,
	Card,
	Col,
	message,
	Popconfirm,
	Progress,
	Row,
	Select,
	Space,
	Statistic,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function CachePage() {
	const { t } = useTranslation();
	const [selectedCacheType, setSelectedCacheType] = useState<string>("all");

	// Fetch cache stats
	const {
		data: cacheStats,
		loading: statsLoading,
		refresh: refreshStats,
	} = useRequest(getCacheStats);

	// Clear cache
	const { run: handleClearCache, loading: clearLoading } = useRequest(
		async (cacheType: string) => {
			return await clearCache({ cache_type: cacheType as any });
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("system.cacheCleared", { defaultValue: "Cache cleared successfully" }));
				refreshStats();
			},
			onError: (error) => {
				message.error(t("system.cacheClearFailed", { defaultValue: "Failed to clear cache" }));
				console.error("Clear cache error:", error);
			},
		},
	);

	const handleClear = () => {
		handleClearCache(selectedCacheType);
	};

	const calculateHitRate = (hits: number, misses: number) => {
		const total = hits + misses;
		if (total === 0)
			return 0;
		return ((hits / total) * 100).toFixed(2);
	};

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* Cache Statistics */}
				<Card
					title={(
						<Space>
							<DatabaseOutlined />
							{t("system.cacheStatistics", { defaultValue: "Cache Statistics" })}
						</Space>
					)}
					extra={(
						<Button icon={<ReloadOutlined />} onClick={refreshStats} loading={statsLoading}>
							{t("common.refresh", { defaultValue: "Refresh" })}
						</Button>
					)}
				>
					{cacheStats && (
						<Row gutter={[16, 16]}>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title={t("system.totalKeys", { defaultValue: "Total Keys" })}
									value={cacheStats.total_keys || cacheStats.total_items || 0}
									prefix={<DatabaseOutlined />}
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title={t("system.cacheSize", { defaultValue: "Cache Size" })}
									value={cacheStats.total_size || cacheStats.total_size_mb || 0}
									suffix="MB"
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title={t("system.cacheHits", { defaultValue: "Cache Hits" })}
									value={cacheStats.hits || 0}
									valueStyle={{ color: "#52c41a" }}
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title={t("system.cacheMisses", { defaultValue: "Cache Misses" })}
									value={cacheStats.misses || 0}
									valueStyle={{ color: "#ff4d4f" }}
								/>
							</Col>
						</Row>
					)}
				</Card>

				{/* Cache Hit Rate */}
				{cacheStats && (
					<Card
						title={(
							<Space>
								<PieChartOutlined />
								{t("system.cacheHitRate", { defaultValue: "Cache Hit Rate" })}
							</Space>
						)}
					>
						<Row gutter={[16, 16]}>
							<Col xs={24} md={12}>
								<div style={{ marginBottom: 16 }}>
									<div style={{ fontSize: 16, marginBottom: 8 }}>
										{t("system.overallHitRate", { defaultValue: "Overall Hit Rate" })}
									</div>
									<Progress
										percent={Number(calculateHitRate(cacheStats.hits || 0, cacheStats.misses || 0))}
										status="active"
										strokeColor={{
											"0%": "#108ee9",
											"100%": "#87d068",
										}}
									/>
								</div>
							</Col>
							<Col xs={24} md={12}>
								<Space direction="vertical" style={{ width: "100%" }}>
									<div style={{ fontSize: 16, marginBottom: 8 }}>
										{t("system.cacheBreakdown", { defaultValue: "Cache Breakdown" })}
									</div>
									{cacheStats.cache_types && Object.entries(cacheStats.cache_types).map(([type, stats]) => (
										<div key={type}>
											<div style={{ marginBottom: 4 }}>
												{type}
												:
												{" "}
												{stats.keys || 0}
												{" "}
												keys (
												{stats.size || 0}
												{" "}
												MB)
											</div>
											<Progress
												percent={Number(calculateHitRate(stats.hits || 0, stats.misses || 0))}
												size="small"
											/>
										</div>
									))}
								</Space>
							</Col>
						</Row>
					</Card>
				)}

				{/* Clear Cache */}
				<Card
					title={(
						<Space>
							<ClearOutlined />
							{t("system.clearCache", { defaultValue: "Clear Cache" })}
						</Space>
					)}
				>
					<Space direction="vertical" style={{ width: "100%" }}>
						<div style={{ color: "#666", marginBottom: 16 }}>
							{t("system.clearCacheDesc", {
								defaultValue: "Select cache type to clear. This action cannot be undone.",
							})}
						</div>
						<Space>
							<Select
								style={{ width: 200 }}
								value={selectedCacheType}
								onChange={setSelectedCacheType}
							>
								<Select.Option value="all">
									{t("system.allCache", { defaultValue: "All Cache" })}
								</Select.Option>
								<Select.Option value="stock">
									{t("system.stockCache", { defaultValue: "Stock Cache" })}
								</Select.Option>
								<Select.Option value="ipo">
									{t("system.ipoCache", { defaultValue: "IPO Cache" })}
								</Select.Option>
								<Select.Option value="rag">
									{t("system.ragCache", { defaultValue: "RAG Cache" })}
								</Select.Option>
								<Select.Option value="document">
									{t("system.documentCache", { defaultValue: "Document Cache" })}
								</Select.Option>
							</Select>
							<Popconfirm
								title={t("system.confirmClearCache", { defaultValue: "Clear cache?" })}
								description={t("system.clearCacheWarning", {
									defaultValue: "This will clear the selected cache. Continue?",
								})}
								onConfirm={handleClear}
							>
								<Button
									type="primary"
									danger
									icon={<ClearOutlined />}
									loading={clearLoading}
								>
									{t("system.clearCache", { defaultValue: "Clear Cache" })}
								</Button>
							</Popconfirm>
						</Space>
					</Space>
				</Card>
			</Space>
		</BasicContent>
	);
}
