import type { RecommendationCacheRecent, RecommendationCacheStat } from "#src/api/system";

import {
	clearCache,
	clearRecommendationCache,
	getCacheStats,
	getRecommendationCache,
} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	ClearOutlined,
	DatabaseOutlined,
	DeleteOutlined,
	PieChartOutlined,
	ReloadOutlined,
	RocketOutlined,
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
	Table,
	Tag,
	Typography,
} from "antd";
import { useState } from "react";

const { Text } = Typography;

/** 策略标签 */
function strategyTag(type: string) {
	const map: Record<string, { label: string, color: string }> = {
		dragon_head: { label: "🐉 龙头战法", color: "magenta" },
		event_driven: { label: "📡 事件驱动", color: "orange" },
		sentiment: { label: "💡 情绪战法", color: "blue" },
	};
	const item = map[type] || { label: type, color: "default" };
	return <Tag color={item.color}>{item.label}</Tag>;
}

/** 会话标签 */
function sessionTag(type: string) {
	return type === "morning"
		? <Tag color="cyan">上午</Tag>
		: type === "afternoon"
			? <Tag color="gold">下午</Tag>
			: <Tag>{type}</Tag>;
}

export default function CachePage() {
	const [selectedCacheType, setSelectedCacheType] = useState<string>("all");

	// Agent 缓存统计
	const {
		data: cacheStats,
		loading: statsLoading,
		refresh: refreshStats,
	} = useRequest(getCacheStats);

	// 推荐缓存
	const {
		data: recCache,
		loading: recLoading,
		refresh: refreshRec,
	} = useRequest(
		async () => {
			const res = await getRecommendationCache();
			return (res as any)?.result || res;
		},
	);

	// 清除 Agent 缓存
	const { run: handleClearCache, loading: clearLoading } = useRequest(
		async (cacheType: string) => {
			return await clearCache({ cache_type: cacheType as any });
		},
		{
			manual: true,
			onSuccess: () => {
				message.success("缓存已清除");
				refreshStats();
			},
			onError: () => message.error("清除缓存失败"),
		},
	);

	// 清除推荐缓存
	const { run: handleClearRecCache, loading: clearRecLoading } = useRequest(
		async (strategyType?: string) => {
			return await clearRecommendationCache(strategyType);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success("推荐缓存已清除");
				refreshRec();
			},
			onError: () => message.error("清除推荐缓存失败"),
		},
	);

	const calculateHitRate = (hits: number, misses: number) => {
		const total = hits + misses;
		if (total === 0)
			return 0;
		return Number.parseFloat(((hits / total) * 100).toFixed(2));
	};

	const recStats: RecommendationCacheStat[] = recCache?.stats || [];
	const recRecent: RecommendationCacheRecent[] = recCache?.recent || [];

	const recColumns = [
		{
			title: "策略",
			dataIndex: "strategy_type",
			key: "strategy_type",
			width: 140,
			render: (v: string) => strategyTag(v),
		},
		{
			title: "日期",
			dataIndex: "trading_date",
			key: "trading_date",
			width: 110,
		},
		{
			title: "时段",
			dataIndex: "session_type",
			key: "session_type",
			width: 80,
			render: (v: string) => sessionTag(v),
		},
		{
			title: "推荐数",
			dataIndex: "stock_count",
			key: "stock_count",
			width: 80,
			align: "center" as const,
			render: (v: number) => <Tag color="geekblue">{v}</Tag>,
		},
		{
			title: "生成时间",
			dataIndex: "generated_at",
			key: "generated_at",
			width: 170,
			render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
		},
	];

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* ==================== 推荐缓存管理 ==================== */}
				<Card
					title={(
						<Space>
							<RocketOutlined style={{ color: "#722ed1" }} />
							<span>策略推荐缓存</span>
						</Space>
					)}
					extra={(
						<Space>
							<Popconfirm
								title="确认清除所有推荐缓存？"
								description="此操作不可撤销，新推荐将在下次定时任务时重新生成"
								onConfirm={() => handleClearRecCache()}
							>
								<Button
									danger
									icon={<DeleteOutlined />}
									loading={clearRecLoading}
									size="small"
								>
									全部清除
								</Button>
							</Popconfirm>
							<Button icon={<ReloadOutlined />} onClick={refreshRec} loading={recLoading} size="small">
								刷新
							</Button>
						</Space>
					)}
				>
					{/* 策略缓存统计 */}
					{recStats.length > 0 && (
						<Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
							{recStats.map(stat => (
								<Col xs={24} sm={8} key={stat.strategy_type}>
									<Card
										size="small"
										style={{
											borderRadius: 10,
											background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
										}}
									>
										<div style={{ marginBottom: 8 }}>{strategyTag(stat.strategy_type)}</div>
										<Row gutter={8}>
											<Col span={8}>
												<Statistic title="记录数" value={stat.total_records} valueStyle={{ fontSize: 18 }} />
											</Col>
											<Col span={8}>
												<Statistic title="推荐股票" value={stat.total_stocks} valueStyle={{ fontSize: 18, color: "#1890ff" }} />
											</Col>
											<Col span={8}>
												<Text type="secondary" style={{ fontSize: 11 }}>
													{stat.earliest_date}
													<br />
													~
													{stat.latest_date}
												</Text>
											</Col>
										</Row>
									</Card>
								</Col>
							))}
						</Row>
					)}

					{/* 最近推荐记录 */}
					<Table
						columns={recColumns}
						dataSource={recRecent}
						rowKey="id"
						pagination={false}
						size="small"
						locale={{ emptyText: "暂无推荐缓存数据" }}
					/>
				</Card>

				{/* ==================== Agent 缓存管理 ==================== */}
				<Card
					title={(
						<Space>
							<DatabaseOutlined />
							<span>Agent 缓存统计</span>
						</Space>
					)}
					extra={(
						<Button icon={<ReloadOutlined />} onClick={refreshStats} loading={statsLoading} size="small">
							刷新
						</Button>
					)}
				>
					{cacheStats && (
						<Row gutter={[16, 16]}>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title="总缓存项"
									value={cacheStats.total_keys || cacheStats.total_items || 0}
									prefix={<DatabaseOutlined />}
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title="缓存大小"
									value={cacheStats.total_size || cacheStats.total_size_mb || 0}
									suffix="MB"
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title="命中次数"
									value={cacheStats.hits || 0}
									valueStyle={{ color: "#52c41a" }}
								/>
							</Col>
							<Col xs={24} sm={12} md={6}>
								<Statistic
									title="未命中"
									value={cacheStats.misses || 0}
									valueStyle={{ color: "#ff4d4f" }}
								/>
							</Col>
						</Row>
					)}
				</Card>

				{/* 命中率 */}
				{cacheStats && (
					<Card
						title={(
							<Space>
								<PieChartOutlined />
								<span>缓存命中率</span>
							</Space>
						)}
					>
						<Row gutter={[16, 16]}>
							<Col xs={24} md={12}>
								<div style={{ marginBottom: 16 }}>
									<div style={{ fontSize: 16, marginBottom: 8 }}>整体命中率</div>
									<Progress
										percent={calculateHitRate(cacheStats.hits || 0, cacheStats.misses || 0)}
										status="active"
										strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
									/>
								</div>
							</Col>
							<Col xs={24} md={12}>
								<Space direction="vertical" style={{ width: "100%" }}>
									<div style={{ fontSize: 16, marginBottom: 8 }}>分类明细</div>
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
												percent={calculateHitRate(stats.hits || 0, stats.misses || 0)}
												size="small"
											/>
										</div>
									))}
								</Space>
							</Col>
						</Row>
					</Card>
				)}

				{/* 清除缓存 */}
				<Card
					title={(
						<Space>
							<ClearOutlined />
							<span>清除 Agent 缓存</span>
						</Space>
					)}
				>
					<Space direction="vertical" style={{ width: "100%" }}>
						<div style={{ color: "#666", marginBottom: 16 }}>
							选择缓存类型进行清除，此操作不可撤销。
						</div>
						<Space>
							<Select
								style={{ width: 200 }}
								value={selectedCacheType}
								onChange={setSelectedCacheType}
							>
								<Select.Option value="all">全部缓存</Select.Option>
								<Select.Option value="stock">股票缓存</Select.Option>
								<Select.Option value="ipo">IPO 缓存</Select.Option>
								<Select.Option value="rag">RAG 缓存</Select.Option>
								<Select.Option value="document">文档缓存</Select.Option>
							</Select>
							<Popconfirm
								title="确认清除缓存？"
								description="此操作不可撤销。"
								onConfirm={() => handleClearCache(selectedCacheType)}
							>
								<Button
									type="primary"
									danger
									icon={<ClearOutlined />}
									loading={clearLoading}
								>
									清除缓存
								</Button>
							</Popconfirm>
						</Space>
					</Space>
				</Card>
			</Space>
		</BasicContent>
	);
}
