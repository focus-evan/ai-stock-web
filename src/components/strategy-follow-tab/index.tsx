import type {
	DragonHeadLevelPerformanceSummary,
	StrategyFollowItem,
	StrategyFollowSnapshot,
	StrategyFollowType,
} from "#src/api/strategy";
import {
	closeStrategyFollow,
	fetchDragonHeadPerformanceSummary,
	fetchStrategyFollow,
	fetchStrategyFollowHistory,
	triggerStrategyAutoFollow,
	triggerStrategyFollowSnapshot,
} from "#src/api/strategy";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CheckCircleOutlined,
	FireFilled,
	PlusOutlined,
	ReloadOutlined,
	StarFilled,
	SyncOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Drawer,
	Empty,
	message,
	Modal,
	Row,
	Space,
	Spin,
	Statistic,
	Tag,
	Timeline,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text, Title } = Typography;

interface Props {
	strategyType: StrategyFollowType
	title?: string
	isOvernight?: boolean
}

function SummaryCard({
	title,
	summary,
	color,
}: {
	title: string
	summary: DragonHeadLevelPerformanceSummary
	color: string
}) {
	return (
		<Card size="small" title={<span style={{ color }}>{title}</span>}>
			<Row gutter={[8, 8]}>
				<Col span={12}><Statistic title="样本" value={summary.count} /></Col>
				<Col span={12}><Statistic title="T+3均值" value={summary.avg_day3_pct ?? 0} suffix="%" precision={2} /></Col>
				<Col span={12}><Statistic title="T+1胜率" value={summary.day1_win_rate ?? 0} suffix="%" precision={1} /></Col>
				<Col span={12}><Statistic title="T+3胜率" value={summary.day3_win_rate ?? 0} suffix="%" precision={1} /></Col>
			</Row>
		</Card>
	);
}

export default function StrategyFollowTab({ strategyType, title, isOvernight = false }: Props) {
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<StrategyFollowItem[]>([]);
	const [status, setStatus] = useState<"tracking" | "closed">("tracking");
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailItem, setDetailItem] = useState<StrategyFollowItem | null>(null);
	const [snapshots, setSnapshots] = useState<StrategyFollowSnapshot[]>([]);
	const [dragonSummary, setDragonSummary] = useState<null | {
		strong_recommend_summary: DragonHeadLevelPerformanceSummary
		recommend_summary: DragonHeadLevelPerformanceSummary
		comparison: {
			strong_minus_recommend_day3: number | null
			strong_minus_recommend_day3_win_rate: number | null
			optimization_hint: string
		}
		generated_at: string
	}>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetchStrategyFollow(strategyType, status);
			if (res.status === "success" && res.data) {
				setItems(res.data.items || []);
			}
			if (strategyType === "dragon_head") {
				const perf = await fetchDragonHeadPerformanceSummary(30);
				if (perf.status === "success" && perf.data) {
					setDragonSummary(perf.data);
				}
			}
		}
		catch {
			message.error("获取跟进列表失败");
		}
		finally {
			setLoading(false);
		}
	}, [strategyType, status]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleAutoAdd = async () => {
		try {
			const res = await triggerStrategyAutoFollow(strategyType);
			if (res.status === "success") {
				message.success(res.data?.message || "添加成功");
				fetchData();
			}
		}
		catch {
			message.error("添加失败");
		}
	};

	const handleSnapshot = async () => {
		try {
			await triggerStrategyFollowSnapshot(strategyType);
			message.success("快照更新任务已启动");
		}
		catch {
			message.error("快照更新失败");
		}
	};

	const handleClose = (id: number) => {
		Modal.confirm({
			title: "确认结束跟进",
			content: "结束后将不再跟踪该股票",
			onOk: async () => {
				try {
					await closeStrategyFollow(id);
					message.success("已结束跟进");
					fetchData();
				}
				catch {
					message.error("操作失败");
				}
			},
		});
	};

	const handleDetail = async (item: StrategyFollowItem) => {
		setDetailItem(item);
		setDetailOpen(true);
		try {
			const res = await fetchStrategyFollowHistory(item.id);
			if (res.status === "success" && res.data) {
				setSnapshots(res.data.snapshots || []);
			}
		}
		catch {
			message.error("获取详情失败");
		}
	};

	const wins = items.filter(i => (isOvernight ? (i.next_day_return_pct ?? 0) : (i.latest_return_pct ?? 0)) > 0).length;
	const avgReturn = items.length > 0
		? items.reduce((s, i) => s + (isOvernight ? (i.next_day_return_pct ?? 0) : (i.latest_return_pct ?? 0)), 0) / items.length
		: 0;
	const latestSnapshotDate = useMemo(() => {
		const dates = items.map(i => i.latest_snapshot_date).filter(Boolean) as string[];
		if (dates.length === 0)
			return null;
		return dates.sort().at(-1) || null;
	}, [items]);

	const displayTitle = title || (isOvernight ? "次日收益" : "推荐跟进");
	const isDragonHead = strategyType === "dragon_head";
	const dragonSummaryMessage = isDragonHead
		? "当前面板已按可执行核心买点收缩，只统计可执行龙头信号的跟进与表现。"
		: null;
	const autoAddButtonLabel = isDragonHead ? "从可执行信号添加" : "从推荐添加";
	const countTitle = isDragonHead ? "可执行跟进数" : "跟进数量";
	const avgReturnTitle = isOvernight ? "平均次日收益" : isDragonHead ? "平均执行收益" : "平均收益";

	return (
		<Spin spinning={loading}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space align="center">
					<Title level={4} style={{ margin: 0 }}>{displayTitle}</Title>
					<Tag color={status === "tracking" ? "processing" : "default"}>
						{status === "tracking" ? "跟进中" : "已结束"}
					</Tag>
					{!isOvernight && latestSnapshotDate && (
						<Tag color="green">
							已更新到收盘：
							{latestSnapshotDate}
						</Tag>
					)}
				</Space>
				<Space>
					<Button size="small" onClick={() => setStatus(status === "tracking" ? "closed" : "tracking")}>{status === "tracking" ? "查看已结束" : "查看跟进中"}</Button>
					{!isOvernight && (
						<Button size="small" icon={<SyncOutlined />} onClick={handleSnapshot}>更新快照</Button>
					)}
					<Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAutoAdd}>{autoAddButtonLabel}</Button>
					<Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
				</Space>
			</div>

			{strategyType === "dragon_head" && dragonSummary && (
				<>
					<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
						<Col xs={24} lg={12}>
							<SummaryCard title="强烈推荐可执行表现" summary={dragonSummary.strong_recommend_summary} color="#cf1322" />
						</Col>
						<Col xs={24} lg={12}>
							<SummaryCard title="推荐可执行表现" summary={dragonSummary.recommend_summary} color="#1677ff" />
						</Col>
					</Row>
					<Alert
						style={{ marginBottom: 16 }}
						message="龙头战法可执行信号效果摘要"
						description={(
							<Space direction="vertical" size={4} style={{ width: "100%" }}>
								<Text>{dragonSummary.comparison.optimization_hint}</Text>
								{dragonSummaryMessage ? <Text type="secondary">{dragonSummaryMessage}</Text> : null}
							</Space>
						)}
						type="info"
						showIcon
					/>
				</>
			)}

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col span={6}><Card size="small"><Statistic title={countTitle} value={items.length} /></Card></Col>
				<Col span={6}><Card size="small"><Statistic title="盈利数量" value={wins} valueStyle={{ color: "#cf1322" }} /></Card></Col>
				<Col span={6}><Card size="small"><Statistic title="胜率" value={items.length > 0 ? ((wins / items.length) * 100).toFixed(1) : 0} suffix="%" /></Card></Col>
				<Col span={6}><Card size="small"><Statistic title={avgReturnTitle} value={avgReturn.toFixed(2)} suffix="%" valueStyle={{ color: avgReturn >= 0 ? "#cf1322" : "#389e0d" }} prefix={avgReturn >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} /></Card></Col>
			</Row>

			{items.length === 0
				? <Empty description={isDragonHead ? "暂无可执行信号跟进数据" : "暂无跟进数据"} />
				: (
					<Row gutter={[12, 12]}>
						{items.map((item) => {
							const returnVal = isOvernight ? (item.next_day_return_pct ?? 0) : (item.latest_return_pct ?? 0);
							const isUp = returnVal > 0;
							return (
								<Col key={item.id} xs={24} sm={12} md={8} lg={6}>
									<Card size="small" hoverable onClick={() => handleDetail(item)} style={{ borderLeft: `3px solid ${isUp ? "#cf1322" : returnVal < 0 ? "#389e0d" : "#d9d9d9"}` }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div>
												<Text strong>{item.stock_name}</Text>
												<Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{item.stock_code}</Text>
											</div>
											<Tag color={item.recommendation_level === "强烈推荐" ? "red" : "blue"}>{item.recommendation_level}</Tag>
										</div>
										<div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>{isOvernight ? "次日收益" : "累计收益"}</Text>
											<Text strong style={{ color: isUp ? "#cf1322" : returnVal < 0 ? "#389e0d" : undefined }}>
												{returnVal > 0 ? "+" : ""}
												{returnVal.toFixed(2)}
												%
											</Text>
										</div>
										<div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>加入价</Text>
											<Text style={{ fontSize: 12 }}>{item.pick_price.toFixed(2)}</Text>
										</div>
										{!isOvernight && item.latest_price && (
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<Text type="secondary" style={{ fontSize: 12 }}>最新/收盘价</Text>
												<Text style={{ fontSize: 12 }}>{item.latest_price.toFixed(2)}</Text>
											</div>
										)}
										{item.latest_snapshot_date && (
											<Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
												快照日期：
												{item.latest_snapshot_date}
											</Text>
										)}
										<div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
											<span style={{ display: "flex", gap: 1 }}>
												{[1, 2, 3, 4, 5].map(i => <StarFilled key={i} style={{ fontSize: 10, color: i <= (item.recommendation_level === "强烈推荐" ? 5 : 3) ? "#faad14" : "#f0f0f0" }} />)}
											</span>
										</div>
										{(item.reasons || []).length > 0 && (
											<div style={{ marginTop: 6, padding: "4px 6px", background: "linear-gradient(135deg, #fffbe6, #fff7e6)", borderRadius: 4, border: "1px solid #ffe58f" }}>
												<div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
													<FireFilled style={{ fontSize: 10, color: "#fa8c16", marginTop: 2, flexShrink: 0 }} />
													<Text style={{ fontSize: 10, color: "#874d00", lineHeight: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{item.reasons[0]}</Text>
												</div>
											</div>
										)}
										{item.status === "closed" && (
											<Tag color="default" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>
												已结束
												{item.closed_date}
											</Tag>
										)}
										{item.status === "tracking" && !isOvernight && (
											<div style={{ marginTop: 6, textAlign: "right" }}>
												<Button
													size="small"
													danger
													onClick={(e) => {
														e.stopPropagation();
														handleClose(item.id);
													}}
												>
													结束跟进
												</Button>
											</div>
										)}
									</Card>
								</Col>
							);
						})}
					</Row>
				)}

			<Drawer
				title={detailItem ? `${detailItem.stock_name} (${detailItem.stock_code})` : ""}
				open={detailOpen}
				onClose={() => setDetailOpen(false)}
				width={480}
			>
				{detailItem && (
					<div>
						<Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
							<Col span={12}>
								<Text type="secondary">推荐等级</Text>
								<br />
								<Tag color={detailItem.recommendation_level === "强烈推荐" ? "red" : "blue"}>
									{detailItem.recommendation_level}
								</Tag>
							</Col>
							<Col span={12}>
								<Text type="secondary">加入日期</Text>
								<br />
								<Text>{detailItem.pick_date}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">加入价格</Text>
								<br />
								<Text>{detailItem.pick_price.toFixed(2)}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">累计收益</Text>
								<br />
								<Text style={{ color: (detailItem.latest_return_pct ?? 0) >= 0 ? "#cf1322" : "#389e0d" }}>
									{(detailItem.latest_return_pct ?? 0) > 0 ? "+" : ""}
									{(detailItem.latest_return_pct ?? 0).toFixed(2)}
									%
								</Text>
							</Col>
						</Row>
						{detailItem.reasons.length > 0 && (
							<div style={{ marginBottom: 16 }}>
								<Text type="secondary">推荐理由</Text>
								{detailItem.reasons.map(reason => (
									<div key={reason} style={{ marginTop: 4, padding: "4px 8px", background: "#fffbe6", borderRadius: 4 }}>
										<FireFilled style={{ color: "#fa8c16", marginRight: 4, fontSize: 11 }} />
										<Text style={{ fontSize: 12 }}>{reason}</Text>
									</div>
								))}
							</div>
						)}
						<Text type="secondary">价格走势</Text>
						{snapshots.length > 0
							? (
								<Timeline style={{ marginTop: 12 }}>
									{snapshots.map(snapshot => (
										<Timeline.Item key={snapshot.id} color={snapshot.total_return_pct >= 0 ? "red" : "green"}>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<Text>{snapshot.snapshot_date}</Text>
												<Space>
													<Text>{snapshot.close_price.toFixed(2)}</Text>
													<Text style={{ color: snapshot.total_return_pct >= 0 ? "#cf1322" : "#389e0d" }}>
														{snapshot.total_return_pct > 0 ? "+" : ""}
														{snapshot.total_return_pct.toFixed(2)}
														%
													</Text>
												</Space>
											</div>
										</Timeline.Item>
									))}
								</Timeline>
							)
							: (
								<Empty description="暂无快照数据" style={{ marginTop: 12 }} />
							)}
					</div>
				)}
			</Drawer>
		</Spin>
	);
}
