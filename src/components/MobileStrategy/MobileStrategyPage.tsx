/**
 * 通用移动端战法页面 - 接受配置参数，复用相同布局
 * Used by all simple strategies that return a recommendations[] list
 */
import {
	MobileEmpty,
	MobilePageHeader,
	MobileStatRow,
	MobileStockCard,
	MobileStrategyContainer,
	SectionTitle,
} from "#src/components/MobileStrategy";
import { Spin } from "antd";
import React, { useCallback, useEffect, useState } from "react";

export interface MobileStrategyConfig {
	icon: string
	title: string
	subtitle: string
	strategyType: string
	fetchData: (limit?: number) => Promise<any>
	refreshData: (limit?: number) => Promise<any>
	/** 从 data 中取推荐股列表 */
	getStocks: (data: any) => any[]
	/** 从 data 中取统计行 */
	getStats?: (data: any) => Array<{ label: string, value: string | number, color?: string }>
	/** 额外的 alert 区域 */
	renderAlert?: (data: any) => React.ReactNode
}

interface Props {
	config: MobileStrategyConfig
}

export function MobileStrategyPage({ config }: Props) {
	const [data, setData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshSeconds, setRefreshSeconds] = useState(0);

	const fetch = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await config.fetchData(13);
			if (resp.status === "success" && resp.data)
				setData(resp.data);
		}
		catch (e) {
			console.error(e);
		}
		finally {
			setLoading(false);
		}
	}, [config]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		const timer = setInterval(() => setRefreshSeconds(s => s + 1), 1000);
		try {
			const resp = await config.refreshData(13);
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
	}, [config]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	const stocks = data ? config.getStocks(data) : [];

	const defaultStats = (d: any) => [
		{ label: "推荐总数", value: d?.total ?? stocks.length, color: "#1677ff" },
		{ label: "强烈推荐", value: stocks.filter((s: any) => s.recommendation_level === "强烈推荐").length, color: "#ff4d4f" },
		{ label: "AI增强", value: d?.llm_enhanced ? "✅" : "●", color: "#52c41a" },
	];

	const stats = config.getStats ? config.getStats(data) : defaultStats(data);

	if (loading) {
		return (
			<div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
				<Spin tip="加载中..." />
			</div>
		);
	}

	return (
		<MobileStrategyContainer loading={false}>
			<MobilePageHeader
				icon={config.icon}
				title={config.title}
				subtitle={config.subtitle}
				date={data?.trading_date}
				count={stocks.length}
				refreshing={refreshing}
				refreshSeconds={refreshSeconds}
				onRefresh={handleRefresh}
			/>

			{!data || !stocks.length
				? <MobileEmpty description="暂无推荐数据" />
				: (
					<div style={{ paddingBottom: 24 }}>
						<div style={{ marginTop: 12 }}>
							<MobileStatRow items={stats} />
						</div>

						{config.renderAlert && config.renderAlert(data)}

						<SectionTitle>📊 推荐个股</SectionTitle>
						<div style={{ padding: "0 16px" }}>
							{stocks.map((stock: any, i: number) => (
								<MobileStockCard
									key={stock.code || stock.stock_code || i}
									stock={stock}
								/>
							))}
						</div>
					</div>
				)}
		</MobileStrategyContainer>
	);
}
