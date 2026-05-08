import type { PicksFollowItem, PicksFollowSnapshot } from "#src/api/strategy";
import {
	closePicksFollow,
	fetchPicksFollow,
	fetchPicksFollowHistory,
	fetchWeeklyReview,
	triggerAutoFollow,
	triggerPicksSnapshot,
} from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CalendarOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined,
	EyeOutlined,
	PlusOutlined,
	ReloadOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import {
	Button,
	Card,
	Col,
	Drawer,
	Empty,
	message,
	Modal,
	Row,
	Skeleton,
	Space,
	Statistic,
	Tag,
	Timeline,
	Tooltip,
	Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function DailyPicksFollow() {
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<PicksFollowItem[]>([]);
	const [status, setStatus] = useState<"tracking" | "closed">("tracking");
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailFollow, setDetailFollow] = useState<PicksFollowItem | null>(null);
	const [snapshots, setSnapshots] = useState<PicksFollowSnapshot[]>([]);
	const [reviewLoading, setReviewLoading] = useState(false);
	const [review, setReview] = useState<string>("");
	const [reviewSummary, setReviewSummary] = useState<any>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetchPicksFollow(status);
			if (res.status === "success" && res.data) {
				setItems(res.data.items || []);
			}
		}
		catch {
			message.error("获取跟进列表失败");
		}
		finally {
			setLoading(false);
		}
	}, [status]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleAutoAdd = async () => {
		try {
			const res = await triggerAutoFollow();
			if (res.status === "success") {
				message.success(res.data?.message || `添加了 ${res.data?.added} 只`);
				fetchData();
			}
			else {
				message.warning("未找到精选数据");
			}
		}
		catch {
			message.error("自动添加失败");
		}
	};

	const handleSnapshot = async () => {
		try {
			const res = await triggerPicksSnapshot();
			message.success(res.message || "快照更新已启动");
		}
		catch {
			message.error("快照触发失败");
		}
	};

	const handleDetail = async (item: PicksFollowItem) => {
		setDrawerOpen(true);
		setDetailLoading(true);
		setDetailFollow(item);
		try {
			const res = await fetchPicksFollowHistory(item.id);
			if (res.status === "success" && res.data) {
				setDetailFollow(res.data.follow);
				setSnapshots(res.data.snapshots || []);
			}
		}
		catch {
			message.error("获取详情失败");
		}
		finally {
			setDetailLoading(false);
		}
	};

	const handleClose = (item: PicksFollowItem) => {
		Modal.confirm({
			title: `确认结束跟进 ${item.stock_name}?`,
			onOk: async () => {
				try {
					await closePicksFollow(item.id, "手动结束");
					message.success("已结束跟进");
					fetchData();
					setDrawerOpen(false);
				}
				catch {
					message.error("操作失败");
				}
			},
		});
	};

	const handleWeeklyReview = async () => {
		setReviewLoading(true);
		try {
			const res = await fetchWeeklyReview();
			if (res.status === "success" && res.data) {
				setReview(res.data.review || "");
				setReviewSummary(res.data.summary);
			}
		}
		catch {
			message.error("获取周复盘失败");
		}
		finally {
			setReviewLoading(false);
		}
	};

	const wins = items.filter(i => (i.latest_return_pct ?? 0) > 0).length;
	const avgReturn = items.length > 0 ? items.reduce((s, i) => s + (i.latest_return_pct ?? 0), 0) / items.length : 0;

	return (
		<BasicContent>
			<div style={{ padding: "0 0 24px 0" }}>
				{/* Header */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<Space align="center">
						<EyeOutlined style={{ fontSize: 24, color: "#1890ff" }} />
						<Title level={4} style={{ margin: 0 }}>精选跟进</Title>
						<Tag color={status === "tracking" ? "processing" : "default"}>
							{status === "tracking" ? "跟进中" : "已结束"}
						</Tag>
					</Space>
					<Space>
						<Button
							size="small"
							onClick={() => setStatus(status === "tracking" ? "closed" : "tracking")}
						>
							{status === "tracking" ? "查看已结束" : "查看跟进中"}
						</Button>
						<Button icon={<PlusOutlined />} onClick={handleAutoAdd}>
							从精选添加
						</Button>
						<Button icon={<SyncOutlined />} onClick={handleSnapshot}>
							更新快照
						</Button>
						<Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
							刷新
						</Button>
					</Space>
				</div>

				{/* Stats */}
				{status === "tracking" && items.length > 0 && (
					<Row gutter={16} style={{ marginBottom: 16 }}>
						<Col span={6}>
							<Card size="small">
								<Statistic title="跟进数量" value={items.length} suffix="只" valueStyle={{ color: "#1890ff" }} />
							</Card>
						</Col>
						<Col span={6}>
							<Card size="small">
								<Statistic
									title="盈利数量"
									value={wins}
									suffix={`/ ${items.length}`}
									valueStyle={{ color: "#52c41a" }}
								/>
							</Card>
						</Col>
						<Col span={6}>
							<Card size="small">
								<Statistic
									title="胜率"
									value={items.length > 0 ? ((wins / items.length) * 100).toFixed(1) : 0}
									suffix="%"
									valueStyle={{ color: wins / items.length >= 0.5 ? "#52c41a" : "#f5222d" }}
								/>
							</Card>
						</Col>
						<Col span={6}>
							<Card size="small">
								<Statistic
									title="平均收益"
									value={avgReturn.toFixed(2)}
									suffix="%"
									prefix={avgReturn >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
									valueStyle={{ color: avgReturn >= 0 ? "#f5222d" : "#52c41a" }}
								/>
							</Card>
						</Col>
					</Row>
				)}

				{/* Stock Cards */}
				{loading && !items.length
					? (
						<Skeleton active paragraph={{ rows: 6 }} />
					)
					: items.length === 0
						? (
							<Empty description={status === "tracking" ? "暂无跟进股票，点击「从精选添加」开始" : "暂无已结束的跟进记录"}>
								{status === "tracking" && (
									<Button type="primary" icon={<PlusOutlined />} onClick={handleAutoAdd}>
										从当日精选添加
									</Button>
								)}
							</Empty>
						)
						: (
							<Row gutter={[16, 16]}>
								{items.map((item) => {
									const ret = item.latest_return_pct ?? 0;
									const isUp = ret >= 0;
									return (
										<Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
											<Card
												hoverable
												size="small"
												onClick={() => handleDetail(item)}
												styles={{
													body: { padding: "16px" },
												}}
												style={{
													borderLeft: `3px solid ${isUp ? "#f5222d" : "#52c41a"}`,
												}}
											>
												<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
													<div>
														<Text strong style={{ fontSize: 16 }}>{item.stock_name}</Text>
														<br />
														<Text type="secondary" style={{ fontSize: 12 }}>{item.stock_code}</Text>
													</div>
													<div style={{ textAlign: "right" }}>
														<div style={{ fontSize: 20, fontWeight: 700, color: isUp ? "#f5222d" : "#52c41a" }}>
															{isUp ? "+" : ""}
															{ret.toFixed(2)}
															%
														</div>
														<Text type="secondary" style={{ fontSize: 11 }}>累计收益</Text>
													</div>
												</div>

												<div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
													<span>
														<CalendarOutlined style={{ marginRight: 4 }} />
														{item.pick_date}
													</span>
													<span>
														入场价: ¥
														{item.pick_price?.toFixed(2)}
													</span>
												</div>

												{item.latest_price != null && (
													<div style={{ marginTop: 4, fontSize: 12, color: "#8c8c8c" }}>
														最新: ¥
														{item.latest_price.toFixed(2)}
														{item.latest_change_pct != null && (
															<span style={{ marginLeft: 8, color: item.latest_change_pct >= 0 ? "#f5222d" : "#52c41a" }}>
																今日
																{" "}
																{item.latest_change_pct >= 0 ? "+" : ""}
																{item.latest_change_pct.toFixed(2)}
																%
															</span>
														)}
													</div>
												)}

												<div style={{ marginTop: 8 }}>
													{(item.strategy_names || []).slice(0, 3).map(s => (
														<Tag key={s} style={{ fontSize: 11, marginBottom: 2 }}>{s}</Tag>
													))}
												</div>

												{item.status === "closed" && (
													<Tag color="default" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>
														已结束
														{" "}
														{item.closed_date}
													</Tag>
												)}
											</Card>
										</Col>
									);
								})}
							</Row>
						)}

				{/* Weekly Review */}
				<Card
					title={(
						<Space>
							<CalendarOutlined style={{ color: "#722ed1" }} />
							<span>周复盘报告</span>
						</Space>
					)}
					style={{ marginTop: 24 }}
					extra={(
						<Button onClick={handleWeeklyReview} loading={reviewLoading} icon={<ReloadOutlined />}>
							生成复盘
						</Button>
					)}
				>
					{reviewSummary && (
						<Row gutter={16} style={{ marginBottom: 16 }}>
							<Col span={8}>
								<Statistic title="本周跟进" value={reviewSummary.stock_count || 0} suffix="只" />
							</Col>
							<Col span={8}>
								<Statistic title="周期" value={`${reviewSummary.week_start || ""} ~ ${reviewSummary.week_end || ""}`} valueStyle={{ fontSize: 14 }} />
							</Col>
						</Row>
					)}
					{review
						? (
							<div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 14 }}>
								{review.split("\n").map((line, idx) => {
									const key = `review-${idx}`;
									if (line.startsWith("## "))
										return <Title key={key} level={4} style={{ margin: "16px 0 8px" }}>{line.replace("## ", "")}</Title>;
									if (line.startsWith("### "))
										return <Title key={key} level={5} style={{ margin: "12px 0 6px" }}>{line.replace("### ", "")}</Title>;
									if (line.startsWith("**"))
										return <Paragraph key={key} strong style={{ marginBottom: 4 }}>{line.replace(/\*\*/g, "")}</Paragraph>;
									if (line.trim() === "")
										return <br key={key} />;
									return <Paragraph key={key} style={{ marginBottom: 4 }}>{line}</Paragraph>;
								})}
							</div>
						)
						: (
							<Text type="secondary">点击「生成复盘」获取本周跟进股票的AI复盘分析报告</Text>
						)}
				</Card>
			</div>

			{/* Detail Drawer */}
			<Drawer
				title={detailFollow ? `${detailFollow.stock_name} (${detailFollow.stock_code})` : "详情"}
				open={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				width={520}
				extra={
					detailFollow?.status === "tracking" && (
						<Button danger icon={<CloseCircleOutlined />} onClick={() => detailFollow && handleClose(detailFollow)}>
							结束跟进
						</Button>
					)
				}
			>
				{detailLoading
					? (
						<Skeleton active />
					)
					: detailFollow
						? (
							<>
								<Card size="small" style={{ marginBottom: 16 }}>
									<Row gutter={16}>
										<Col span={12}>
											<Statistic title="入场价" value={detailFollow.pick_price} prefix="¥" precision={2} />
										</Col>
										<Col span={12}>
											<Statistic
												title="累计收益"
												value={detailFollow.latest_return_pct ?? 0}
												suffix="%"
												precision={2}
												valueStyle={{ color: (detailFollow.latest_return_pct ?? 0) >= 0 ? "#f5222d" : "#52c41a" }}
											/>
										</Col>
									</Row>
									<div style={{ marginTop: 12 }}>
										<Text type="secondary">
											加入日期:
											{detailFollow.pick_date}
										</Text>
										<br />
										<Text type="secondary">
											来自战法:
											{(detailFollow.strategy_names || []).join("、")}
										</Text>
									</div>
								</Card>

								{/* Reasons */}
								<Card size="small" title="推荐理由" style={{ marginBottom: 16 }}>
									{(detailFollow.pick_reasons || []).length > 0
										? (
											(detailFollow.pick_reasons || []).map((r, i) => (
												<Paragraph key={`reason-${i}`} style={{ marginBottom: 4, fontSize: 13 }}>
													•
													{" "}
													{r}
												</Paragraph>
											))
										)
										: (
											<Text type="secondary">无推荐理由记录</Text>
										)}
								</Card>

								{/* Price Timeline */}
								<Card size="small" title={`价格走势 (${snapshots.length}天)`}>
									{snapshots.length > 0
										? (
											<Timeline
												items={[...snapshots].reverse().slice(0, 20).map(s => ({
													color: s.total_return_pct >= 0 ? "red" : "green",
													children: (
														<div style={{ display: "flex", justifyContent: "space-between" }}>
															<Text>{s.snapshot_date}</Text>
															<Space>
																<Text>
																	¥
																	{s.close_price?.toFixed(2)}
																</Text>
																<Text style={{ color: s.change_pct >= 0 ? "#f5222d" : "#52c41a" }}>
																	{s.change_pct >= 0 ? "+" : ""}
																	{s.change_pct?.toFixed(2)}
																	%
																</Text>
																<Tooltip title="累计收益">
																	<Tag color={s.total_return_pct >= 0 ? "red" : "green"}>
																		{s.total_return_pct >= 0 ? "+" : ""}
																		{s.total_return_pct?.toFixed(2)}
																		%
																	</Tag>
																</Tooltip>
															</Space>
														</div>
													),
												}))}
											/>
										)
										: (
											<Text type="secondary">暂无快照数据，请先点击「更新快照」</Text>
										)}
								</Card>
							</>
						)
						: null}
			</Drawer>
		</BasicContent>
	);
}
