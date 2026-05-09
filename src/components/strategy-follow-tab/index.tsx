import type { StrategyFollowItem, StrategyFollowSnapshot, StrategyFollowType } from "#src/api/strategy";
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
import { useCallback, useEffect, useState } from "react";

const { Text, Title } = Typography;

interface Props {
	strategyType: StrategyFollowType
	title?: string
	isOvernight?: boolean
}

export default function StrategyFollowTab({ strategyType, title, isOvernight = false }: Props) {
	const [loading, setLoading] = useState(false);
	const [items, setItems] = useState<StrategyFollowItem[]>([]);
	const [status, setStatus] = useState<"tracking" | "closed">("tracking");
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailItem, setDetailItem] = useState<StrategyFollowItem | null>(null);
	const [snapshots, setSnapshots] = useState<StrategyFollowSnapshot[]>([]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetchStrategyFollow(strategyType, status);
			if (res.status === "success" && res.data) {
				setItems(res.data.items || []);
			}
		}
		catch {
			message.error("\u83B7\u53D6\u8DDF\u8FDB\u5217\u8868\u5931\u8D25");
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
				message.success(res.data?.message || "\u6DFB\u52A0\u6210\u529F");
				fetchData();
			}
		}
		catch {
			message.error("\u6DFB\u52A0\u5931\u8D25");
		}
	};

	const handleSnapshot = async () => {
		try {
			await triggerStrategyFollowSnapshot(strategyType);
			message.success("\u5FEB\u7167\u66F4\u65B0\u4EFB\u52A1\u5DF2\u542F\u52A8");
		}
		catch {
			message.error("\u5FEB\u7167\u66F4\u65B0\u5931\u8D25");
		}
	};

	const handleClose = (id: number) => {
		Modal.confirm({
			title: "\u786E\u8BA4\u7ED3\u675F\u8DDF\u8FDB",
			content: "\u7ED3\u675F\u540E\u5C06\u4E0D\u518D\u8DDF\u8E2A\u8BE5\u80A1\u7968",
			onOk: async () => {
				try {
					await closeStrategyFollow(id);
					message.success("\u5DF2\u7ED3\u675F\u8DDF\u8FDB");
					fetchData();
				}
				catch {
					message.error("\u64CD\u4F5C\u5931\u8D25");
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
			message.error("\u83B7\u53D6\u8BE6\u60C5\u5931\u8D25");
		}
	};

	const wins = items.filter(i => (isOvernight ? (i.next_day_return_pct ?? 0) : (i.latest_return_pct ?? 0)) > 0).length;
	const avgReturn = items.length > 0
		? items.reduce((s, i) => s + (isOvernight ? (i.next_day_return_pct ?? 0) : (i.latest_return_pct ?? 0)), 0) / items.length
		: 0;

	const displayTitle = title || (isOvernight ? "\u6B21\u65E5\u6536\u76CA" : "\u63A8\u8350\u8DDF\u8FDB");

	return (
		<Spin spinning={loading}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space align="center">
					<Title level={4} style={{ margin: 0 }}>{displayTitle}</Title>
					<Tag color={status === "tracking" ? "processing" : "default"}>
						{status === "tracking" ? "\u8DDF\u8FDB\u4E2D" : "\u5DF2\u7ED3\u675F"}
					</Tag>
				</Space>
				<Space>
					<Button size="small" onClick={() => setStatus(status === "tracking" ? "closed" : "tracking")}>
						{status === "tracking" ? "\u67E5\u770B\u5DF2\u7ED3\u675F" : "\u67E5\u770B\u8DDF\u8FDB\u4E2D"}
					</Button>
					{!isOvernight && (
						<Button size="small" icon={<SyncOutlined />} onClick={handleSnapshot}>
							{"\u66F4\u65B0\u5FEB\u7167"}
						</Button>
					)}
					<Button size="small" type="primary" icon={<PlusOutlined />} onClick={handleAutoAdd}>
						{"\u4ECE\u63A8\u8350\u6DFB\u52A0"}
					</Button>
					<Button size="small" icon={<ReloadOutlined />} onClick={fetchData}>
						{"\u5237\u65B0"}
					</Button>
				</Space>
			</div>

			<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
				<Col span={6}>
					<Card size="small">
						<Statistic title={"\u8DDF\u8FDB\u6570\u91CF"} value={items.length} />
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small">
						<Statistic title={"\u76C8\u5229\u6570\u91CF"} value={wins} valueStyle={{ color: "#3f8600" }} />
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small">
						<Statistic
							title={"\u80DC\u7387"}
							value={items.length > 0 ? ((wins / items.length) * 100).toFixed(1) : 0}
							suffix="%"
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small">
						<Statistic
							title={isOvernight ? "\u5E73\u5747\u6B21\u65E5\u6536\u76CA" : "\u5E73\u5747\u6536\u76CA"}
							value={avgReturn.toFixed(2)}
							suffix="%"
							valueStyle={{ color: avgReturn >= 0 ? "#3f8600" : "#cf1322" }}
							prefix={avgReturn >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
						/>
					</Card>
				</Col>
			</Row>

			{items.length === 0
				? (
					<Empty description={"\u6682\u65E0\u8DDF\u8FDB\u6570\u636E"} />
				)
				: (
					<Row gutter={[12, 12]}>
						{items.map((item) => {
							const returnVal = isOvernight ? (item.next_day_return_pct ?? 0) : (item.latest_return_pct ?? 0);
							const isUp = returnVal > 0;
							return (
								<Col key={item.id} xs={24} sm={12} md={8} lg={6}>
									<Card
										size="small"
										hoverable
										onClick={() => handleDetail(item)}
										style={{ borderLeft: `3px solid ${isUp ? "#52c41a" : returnVal < 0 ? "#ff4d4f" : "#d9d9d9"}` }}
									>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div>
												<Text strong>{item.stock_name}</Text>
												<Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>{item.stock_code}</Text>
											</div>
											<Tag color={item.recommendation_level === "\u5F3A\u70C8\u63A8\u8350" ? "red" : "blue"}>
												{item.recommendation_level}
											</Tag>
										</div>

										<div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>
												{isOvernight ? "\u6B21\u65E5\u6536\u76CA" : "\u7D2F\u8BA1\u6536\u76CA"}
											</Text>
											<Text strong style={{ color: isUp ? "#52c41a" : returnVal < 0 ? "#ff4d4f" : undefined }}>
												{returnVal > 0 ? "+" : ""}
												{returnVal.toFixed(2)}
												%
											</Text>
										</div>

										<div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
											<Text type="secondary" style={{ fontSize: 12 }}>{"\u52A0\u5165\u4EF7"}</Text>
											<Text style={{ fontSize: 12 }}>{item.pick_price.toFixed(2)}</Text>
										</div>

										{!isOvernight && item.latest_price && (
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<Text type="secondary" style={{ fontSize: 12 }}>{"\u6700\u65B0\u4EF7"}</Text>
												<Text style={{ fontSize: 12 }}>{item.latest_price.toFixed(2)}</Text>
											</div>
										)}

										<div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
											<span style={{ display: "flex", gap: 1 }}>
												{[1, 2, 3, 4, 5].map(i => (
													<StarFilled key={i} style={{ fontSize: 10, color: i <= (item.recommendation_level === "\u5F3A\u70C8\u63A8\u8350" ? 5 : 3) ? "#faad14" : "#f0f0f0" }} />
												))}
											</span>
										</div>

										{(item.reasons || []).length > 0 && (
											<div style={{ marginTop: 6, padding: "4px 6px", background: "linear-gradient(135deg, #fffbe6, #fff7e6)", borderRadius: 4, border: "1px solid #ffe58f" }}>
												<div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
													<FireFilled style={{ fontSize: 10, color: "#fa8c16", marginTop: 2, flexShrink: 0 }} />
													<Text style={{ fontSize: 10, color: "#874d00", lineHeight: "16px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
														{item.reasons[0]}
													</Text>
												</div>
											</div>
										)}

										{item.status === "closed" && (
											<Tag color="default" icon={<CheckCircleOutlined />} style={{ marginTop: 4 }}>
												{"\u5DF2\u7ED3\u675F"}
												{" "}
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
													{"\u7ED3\u675F\u8DDF\u8FDB"}
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
								<Text type="secondary">{"\u63A8\u8350\u7B49\u7EA7"}</Text>
								<br />
								<Tag color={detailItem.recommendation_level === "\u5F3A\u70C8\u63A8\u8350" ? "red" : "blue"}>
									{detailItem.recommendation_level}
								</Tag>
							</Col>
							<Col span={12}>
								<Text type="secondary">{"\u52A0\u5165\u65E5\u671F"}</Text>
								<br />
								<Text>{detailItem.pick_date}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">{"\u52A0\u5165\u4EF7\u683C"}</Text>
								<br />
								<Text>{detailItem.pick_price.toFixed(2)}</Text>
							</Col>
							<Col span={12}>
								<Text type="secondary">{"\u7D2F\u8BA1\u6536\u76CA"}</Text>
								<br />
								<Text style={{ color: (detailItem.latest_return_pct ?? 0) >= 0 ? "#3f8600" : "#cf1322" }}>
									{(detailItem.latest_return_pct ?? 0) > 0 ? "+" : ""}
									{(detailItem.latest_return_pct ?? 0).toFixed(2)}
									%
								</Text>
							</Col>
						</Row>

						{detailItem.reasons.length > 0 && (
							<div style={{ marginBottom: 16 }}>
								<Text type="secondary">{"\u63A8\u8350\u7406\u7531"}</Text>
								{detailItem.reasons.map((r, i) => (
									<div key={i} style={{ marginTop: 4, padding: "4px 8px", background: "#fffbe6", borderRadius: 4 }}>
										<FireFilled style={{ color: "#fa8c16", marginRight: 4, fontSize: 11 }} />
										<Text style={{ fontSize: 12 }}>{r}</Text>
									</div>
								))}
							</div>
						)}

						<Text type="secondary">{"\u4EF7\u683C\u8D70\u52BF"}</Text>
						{snapshots.length > 0
							? (
								<Timeline style={{ marginTop: 12 }}>
									{snapshots.map(s => (
										<Timeline.Item
											key={s.id}
											color={s.total_return_pct >= 0 ? "green" : "red"}
										>
											<div style={{ display: "flex", justifyContent: "space-between" }}>
												<Text>{s.snapshot_date}</Text>
												<Space>
													<Text>{s.close_price.toFixed(2)}</Text>
													<Text style={{ color: s.total_return_pct >= 0 ? "#3f8600" : "#cf1322" }}>
														{s.total_return_pct > 0 ? "+" : ""}
														{s.total_return_pct.toFixed(2)}
														%
													</Text>
												</Space>
											</div>
										</Timeline.Item>
									))}
								</Timeline>
							)
							: (
								<Empty description={"\u6682\u65E0\u5FEB\u7167\u6570\u636E"} style={{ marginTop: 12 }} />
							)}
					</div>
				)}
			</Drawer>
		</Spin>
	);
}
