import type {
	DailyPicksData,
	DailyPicksDetailData,
	DailyPicksHistoryData,
	DailyPicksHistoryItem,
	DailyPickStock,
	StockDeepAnalysis,
} from "#src/api/strategy";
import {
	fetchDailyPicks,
	fetchDailyPicksDetail,
	fetchDailyPicksHistory,
	refreshDailyPicks,
} from "#src/api/strategy";
import {
	AlertOutlined,
	BulbOutlined,
	CalendarOutlined,
	ClockCircleOutlined,
	FireFilled,
	FireOutlined,
	FundOutlined,
	LineChartOutlined,
	ReloadOutlined,
	RiseOutlined,
	SafetyCertificateOutlined,
	StarFilled,
	ThunderboltFilled,
	TrophyFilled,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Divider,
	Drawer,
	Empty,
	message,
	Row,
	Skeleton,
	Space,
	Statistic,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import React, { useEffect, useRef, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 成长性颜色 */
const growthColors: Record<string, string> = {
	高成长: "#f5222d",
	稳定: "#52c41a",
	低增长: "#faad14",
	转型期: "#722ed1",
	待分析: "#8c8c8c",
};

/** 战法标签配色 */
const strategyColors: Record<string, string> = {
	龙头战法: "#f5222d",
	情绪战法: "#eb2f96",
	事件驱动: "#722ed1",
	突破战法: "#1890ff",
	量价关系: "#13c2c2",
	隔夜施工法: "#faad14",
	均线战法: "#52c41a",
	北向资金: "#1890ff",
	趋势动量: "#fa541c",
	综合战法: "#722ed1",
	连板接力: "#f5222d",
};

/** 精选榜单前三名配色 */
const podiumConfig = [
	{ gradient: "linear-gradient(135deg, #fff9e6 0%, #fff1b8 100%)", border: "#ffd666", icon: <TrophyFilled style={{ color: "#faad14", fontSize: 24 }} />, label: "🏆 今日最强推荐" },
	{ gradient: "linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)", border: "#85a5ff", icon: <StarFilled style={{ color: "#2f54eb", fontSize: 22 }} />, label: "🥈 第二推荐" },
	{ gradient: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)", border: "#95de64", icon: <StarFilled style={{ color: "#52c41a", fontSize: 20 }} />, label: "🥉 第三推荐" },
];

/** 深度分析卡片 */
const DeepAnalysisCard: React.FC<{ deep: StockDeepAnalysis }> = ({ deep }) => {
	const growthColor = growthColors[deep.growth_label] || "#8c8c8c";

	return (
		<div style={{ marginTop: 12 }}>
			{/* 赛道信息 */}
			<div style={{ background: "linear-gradient(135deg, #f0f5ff, #e6f7ff)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, border: "1px solid #91d5ff" }}>
				<Space size={4} style={{ marginBottom: 4 }}>
					<FundOutlined style={{ color: "#1890ff" }} />
					<Text strong style={{ color: "#1890ff", fontSize: 13 }}>赛道分析</Text>
				</Space>
				<div>
					<Space wrap size={[8, 4]}>
						<Tag color="blue" style={{ fontWeight: 600 }}>{deep.sector || "待分析"}</Tag>
						<Text style={{ fontSize: 12 }}>{deep.sector_growth}</Text>
					</Space>
				</div>
				<div style={{ marginTop: 4 }}>
					<Text style={{ fontSize: 12, color: "#595959" }}>
						<Text strong style={{ color: "#096dd9" }}>竞争格局：</Text>
						{deep.competitive_landscape}
						{deep.company_position && (
							<Text style={{ marginLeft: 8, color: "#1890ff" }}>
								（
								{deep.company_position}
								）
							</Text>
						)}
					</Text>
				</div>
			</div>

			{/* 护城河 & 主营 */}
			<div style={{ background: "linear-gradient(135deg, #fff2e8, #fff7e6)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, border: "1px solid #ffd591" }}>
				<Space size={4} style={{ marginBottom: 4 }}>
					<SafetyCertificateOutlined style={{ color: "#fa8c16" }} />
					<Text strong style={{ color: "#fa8c16", fontSize: 13 }}>护城河</Text>
				</Space>
				<div><Text style={{ fontSize: 12, lineHeight: "20px" }}>{deep.moat}</Text></div>
				{deep.main_business && (
					<div style={{ marginTop: 4 }}>
						<Text style={{ fontSize: 12, color: "#595959" }}>
							<Text strong style={{ color: "#d46b08" }}>主营：</Text>
							{deep.main_business}
						</Text>
					</div>
				)}
			</div>

			{/* 财务趋势 */}
			<div style={{ background: "linear-gradient(135deg, #f6ffed, #fcffe6)", borderRadius: 8, padding: "10px 14px", marginBottom: 8, border: "1px solid #b7eb8f" }}>
				<Space style={{ marginBottom: 4 }}>
					<LineChartOutlined style={{ color: "#52c41a" }} />
					<Text strong style={{ color: "#52c41a", fontSize: 13 }}>财务趋势</Text>
					<Tag style={{ background: `${growthColor}20`, borderColor: growthColor, color: growthColor, fontWeight: 600, fontSize: 11, padding: "0 6px" }}>
						{deep.growth_label}
					</Tag>
				</Space>
				<Row gutter={12}>
					<Col span={12}>
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>营收（近3季）</Text>
						<div><Text style={{ fontSize: 12 }}>{deep.revenue_trend}</Text></div>
					</Col>
					<Col span={12}>
						<Text style={{ fontSize: 11, color: "#8c8c8c" }}>净利润（近3季）</Text>
						<div><Text style={{ fontSize: 12 }}>{deep.profit_trend}</Text></div>
					</Col>
				</Row>
				{deep.growth_potential && (
					<div style={{ marginTop: 4 }}>
						<Text style={{ fontSize: 12, color: "#389e0d" }}>
							<Text strong>成长性：</Text>
							{deep.growth_potential}
						</Text>
					</div>
				)}
			</div>

			{/* 近期涨跌原因 */}
			<div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", marginBottom: 8, border: "1px solid #f0f0f0" }}>
				<Space size={4} style={{ marginBottom: 4 }}>
					<RiseOutlined style={{ color: "#722ed1" }} />
					<Text strong style={{ color: "#722ed1", fontSize: 13 }}>近期涨跌原因</Text>
				</Space>
				<div><Text style={{ fontSize: 12, lineHeight: "20px" }}>{deep.recent_move_reason}</Text></div>
			</div>

			{/* 风险 & 催化剂 */}
			{((deep.key_risks?.length ?? 0) > 0 || (deep.catalysts?.length ?? 0) > 0) && (
				<Row gutter={8}>
					{(deep.catalysts?.length ?? 0) > 0 && (
						<Col span={12}>
							<div style={{ background: "#f6ffed", borderRadius: 6, padding: "6px 10px", border: "1px solid #b7eb8f" }}>
								<Text style={{ fontSize: 11, color: "#52c41a", fontWeight: 600 }}>⚡ 催化剂</Text>
								{(deep.catalysts || []).map((c, i) => (
									<div key={i}>
										<Text style={{ fontSize: 11 }}>
											·
											{c}
										</Text>
									</div>
								))}
							</div>
						</Col>
					)}
					{(deep.key_risks?.length ?? 0) > 0 && (
						<Col span={12}>
							<div style={{ background: "#fff1f0", borderRadius: 6, padding: "6px 10px", border: "1px solid #ffa39e" }}>
								<Text style={{ fontSize: 11, color: "#f5222d", fontWeight: 600 }}>⚠️ 风险</Text>
								{(deep.key_risks || []).map((r, i) => (
									<div key={i}>
										<Text style={{ fontSize: 11 }}>
											·
											{r}
										</Text>
									</div>
								))}
							</div>
						</Col>
					)}
				</Row>
			)}

			{/* 深度评价 */}
			{deep.deep_summary && (
				<div style={{ marginTop: 8, padding: "8px 12px", background: "linear-gradient(135deg, #f9f0ff, #efdbff)", borderRadius: 8, border: "1px solid #d3adf7" }}>
					<Text style={{ fontSize: 11, color: "#531dab", fontWeight: 600 }}>💡 综合评价</Text>
					<div><Text style={{ fontSize: 12, lineHeight: "20px", color: "#391085" }}>{deep.deep_summary}</Text></div>
				</div>
			)}
		</div>
	);
};

/** 单只精选股票卡片 */
const PickCard: React.FC<{ stock: DailyPickStock, isPodium?: boolean, podiumIdx?: number }> = ({ stock, isPodium, podiumIdx }) => {
	const [expanded, setExpanded] = useState(isPodium);
	const cfg = isPodium && podiumIdx !== undefined ? podiumConfig[podiumIdx] : null;
	const price = stock.current_price || 0;
	const changePct = stock.change_pct || 0;

	const cardStyle = cfg
		? { background: cfg.gradient, border: `2px solid ${cfg.border}`, borderRadius: 12, marginBottom: 16 }
		: { borderRadius: 12, marginBottom: 12, border: "1px solid #f0f0f0" };

	return (
		<Card bordered={false} style={cardStyle} bodyStyle={{ padding: 16 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
				<Space size={8} align="center">
					{cfg
						? cfg.icon
						: (
							<Badge
								count={stock.pick_rank}
								style={{ backgroundColor: stock.pick_rank <= 3 ? "#f5222d" : "#1890ff", fontWeight: "bold", fontSize: 12 }}
							/>
						)}
					<div>
						<Space size={4}>
							<Text strong style={{ fontSize: isPodium ? 18 : 16 }}>{stock.name}</Text>
							<Text type="secondary" style={{ fontSize: 13 }}>{stock.code}</Text>
						</Space>
						{cfg && <div><Text style={{ fontSize: 11, color: "#8c8c8c" }}>{cfg.label}</Text></div>}
					</div>
				</Space>
				<div style={{ textAlign: "right" }}>
					{price > 0 && (
						<>
							<Text strong style={{ fontSize: 16, color: "#262626" }}>
								¥
								{price.toFixed(2)}
							</Text>
							<div>
								<Tag color={changePct >= 0 ? "red" : "green"} style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}>
									{changePct >= 0 ? "+" : ""}
									{changePct.toFixed(2)}
									%
								</Tag>
							</div>
						</>
					)}
				</div>
			</div>

			<div style={{ marginBottom: 8 }}>
				<Space wrap size={[4, 4]}>
					{stock.strong_recommend_from.map(name => (
						<Tag key={name} color={strategyColors[name] || "#1890ff"} style={{ margin: 0, fontWeight: 600, fontSize: 11 }} icon={<ThunderboltFilled />}>
							{name}
						</Tag>
					))}
					{stock.strategy_count > stock.strong_recommend_from.length && (
						<Tag style={{ margin: 0, fontSize: 11 }} color="default">
							+
							{stock.strategy_count - stock.strong_recommend_from.length}
							个战法
						</Tag>
					)}
					{stock.is_combined && <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>🔗多战法共振</Tag>}
				</Space>
			</div>

			{(stock.suggested_buy_price || stock.operation_suggestion) && (
				<div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(0,0,0,0.06)", marginBottom: 8 }}>
					{stock.suggested_buy_price && stock.suggested_buy_price > 0 && (
						<Row gutter={8}>
							<Col span={8}>
								<div style={{ textAlign: "center" }}>
									<Text style={{ fontSize: 11, color: "#52c41a" }}>买入 ↓</Text>
									<div><Text strong style={{ fontSize: 14, color: "#389e0d" }}>{(stock.suggested_buy_price || 0).toFixed(2)}</Text></div>
								</div>
							</Col>
							<Col span={8}>
								<div style={{ textAlign: "center" }}>
									<Text style={{ fontSize: 11, color: "#f5222d" }}>目标 ↑</Text>
									<div><Text strong style={{ fontSize: 14, color: "#cf1322" }}>{(stock.suggested_sell_price || 0).toFixed(2)}</Text></div>
								</div>
							</Col>
							<Col span={8}>
								<div style={{ textAlign: "center" }}>
									<Text style={{ fontSize: 11, color: "#8c8c8c" }}>止损 ⛔</Text>
									<div><Text style={{ fontSize: 14, color: "#8c8c8c" }}>{(stock.stop_loss_price || 0).toFixed(2)}</Text></div>
								</div>
							</Col>
						</Row>
					)}
					{(stock.buy_reason || stock.operation_suggestion) && (
						<div style={{ marginTop: 6 }}>
							<Text style={{ fontSize: 12, color: "#595959" }}>{stock.buy_reason || stock.operation_suggestion}</Text>
						</div>
					)}
				</div>
			)}

			{stock.deep_analysis && (
				<>
					<div onClick={() => setExpanded(!expanded)} style={{ cursor: "pointer", padding: "4px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#1890ff", fontSize: 12, userSelect: "none" }}>
						<BulbOutlined />
						{expanded ? "收起深度分析" : "展开深度分析（赛道/护城河/财务/涨跌原因）"}
					</div>
					{expanded && <DeepAnalysisCard deep={stock.deep_analysis} />}
				</>
			)}
		</Card>
	);
};

/** 本周推荐核心逻辑 Card */
const WeeklyLogicCard: React.FC<{ data: DailyPicksData | DailyPicksDetailData }> = ({ data }) => {
	const logic = data.weekly_logic;
	if (!logic)
		return null;

	return (
		<Card bordered={false} style={{ marginBottom: 20, borderRadius: 12, background: "linear-gradient(135deg, #141414 0%, #1f1f1f 100%)", border: "1px solid #303030" }} bodyStyle={{ padding: "20px 24px" }}>
			<Space direction="vertical" style={{ width: "100%" }} size={12}>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<AlertOutlined style={{ color: "#faad14", fontSize: 20 }} />
					<div>
						<Text strong style={{ color: "#fff", fontSize: 16 }}>本周推荐核心逻辑</Text>
						<div><Tag color="gold" style={{ fontWeight: 700, fontSize: 12, marginTop: 4 }} icon={<FireFilled />}>{logic.market_theme}</Tag></div>
					</div>
				</div>
				<div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
					<Paragraph style={{ color: "rgba(255,255,255,0.85)", margin: 0, fontSize: 13, lineHeight: "22px" }}>{logic.weekly_logic}</Paragraph>
				</div>
				<Row gutter={16}>
					{logic.key_opportunities.length > 0 && (
						<Col span={14}>
							<Text style={{ color: "#52c41a", fontWeight: 600, fontSize: 12 }}>⚡ 核心机会</Text>
							{logic.key_opportunities.map((opp, i) => (
								<div key={i} style={{ marginTop: 4 }}>
									<Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>
										·
										{opp}
									</Text>
								</div>
							))}
						</Col>
					)}
					<Col span={10}>
						<Text style={{ color: "#faad14", fontWeight: 600, fontSize: 12 }}>📋 操作建议</Text>
						<div style={{ marginTop: 4 }}><Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{logic.operation_advice}</Text></div>
					</Col>
				</Row>
				{logic.risk_warning && (
					<div style={{ background: "rgba(255,77,79,0.1)", borderRadius: 6, padding: "8px 12px", border: "1px solid rgba(255,77,79,0.2)" }}>
						<Space size={6}>
							<WarningOutlined style={{ color: "#ff4d4f" }} />
							<Text style={{ color: "#ff4d4f", fontSize: 12 }}>{logic.risk_warning}</Text>
						</Space>
					</div>
				)}
			</Space>
		</Card>
	);
};

/** 历史精选详情 Drawer */
const HistoryDetailDrawer: React.FC<{
	recordId: number | null
	onClose: () => void
}> = ({ recordId, onClose }) => {
	const [detail, setDetail] = useState<DailyPicksDetailData | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (recordId == null)
			return;
		const load = async () => {
			setLoading(true);
			setDetail(null);
			try {
				const res = await fetchDailyPicksDetail(recordId);
				if (res.status === "success" && res.data)
					setDetail(res.data);
			}
			catch { /* ignore */ }
			finally { setLoading(false); }
		};
		load();
	}, [recordId]);

	const picks = detail?.picks || [];
	const topPicks = picks.slice(0, 3);
	const restPicks = picks.slice(3);

	return (
		<Drawer
			title={detail ? `📅 ${detail.trading_date} 精选详情（${detail.pick_count}只）` : "加载中..."}
			placement="right"
			width="min(90vw, 860px)"
			open={recordId != null}
			onClose={onClose}
			bodyStyle={{ background: "#f5f5f5", padding: 16 }}
		>
			{loading && <Skeleton active paragraph={{ rows: 8 }} />}
			{!loading && detail && (
				<div>
					<WeeklyLogicCard data={detail} />
					{topPicks.length > 0 && (
						<>
							<div style={{ marginBottom: 12 }}>
								<Space>
									<TrophyFilled style={{ color: "#faad14", fontSize: 18 }} />
									<Text strong style={{ fontSize: 15 }}>TOP 精选</Text>
								</Space>
							</div>
							<Row gutter={[16, 0]}>
								{topPicks.map((stock, idx) => (
									<Col key={stock.code} xs={24} md={8}>
										<PickCard stock={stock} isPodium podiumIdx={idx} />
									</Col>
								))}
							</Row>
						</>
					)}
					{restPicks.length > 0 && (
						<>
							<Divider orientation="left">
								<Space>
									<FireOutlined style={{ color: "#fa541c" }} />
									<Text strong>更多精选</Text>
								</Space>
							</Divider>
							{restPicks.map(stock => <PickCard key={stock.code} stock={stock} />)}
						</>
					)}
				</div>
			)}
			{!loading && !detail && <Empty description="暂无数据" />}
		</Drawer>
	);
};

/** 历史精选 Tab */
const HistoryTab: React.FC = () => {
	const [historyData, setHistoryData] = useState<DailyPicksHistoryData | null>(null);
	const [loading, setLoading] = useState(false);
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [page, setPage] = useState(1);
	const hasFetched = useRef(false);

	const loadHistory = async (p: number = 1) => {
		setLoading(true);
		try {
			const res = await fetchDailyPicksHistory(60, p, 20);
			if (res.status === "success" && res.data) {
				setHistoryData(res.data);
				setPage(p);
			}
		}
		catch {
			message.error("加载历史精选失败");
		}
		finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!hasFetched.current) {
			hasFetched.current = true;
			loadHistory(1);
		}
	}, []);

	const columns = [
		{
			title: "交易日期",
			dataIndex: "trading_date",
			key: "trading_date",
			width: 110,
			render: (v: string) => (
				<Space>
					<CalendarOutlined style={{ color: "#1890ff" }} />
					<Text strong>{v}</Text>
				</Space>
			),
		},
		{
			title: "精选股票",
			dataIndex: "stocks_summary",
			key: "stocks_summary",
			render: (stocks: { code: string, name: string }[]) => (
				<Space wrap size={[4, 4]}>
					{(stocks || []).map(s => (
						<Tag key={s.code} style={{ fontSize: 11 }}>{s.name}</Tag>
					))}
				</Space>
			),
		},
		{
			title: "市场主线",
			dataIndex: "weekly_theme",
			key: "weekly_theme",
			width: 120,
			render: (v: string) => v ? <Tag color="gold" icon={<FireFilled />}>{v}</Tag> : <Text type="secondary">-</Text>,
		},
		{
			title: "数量",
			dataIndex: "pick_count",
			key: "pick_count",
			width: 70,
			render: (v: number) => <Badge count={v} style={{ backgroundColor: "#1890ff" }} />,
		},
		{
			title: "生成时间",
			dataIndex: "generated_at",
			key: "generated_at",
			width: 140,
			render: (v: string) => (
				<Space size={4}>
					<ClockCircleOutlined style={{ color: "#8c8c8c" }} />
					<Text type="secondary" style={{ fontSize: 12 }}>{v.slice(0, 16)}</Text>
				</Space>
			),
		},
		{
			title: "操作",
			key: "action",
			width: 80,
			render: (_: any, record: DailyPicksHistoryItem) => (
				<Button type="link" size="small" onClick={() => setSelectedId(record.id)}>
					查看详情
				</Button>
			),
		},
	];

	return (
		<div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<Space>
					<CalendarOutlined style={{ color: "#1890ff", fontSize: 16 }} />
					<Text strong style={{ fontSize: 15 }}>历史精选归档</Text>
					{historyData && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							共
							{historyData.total}
							{" "}
							条
						</Text>
					)}
				</Space>
				<Button icon={<ReloadOutlined />} onClick={() => loadHistory(page)} loading={loading}>刷新</Button>
			</div>

			<Table
				dataSource={historyData?.list || []}
				columns={columns}
				rowKey="id"
				loading={loading}
				size="small"
				pagination={{
					current: page,
					pageSize: 20,
					total: historyData?.total || 0,
					showSizeChanger: false,
					showTotal: t => `共 ${t} 条`,
					onChange: p => loadHistory(p),
				}}
				locale={{ emptyText: <Empty description="暂无历史精选记录，首次执行精选分析后将自动保存" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
			/>

			<HistoryDetailDrawer recordId={selectedId} onClose={() => setSelectedId(null)} />
		</div>
	);
};

/** 今日精选 Banner */
const TodayBanner: React.FC<{
	data: DailyPicksData
	fromCache: boolean
	refreshing: boolean
	refreshSeconds: number
	onRefresh: () => void
}> = ({ data, fromCache, refreshing, refreshSeconds, onRefresh }) => (
	<Card bordered={false} style={{ marginBottom: 24, background: "linear-gradient(135deg, #ff4d4f 0%, #ff7a45 50%, #ffa940 100%)", borderRadius: 12 }}>
		<Row gutter={[24, 16]} align="middle">
			<Col xs={24} sm={14}>
				<Space align="center">
					<FireFilled style={{ fontSize: 36, color: "#fff" }} />
					<div>
						<Title level={3} style={{ margin: 0, color: "#fff" }}>当日精选</Title>
						<Text style={{ color: "rgba(255,255,255,0.85)" }}>汇聚所有战法强烈推荐 · 深度赛道/护城河/财务分析</Text>
					</div>
					<Tooltip title="重新从各战法聚合 + AI深度分析（约2-5分钟）">
						<Button
							type="primary"
							ghost
							icon={<ReloadOutlined spin={refreshing} />}
							loading={refreshing}
							onClick={onRefresh}
							style={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", marginLeft: 12 }}
						>
							{refreshing ? `AI分析中 ${refreshSeconds}s...` : "刷新精选"}
						</Button>
					</Tooltip>
				</Space>
			</Col>
			<Col xs={24} sm={10}>
				<Row gutter={16} justify="end">
					<Col>
						<Statistic title={<span style={{ color: "rgba(255,255,255,0.65)" }}>精选股数</span>} value={data.total} valueStyle={{ color: "#fff", fontWeight: "bold" }} suffix="只" />
					</Col>
					<Col>
						<Statistic title={<span style={{ color: "rgba(255,255,255,0.65)" }}>覆盖战法</span>} value={data.strategy_count} valueStyle={{ color: "#ffd666", fontWeight: "bold" }} suffix="个" />
					</Col>
					{data.generated_at && (
						<Col>
							<div>
								<span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>更新时间</span>
								<div style={{ color: "#fff", fontSize: 13, fontWeight: "bold", marginTop: 4 }}>
									{data.generated_at.slice(11, 16)}
									{fromCache && (
										<Tag style={{ marginLeft: 6, fontSize: 10, lineHeight: "16px", padding: "0 4px", background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.85)" }}>
											已缓存
										</Tag>
									)}
								</div>
							</div>
						</Col>
					)}
				</Row>
			</Col>
		</Row>
	</Card>
);

/** 主页面 */
const DailyPicksPage: React.FC = () => {
	const [data, setData] = useState<DailyPicksData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [refreshSeconds, setRefreshSeconds] = useState(0);
	const [fromCache, setFromCache] = useState(false);
	const [activeTab, setActiveTab] = useState("today");
	const hasFetchedRef = useRef(false);

	const fetchData = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchDailyPicks(10, true);
			if (response.status === "success" && response.data) {
				setData(response.data);
				setFromCache(!!(response.data as any).from_cache);
			}
			else {
				setError(response.message || "获取数据失败");
			}
		}
		catch (e: any) {
			setError(e?.message || "网络请求失败");
		}
		finally {
			setLoading(false);
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		setRefreshSeconds(0);
		setFromCache(false);
		message.loading({ content: "正在刷新当日精选（AI正在分析赛道/护城河/财务...）", key: "daily-refresh", duration: 0 });

		const timer = setInterval(() => setRefreshSeconds(prev => prev + 1), 1000);

		try {
			const response = await refreshDailyPicks(10);
			if (response.status === "success" && response.data) {
				setData(response.data);
				setFromCache(false);
				message.success({ content: `刷新完成，共 ${response.data.picks?.length || 0} 只精选股`, key: "daily-refresh" });
			}
			else {
				message.error({ content: "刷新失败", key: "daily-refresh" });
			}
		}
		catch (e: any) {
			message.error({ content: e?.message || "刷新超时，请稍后重试", key: "daily-refresh" });
		}
		finally {
			clearInterval(timer);
			setRefreshing(false);
			setRefreshSeconds(0);
		}
	};

	useEffect(() => {
		if (!hasFetchedRef.current) {
			hasFetchedRef.current = true;
			fetchData();
		}
	}, []);

	// ==================== Tabs Items ====================
	const tabItems = [
		{
			key: "today",
			label: (
				<Space>
					<FireFilled style={{ color: "#f5222d" }} />
					今日精选
				</Space>
			),
			children: (
				<div>
					{loading && (
						<div style={{ padding: 24 }}>
							<Skeleton active paragraph={{ rows: 4 }} />
							{[1, 2, 3].map(i => <Skeleton key={i} active paragraph={{ rows: 6 }} style={{ marginBottom: 16 }} />)}
						</div>
					)}
					{!loading && error && (
						<Alert message="加载失败" description={error} type="error" showIcon action={<Button onClick={fetchData}>重试</Button>} />
					)}
					{!loading && !error && (!data || !data.picks || data.picks.length === 0) && (
						<Card>
							<Empty description="当前暂无强烈推荐股票" image={Empty.PRESENTED_IMAGE_SIMPLE}>
								<Text type="secondary">各战法还未生成推荐，或当前没有达到「强烈推荐」级别的股票</Text>
								<div style={{ marginTop: 16 }}>
									<Button onClick={handleRefresh} loading={refreshing} icon={<ReloadOutlined />}>刷新精选</Button>
								</div>
							</Empty>
						</Card>
					)}
					{!loading && !error && data && data.picks && data.picks.length > 0 && (
						<>
							<TodayBanner data={data} fromCache={fromCache} refreshing={refreshing} refreshSeconds={refreshSeconds} onRefresh={handleRefresh} />
							<WeeklyLogicCard data={data} />
							{data.picks.slice(0, 3).length > 0 && (
								<>
									<div style={{ marginBottom: 12 }}>
										<Space>
											<TrophyFilled style={{ color: "#faad14", fontSize: 18 }} />
											<Text strong style={{ fontSize: 15 }}>今日 TOP 精选</Text>
											<Text type="secondary" style={{ fontSize: 12 }}>以下股票被最多战法强烈推荐</Text>
										</Space>
									</div>
									<Row gutter={[16, 0]}>
										{data.picks.slice(0, 3).map((stock, idx) => (
											<Col key={stock.code} xs={24} md={8}>
												<PickCard stock={stock} isPodium podiumIdx={idx} />
											</Col>
										))}
									</Row>
								</>
							)}
							{data.picks.slice(3).length > 0 && (
								<>
									<Divider orientation="left">
										<Space>
											<FireOutlined style={{ color: "#fa541c" }} />
											<Text strong>更多精选</Text>
											<Text type="secondary" style={{ fontSize: 12 }}>
												（
												{data.picks.slice(3).length}
												只)
											</Text>
										</Space>
									</Divider>
									{data.picks.slice(3).map(stock => <PickCard key={stock.code} stock={stock} />)}
								</>
							)}
						</>
					)}
				</div>
			),
		},
		{
			key: "history",
			label: (
				<Space>
					<CalendarOutlined />
					历史精选
				</Space>
			),
			children: <HistoryTab />,
		},
	];

	return (
		<div style={{ padding: 24 }}>
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={tabItems}
				tabBarStyle={{ marginBottom: 16 }}
				tabBarExtraContent={
					activeTab === "today" && !loading && data
						? (
							<Tooltip title="重新触发AI深度分析（约2-5分钟）">
								<Button
									size="small"
									icon={<ReloadOutlined spin={refreshing} />}
									loading={refreshing}
									onClick={handleRefresh}
								>
									{refreshing ? `分析中 ${refreshSeconds}s...` : "刷新精选"}
								</Button>
							</Tooltip>
						)
						: null
				}
			/>
		</div>
	);
};

export default DailyPicksPage;
