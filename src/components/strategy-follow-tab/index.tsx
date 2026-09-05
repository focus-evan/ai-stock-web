import type {
	StrategyFollowItem,
	StrategyFollowSnapshot,
	StrategyFollowSummary,
	StrategyFollowType,
} from "#src/api/strategy";
import {
	closeStrategyFollow,
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
	Segmented,
	Space,
	Spin,
	Statistic,
	Tag,
	Timeline,
	Typography,
} from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Text, Title } = Typography;

function formatDateTime(value?: string) {
	if (!value)
		return "--";
	return value.replace("T", " ").slice(0, 19);
}

interface Props {
	strategyType: StrategyFollowType
	title?: string
	isOvernight?: boolean
}

export default function StrategyFollowTab({ strategyType, title, isOvernight = false }: Props) {
	const [loading, setLoading] = useState(false);
	const [autoAddLoading, setAutoAddLoading] = useState(false);
	const [snapshotLoading, setSnapshotLoading] = useState(false);
	const [allItems, setAllItems] = useState<StrategyFollowItem[]>([]);
	const [summary, setSummary] = useState<StrategyFollowSummary | null>(null);
	const [status, setStatus] = useState<"tracking" | "closed">("tracking");
	const [followTypeFilter, setFollowTypeFilter] = useState<"trade" | "watch">("trade");
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailItem, setDetailItem] = useState<StrategyFollowItem | null>(null);
	const [snapshots, setSnapshots] = useState<StrategyFollowSnapshot[]>([]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			// 始终获取完整列表，在前端切换两类跟进。这样分类计数不会因当前
			// 筛选条件而归零，并且所有战法都使用完全相同的展示口径。
			const res = await fetchStrategyFollow(strategyType, status);
			if (res.status === "success" && res.data) {
				setAllItems(res.data.items || []);
				setSummary(res.data.summary || null);
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
		setAutoAddLoading(true);
		try {
			const res = await triggerStrategyAutoFollow(strategyType);
			if (res.status === "success") {
				message.success(res.data?.message || "添加成功");
				await fetchData();
			}
		}
		catch {
			message.error("添加失败");
		}
		finally {
			setAutoAddLoading(false);
		}
	};

	const handleSnapshot = async () => {
		setSnapshotLoading(true);
		try {
			const res = await triggerStrategyFollowSnapshot(strategyType);
			if (res.status === "success") {
				message.success(res.message || `快照更新完成，共更新 ${res.data?.updated ?? 0} 只`);
				await fetchData();
			}
			else {
				message.error(res.message || "快照更新失败");
			}
		}
		catch {
			message.error("快照更新失败");
		}
		finally {
			setSnapshotLoading(false);
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
				setDetailItem(res.data.follow);
				setSnapshots(res.data.snapshots || []);
			}
		}
		catch {
			message.error("获取详情失败");
		}
	};

	const items = useMemo(
		() => allItems.filter(item => (
			followTypeFilter === "watch"
				? item.follow_type === "watch"
				: item.follow_type !== "watch"
		)),
		[allItems, followTypeFilter],
	);
	const selectedPerformance = followTypeFilter === "watch"
		? summary?.watch_performance
		: summary?.trade_performance;
	const fixedPerformance = followTypeFilter === "watch"
		? summary?.fixed_watch_performance
		: summary?.fixed_trade_performance;
	const wins = fixedPerformance?.win_count ?? 0;
	const overallReturn = fixedPerformance?.avg_return_pct ?? null;
	const pricedCount = fixedPerformance?.sample_count ?? 0;
	const winRate = fixedPerformance?.win_rate_pct ?? null;
	const latestSnapshotDate = useMemo(() => {
		if (selectedPerformance?.latest_snapshot_date)
			return selectedPerformance.latest_snapshot_date;
		const dates = items.map(i => i.latest_snapshot_date).filter(Boolean) as string[];
		if (dates.length === 0)
			return null;
		return dates.sort().at(-1) || null;
	}, [items, selectedPerformance?.latest_snapshot_date]);

	const displayTitle = title || (isOvernight ? "次日收益" : "推荐跟进");
	const isDragonHead = strategyType === "dragon_head";
	const autoAddButtonLabel = isDragonHead
		? "同步可执行信号"
		: "同步交易/推荐跟进";
	const countTitle = followTypeFilter === "watch" ? "推荐跟进数" : "交易跟进数";
	const overallReturnTitle = "固定周期信号平均收益";
	const winsTitle = "成熟信号盈利数";
	const winRateTitle = followTypeFilter === "watch" ? "固定周期观察上涨率" : "固定周期推荐胜率";

	return (
		<Spin spinning={loading}>
			<Alert
				style={{ marginBottom: 16 }}
				type="info"
				showIcon
				message={`${summary?.settlement_horizon_days ?? "待确认"}个交易日 / ${summary?.settlement_mode === "next_day_open" ? "次日开盘" : "到期收盘"}，成熟样本${pricedCount}条`}
				description={`历史重建已排除${summary?.excluded_reconstruction_count ?? 0}条；缺失和未成熟记录不按0%计入。下面卡片的最新涨跌幅仅是跟进参考，不是已成交利润。`}
			/>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
				<Space align="center" wrap>
					<Title level={4} style={{ margin: 0 }}>{displayTitle}</Title>
					<Tag color={status === "tracking" ? "processing" : "default"}>
						{status === "tracking" ? "跟进中" : "已结束"}
					</Tag>
					{status === "tracking" && (
						<Tag color="blue">自动择优持续跟进</Tag>
					)}
					<Tag color="red">
						交易：
						{summary?.trade_count ?? allItems.filter(item => item.follow_type !== "watch").length}
					</Tag>
					<Tag color="gold">
						推荐：
						{summary?.watch_count ?? allItems.filter(item => item.follow_type === "watch").length}
					</Tag>
					{!isOvernight && latestSnapshotDate && (
						<Tag color="green">
							已更新到收盘：
							{latestSnapshotDate}
						</Tag>
					)}
					{!isOvernight && items.length > 0 && (
						<Tag color={pricedCount === items.length ? "green" : "orange"}>
							行情覆盖：
							{pricedCount}
							/
							{items.length}
						</Tag>
					)}
				</Space>
				<Space>
					<Button size="small" onClick={() => setStatus(status === "tracking" ? "closed" : "tracking")}>{status === "tracking" ? "查看已结束" : "查看跟进中"}</Button>
					{!isOvernight && (
						<Button size="small" loading={snapshotLoading} icon={<SyncOutlined />} onClick={handleSnapshot}>更新快照</Button>
					)}
					<Button size="small" type="primary" loading={autoAddLoading} icon={<PlusOutlined />} onClick={handleAutoAdd}>{autoAddButtonLabel}</Button>
					<Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
				</Space>
			</div>

			<div style={{ marginBottom: 16 }}>
				<Space wrap>
					<Text strong>跟进类型</Text>
					<Segmented
						value={followTypeFilter}
						onChange={value => setFollowTypeFilter(value as "trade" | "watch")}
						options={[
							{ label: "交易跟进", value: "trade" },
							{ label: "推荐跟进", value: "watch" },
						]}
					/>
					<Text type="secondary">
						交易跟进单独计算交易胜率；推荐跟进记录尚未成交、仍待条件触发的候选，两类收益不混算
					</Text>
				</Space>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title={countTitle} value={items.length} /></Card></Col>
				<Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title={winsTitle} value={wins} valueStyle={{ color: "#cf1322" }} /></Card></Col>
				<Col xs={24} sm={12} lg={6}><Card size="small"><Statistic title={winRateTitle} value={winRate == null ? "--" : winRate.toFixed(1)} suffix={winRate == null ? undefined : "%"} /></Card></Col>
				<Col xs={24} sm={12} lg={6}>
					<Card size="small">
						<Statistic
							title={overallReturnTitle}
							value={overallReturn == null ? "--" : overallReturn.toFixed(2)}
							suffix={overallReturn == null ? undefined : "%"}
							valueStyle={{ color: overallReturn == null ? undefined : overallReturn >= 0 ? "#cf1322" : "#389e0d" }}
							prefix={overallReturn == null ? undefined : overallReturn >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
						/>
					</Card>
				</Col>
			</Row>

			{items.length === 0
				? <Empty description={followTypeFilter === "watch" ? "暂无推荐跟进数据" : isDragonHead ? "暂无可执行交易信号" : "暂无交易跟进数据"} />
				: (
					<Row gutter={[12, 12]}>
						{items.map((item) => {
							const rawReturn = isOvernight ? item.next_day_return_pct : item.latest_return_pct;
							const hasReturn = rawReturn != null;
							const returnVal = rawReturn ?? 0;
							const isUp = hasReturn && returnVal > 0;
							return (
								<Col key={item.id} xs={24} sm={12} md={8} lg={6}>
									<Card size="small" hoverable onClick={() => handleDetail(item)} style={{ borderLeft: `3px solid ${isUp ? "#cf1322" : hasReturn && returnVal < 0 ? "#389e0d" : "#d9d9d9"}` }}>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div>
												<Text strong>{item.stock_name}</Text>
												<Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{item.stock_code}</Text>
											</div>
											<Space size={4}>
												<Tag color={item.follow_type === "watch" ? "gold" : "red"}>
													{item.follow_type === "watch" ? "推荐跟进" : "交易跟进"}
												</Tag>
												<Tag color={item.recommendation_level === "强烈推荐" ? "red" : item.recommendation_level === "关注" ? "gold" : "blue"}>{item.recommendation_level}</Tag>
											</Space>
										</div>
										<div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>
												{isOvernight ? "次日收益" : item.follow_type === "watch" ? "推荐后涨跌" : "交易后收益"}
											</Text>
											<Text strong style={{ color: isUp ? "#cf1322" : hasReturn && returnVal < 0 ? "#389e0d" : undefined }}>
												{hasReturn
													? `${returnVal > 0 ? "+" : ""}${returnVal.toFixed(2)}%`
													: "--"}
											</Text>
										</div>
										<div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>{item.follow_type === "watch" ? "推荐价" : "交易信号价"}</Text>
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
										<Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
											推荐时间：
											{formatDateTime(item.recommended_at)}
											{item.evidence_label && <Tag color={item.performance_eligible === false ? "orange" : "default"}>{item.evidence_label}</Tag>}
										</Text>
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
								<Text type="secondary">跟进类型</Text>
								<br />
								<Tag color={detailItem.follow_type === "watch" ? "gold" : "red"}>
									{detailItem.follow_type === "watch" ? "推荐跟进" : "交易跟进"}
								</Tag>
							</Col>
							<Col span={12}>
								<Text type="secondary">推荐时间</Text>
								<br />
								<Text>{formatDateTime(detailItem.recommended_at)}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">加入价格</Text>
								<br />
								<Text>{detailItem.pick_price.toFixed(2)}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">累计收益</Text>
								<br />
								<Text style={{ color: detailItem.latest_return_pct == null ? undefined : detailItem.latest_return_pct >= 0 ? "#cf1322" : "#389e0d" }}>
									{detailItem.latest_return_pct == null
										? "--"
										: `${detailItem.latest_return_pct > 0 ? "+" : ""}${detailItem.latest_return_pct.toFixed(2)}%`}
								</Text>
							</Col>
						</Row>
						{detailItem.feature_snapshot?.execution_plan && (
							<div style={{ marginBottom: 16, padding: 12, background: detailItem.follow_type === "watch" ? "#fffbe6" : "#fff1f0", borderRadius: 6 }}>
								<Text strong>{detailItem.follow_type === "watch" ? "观察转买条件" : "执行计划"}</Text>
								<div style={{ marginTop: 6 }}>
									<Text>{detailItem.feature_snapshot.execution_plan.buy_signal || detailItem.feature_snapshot.price_trigger || "等待下一检查点确认"}</Text>
								</div>
								{detailItem.feature_snapshot.execution_plan.observation_focus && (
									<div style={{ marginTop: 4 }}>
										<Text type="secondary">{detailItem.feature_snapshot.execution_plan.observation_focus}</Text>
									</div>
								)}
								{(detailItem.feature_snapshot.execution_plan.trigger_checklist || []).length > 0 && (
									<Space wrap size={[4, 4]} style={{ marginTop: 8 }}>
										{detailItem.feature_snapshot.execution_plan.trigger_checklist?.map(item => (
											<Tag key={item}>{item}</Tag>
										))}
									</Space>
								)}
								{detailItem.feature_snapshot.execution_plan.risk_stop && (
									<div style={{ marginTop: 8 }}>
										<Text type="danger">
											失效：
											{detailItem.feature_snapshot.execution_plan.risk_stop}
										</Text>
									</div>
								)}
							</div>
						)}
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
