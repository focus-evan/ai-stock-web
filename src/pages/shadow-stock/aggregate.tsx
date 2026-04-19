import type { AggCompany, AggShadowStock, AggTrack, ShadowStockAggregateResponse } from "#src/api/shadow-stock";
import { fetchShadowStockAggregate } from "#src/api/shadow-stock";
import {
	BankOutlined,
	FireOutlined,
	RocketOutlined,
	SearchOutlined,
	StockOutlined,
	TrophyFilled,
} from "@ant-design/icons";
import {
	Badge,
	Card,
	Col,
	Collapse,
	Empty,
	Input,
	Row,
	Select,
	Space,
	Spin,
	Statistic,
	Table,
	Tabs,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** IPO 状态颜色 */
const statusColor: Record<string, string> = {
	辅导中: "#8c8c8c",
	辅导备案: "#8c8c8c",
	辅导验收: "#1890ff",
	预披露: "#2f54eb",
	已受理: "#722ed1",
	问询中: "#fa8c16",
	已问询: "#fa8c16",
	上市委审核: "#eb2f96",
	已过会: "#52c41a",
	提交注册: "#13c2c2",
	已注册: "#13c2c2",
	注册生效: "#389e0d",
	已发行待上市: "#cf1322",
	中止: "#ff4d4f",
};

/** 风险颜色 */
const riskColor: Record<string, string> = { low: "#52c41a", medium: "#faad14", high: "#ff4d4f" };

/** 从所有数据中提取唯一 IPO 状态列表 */
function extractStatuses(tracks: AggTrack[]): string[] {
	const s = new Set<string>();
	for (const t of tracks) {
		for (const c of t.companies) {
			if (c.ipo_status)
				s.add(c.ipo_status);
		}
	}
	return Array.from(s);
}

/** 影子股维度数据结构 */
interface ShadowStockDimensionItem {
	holder_name: string
	holder_stock_code: string
	holder_market_cap: number
	holder_main_business: string
	risk_level: string
	/** 关联的 IPO 公司列表 */
	linked_companies: Array<{
		company_name: string
		ipo_status: string
		track_name: string
		holding_ratio: number
		holding_type: string
		gain_ratio: number
	}>
	/** 关联 IPO 公司数量 */
	linked_count: number
	/** 最高持股比例 */
	max_holding_ratio: number
	/** 平均弹性 */
	avg_gain_ratio: number
}

/** 从原始数据构建影子股维度 */
function buildShadowStockDimension(tracks: AggTrack[]): ShadowStockDimensionItem[] {
	const map = new Map<string, ShadowStockDimensionItem>();

	for (const track of tracks) {
		for (const company of track.companies) {
			for (const ss of company.shadow_stocks) {
				const key = ss.holder_stock_code || ss.holder_name;
				if (!map.has(key)) {
					map.set(key, {
						holder_name: ss.holder_name,
						holder_stock_code: ss.holder_stock_code,
						holder_market_cap: ss.holder_market_cap,
						holder_main_business: ss.holder_main_business,
						risk_level: ss.risk_level,
						linked_companies: [],
						linked_count: 0,
						max_holding_ratio: 0,
						avg_gain_ratio: 0,
					});
				}
				const item = map.get(key)!;
				// 更新市值取最新非零值
				if (ss.holder_market_cap > 0)
					item.holder_market_cap = ss.holder_market_cap;
				if (ss.holder_main_business)
					item.holder_main_business = ss.holder_main_business;

				item.linked_companies.push({
					company_name: company.company_name,
					ipo_status: company.ipo_status,
					track_name: track.track_name,
					holding_ratio: ss.holding_ratio,
					holding_type: ss.holding_type,
					gain_ratio: ss.gain_ratio,
				});
			}
		}
	}

	const result: ShadowStockDimensionItem[] = [];
	for (const item of map.values()) {
		item.linked_count = item.linked_companies.length;
		item.max_holding_ratio = Math.max(...item.linked_companies.map(c => c.holding_ratio));
		item.avg_gain_ratio = item.linked_companies.reduce((s, c) => s + c.gain_ratio, 0) / item.linked_count;
		result.push(item);
	}

	// 按关联公司数量降序
	result.sort((a, b) => b.linked_count - a.linked_count || b.max_holding_ratio - a.max_holding_ratio);
	return result;
}

// ==================== 影子股表格列（IPO维度内嵌用） ====================
const holdingColumns = [
	{
		title: "影子股",
		dataIndex: "holder_name",
		key: "holder_name",
		width: 140,
		render: (v: string, r: AggShadowStock) => (
			<Space size={4}>
				<Text strong style={{ color: "#e6e6e6", fontSize: 13 }}>{v}</Text>
				{r.holder_stock_code && (
					<Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{r.holder_stock_code}</Text>
				)}
			</Space>
		),
	},
	{
		title: "持股比例",
		dataIndex: "holding_ratio",
		key: "holding_ratio",
		width: 90,
		sorter: (a: AggShadowStock, b: AggShadowStock) => a.holding_ratio - b.holding_ratio,
		render: (v: number) => (
			<Text style={{ color: v >= 10 ? "#ff4d4f" : v >= 5 ? "#fa8c16" : "#bfbfbf", fontWeight: 600 }}>
				{v.toFixed(2)}
				%
			</Text>
		),
	},
	{
		title: "持股方式",
		dataIndex: "holding_type",
		key: "holding_type",
		width: 80,
		render: (v: string) => <Tag style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#bfbfbf", fontSize: 11 }}>{v}</Tag>,
	},
	{
		title: "市值(亿)",
		dataIndex: "holder_market_cap",
		key: "holder_market_cap",
		width: 80,
		sorter: (a: AggShadowStock, b: AggShadowStock) => a.holder_market_cap - b.holder_market_cap,
		render: (v: number) => <Text style={{ color: "#d9d9d9" }}>{v > 0 ? v.toFixed(1) : "-"}</Text>,
	},
	{
		title: "弹性",
		dataIndex: "gain_ratio",
		key: "gain_ratio",
		width: 80,
		sorter: (a: AggShadowStock, b: AggShadowStock) => a.gain_ratio - b.gain_ratio,
		render: (v: number) => (
			<Text style={{ color: v >= 5 ? "#ff4d4f" : v >= 2 ? "#fa8c16" : "#bfbfbf", fontWeight: 600 }}>
				{v > 0 ? `${v.toFixed(1)}%` : "-"}
			</Text>
		),
	},
	{
		title: "主营业务",
		dataIndex: "holder_main_business",
		key: "holder_main_business",
		ellipsis: true,
		render: (v: string) => <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{v || "-"}</Text>,
	},
	{
		title: "风险",
		dataIndex: "risk_level",
		key: "risk_level",
		width: 60,
		render: (v: string) => (
			<Tag style={{
				background: `${riskColor[v] || "#faad14"}20`,
				color: riskColor[v] || "#faad14",
				border: "none",
				fontSize: 11,
			}}
			>
				{v === "low" ? "低" : v === "high" ? "高" : "中"}
			</Tag>
		),
	},
];

// ==================== 单个公司卡片（IPO维度用） ====================
const CompanyCard: React.FC<{ company: AggCompany }> = ({ company }) => {
	const sc = statusColor[company.ipo_status] || "#8c8c8c";
	return (
		<Card
			size="small"
			style={{
				background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
				border: "1px solid rgba(255,255,255,0.08)",
				borderRadius: 10,
				marginBottom: 12,
			}}
			styles={{ body: { padding: "12px 16px" } }}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
				<Space size={8} align="center">
					<RocketOutlined style={{ color: "#a78bfa", fontSize: 16 }} />
					<Text strong style={{ color: "#fff", fontSize: 15 }}>{company.company_name}</Text>
					<Tag style={{ background: `${sc}25`, color: sc, border: `1px solid ${sc}50`, fontSize: 11, borderRadius: 4, margin: 0 }}>
						{company.ipo_status}
					</Tag>
					{company.target_market && (
						<Tag style={{ background: "rgba(24,144,255,0.15)", color: "#69c0ff", border: "none", fontSize: 11, margin: 0 }}>
							{company.target_market}
						</Tag>
					)}
				</Space>
				<Space size={12}>
					{company.appear_count > 1 && (
						<Tooltip title={`在 ${company.appear_count} 次报告中被推荐`}>
							<Badge
								count={`×${company.appear_count}`}
								style={{ background: "#722ed1", fontSize: 11, fontWeight: 700 }}
							/>
						</Tooltip>
					)}
					{company.expected_valuation > 0 && (
						<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
							估值
							{" "}
							<Text style={{ color: "#faad14", fontWeight: 600 }}>{company.expected_valuation.toFixed(0)}</Text>
							{" "}
							亿
						</Text>
					)}
				</Space>
			</div>

			{company.latest_progress && (
				<Paragraph
					style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 8px 0", lineHeight: "18px" }}
					ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}
				>
					{company.latest_progress}
				</Paragraph>
			)}

			{company.shadow_stocks.length > 0 && (
				<Table
					dataSource={company.shadow_stocks}
					columns={holdingColumns}
					rowKey="holder_stock_code"
					pagination={false}
					size="small"
					style={{ background: "transparent" }}
					className="dark-table"
				/>
			)}
		</Card>
	);
};

// ==================== 主页面 ====================
const ShadowStockAggregate: React.FC = () => {
	const [data, setData] = useState<ShadowStockAggregateResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("ipo");
	// 筛选状态
	const [searchCompany, setSearchCompany] = useState("");
	const [searchShadow, setSearchShadow] = useState("");
	const [filterStatus, setFilterStatus] = useState<string[]>([]);

	useEffect(() => {
		(async () => {
			try {
				const resp = await fetchShadowStockAggregate();
				setData(resp);
			}
			catch (e) {
				console.error("Aggregate fetch failed", e);
			}
			finally {
				setLoading(false);
			}
		})();
	}, []);

	// 提取状态选项
	const statusOptions = useMemo(() => {
		if (!data?.tracks)
			return [];
		return extractStatuses(data.tracks).map(s => ({ label: s, value: s }));
	}, [data]);

	// IPO维度：筛选后的 tracks
	const filteredTracks = useMemo(() => {
		if (!data?.tracks)
			return [];
		const kw = searchCompany.trim().toLowerCase();
		const skw = searchShadow.trim().toLowerCase();

		return data.tracks
			.map((track) => {
				const filteredCompanies = track.companies.filter((c) => {
					// 状态筛选
					if (filterStatus.length > 0 && !filterStatus.includes(c.ipo_status))
						return false;
					// 公司名搜索
					if (kw && !c.company_name.toLowerCase().includes(kw))
						return false;
					// 影子股名搜索
					if (skw) {
						const hasMatch = c.shadow_stocks.some(
							s => s.holder_name.toLowerCase().includes(skw) || s.holder_stock_code.toLowerCase().includes(skw),
						);
						if (!hasMatch)
							return false;
					}
					return true;
				});
				return { ...track, companies: filteredCompanies, company_count: filteredCompanies.length };
			})
			.filter(t => t.companies.length > 0);
	}, [data, searchCompany, searchShadow, filterStatus]);

	// 影子股维度数据
	const shadowDimension = useMemo(() => {
		if (!data?.tracks)
			return [];
		let items = buildShadowStockDimension(data.tracks);

		// 影子股名搜索
		const skw = searchShadow.trim().toLowerCase();
		if (skw) {
			items = items.filter(
				i => i.holder_name.toLowerCase().includes(skw) || i.holder_stock_code.toLowerCase().includes(skw),
			);
		}

		// 公司名搜索
		const kw = searchCompany.trim().toLowerCase();
		if (kw) {
			items = items.filter(
				i => i.linked_companies.some(c => c.company_name.toLowerCase().includes(kw)),
			);
		}

		// 状态筛选
		if (filterStatus.length > 0) {
			items = items.filter(
				i => i.linked_companies.some(c => filterStatus.includes(c.ipo_status)),
			);
		}

		return items;
	}, [data, searchShadow, searchCompany, filterStatus]);

	// 影子股维度 关联公司展开列
	const linkedCompanyColumns = [
		{
			title: "IPO公司",
			dataIndex: "company_name",
			key: "company_name",
			width: 160,
			render: (v: string) => <Text strong style={{ color: "#e6e6e6" }}>{v}</Text>,
		},
		{
			title: "状态",
			dataIndex: "ipo_status",
			key: "ipo_status",
			width: 100,
			render: (v: string) => {
				const sc = statusColor[v] || "#8c8c8c";
				return <Tag style={{ background: `${sc}25`, color: sc, border: `1px solid ${sc}50`, fontSize: 11 }}>{v}</Tag>;
			},
		},
		{
			title: "赛道",
			dataIndex: "track_name",
			key: "track_name",
			width: 100,
			render: (v: string) => <Tag style={{ background: "rgba(250,173,20,0.12)", color: "#faad14", border: "none", fontSize: 11 }}>{v}</Tag>,
		},
		{
			title: "持股比例",
			dataIndex: "holding_ratio",
			key: "holding_ratio",
			width: 90,
			render: (v: number) => (
				<Text style={{ color: v >= 10 ? "#ff4d4f" : v >= 5 ? "#fa8c16" : "#bfbfbf", fontWeight: 600 }}>
					{v.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "持股方式",
			dataIndex: "holding_type",
			key: "holding_type",
			width: 80,
			render: (v: string) => <Tag style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#bfbfbf", fontSize: 11 }}>{v}</Tag>,
		},
		{
			title: "弹性",
			dataIndex: "gain_ratio",
			key: "gain_ratio",
			width: 80,
			render: (v: number) => (
				<Text style={{ color: v >= 5 ? "#ff4d4f" : v >= 2 ? "#fa8c16" : "#bfbfbf", fontWeight: 600 }}>
					{v > 0 ? `${v.toFixed(1)}%` : "-"}
				</Text>
			),
		},
	];

	// 影子股维度主表列
	const shadowMainColumns = [
		{
			title: "影子股",
			dataIndex: "holder_name",
			key: "holder_name",
			width: 160,
			fixed: "left" as const,
			render: (v: string, r: ShadowStockDimensionItem) => (
				<Space direction="vertical" size={0}>
					<Text strong style={{ color: "#fff", fontSize: 14 }}>{v}</Text>
					{r.holder_stock_code && <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{r.holder_stock_code}</Text>}
				</Space>
			),
		},
		{
			title: "关联IPO",
			dataIndex: "linked_count",
			key: "linked_count",
			width: 90,
			sorter: (a: ShadowStockDimensionItem, b: ShadowStockDimensionItem) => a.linked_count - b.linked_count,
			defaultSortOrder: "descend" as const,
			render: (v: number) => (
				<Badge count={v} style={{ background: v >= 3 ? "#ff4d4f" : v >= 2 ? "#fa8c16" : "#1890ff", fontWeight: 700, fontSize: 13 }} />
			),
		},
		{
			title: "最高持股",
			dataIndex: "max_holding_ratio",
			key: "max_holding_ratio",
			width: 100,
			sorter: (a: ShadowStockDimensionItem, b: ShadowStockDimensionItem) => a.max_holding_ratio - b.max_holding_ratio,
			render: (v: number) => (
				<Text style={{ color: v >= 10 ? "#ff4d4f" : v >= 5 ? "#fa8c16" : "#bfbfbf", fontWeight: 600 }}>
					{v.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "市值(亿)",
			dataIndex: "holder_market_cap",
			key: "holder_market_cap",
			width: 90,
			sorter: (a: ShadowStockDimensionItem, b: ShadowStockDimensionItem) => a.holder_market_cap - b.holder_market_cap,
			render: (v: number) => <Text style={{ color: "#d9d9d9" }}>{v > 0 ? v.toFixed(1) : "-"}</Text>,
		},
		{
			title: "主营业务",
			dataIndex: "holder_main_business",
			key: "holder_main_business",
			ellipsis: true,
			render: (v: string) => <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{v || "-"}</Text>,
		},
		{
			title: "风险",
			dataIndex: "risk_level",
			key: "risk_level",
			width: 60,
			render: (v: string) => (
				<Tag style={{ background: `${riskColor[v] || "#faad14"}20`, color: riskColor[v] || "#faad14", border: "none", fontSize: 11 }}>
					{v === "low" ? "低" : v === "high" ? "高" : "中"}
				</Tag>
			),
		},
	];

	if (loading) {
		return (
			<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
				<Spin size="large" tip="正在聚合历史数据..." />
			</div>
		);
	}

	if (!data || data.status !== "ok" || !data.tracks?.length) {
		return <Empty description="暂无历史聚合数据" style={{ marginTop: 80 }} />;
	}

	const totalShadowStocks = buildShadowStockDimension(data.tracks).length;

	return (
		<div style={{ padding: "16px 20px", maxWidth: 1400, margin: "0 auto" }}>
			{/* 顶部统计 */}
			<Card
				style={{
					background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
					border: "none",
					borderRadius: 12,
					marginBottom: 16,
				}}
			>
				<Row gutter={24} align="middle">
					<Col>
						<Space size={12} align="center">
							<TrophyFilled style={{ color: "#faad14", fontSize: 28 }} />
							<div>
								<Title level={4} style={{ color: "#fff", margin: 0 }}>影子股历史聚合</Title>
								<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
									跨所有报告去重，多维度分析
								</Text>
							</div>
						</Space>
					</Col>
					<Col flex="auto" />
					<Col>
						<Row gutter={32}>
							<Col>
								<Statistic
									title={<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>报告批次</Text>}
									value={data.total_reports}
									valueStyle={{ color: "#a78bfa", fontSize: 22, fontWeight: 700 }}
									suffix={<Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>次</Text>}
								/>
							</Col>
							<Col>
								<Statistic
									title={<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>热门赛道</Text>}
									value={data.total_tracks}
									valueStyle={{ color: "#faad14", fontSize: 22, fontWeight: 700 }}
									suffix={<Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>个</Text>}
								/>
							</Col>
							<Col>
								<Statistic
									title={<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>IPO标的</Text>}
									value={data.total_companies}
									valueStyle={{ color: "#52c41a", fontSize: 22, fontWeight: 700 }}
									suffix={<Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>家</Text>}
								/>
							</Col>
							<Col>
								<Statistic
									title={<Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>影子股</Text>}
									value={totalShadowStocks}
									valueStyle={{ color: "#13c2c2", fontSize: 22, fontWeight: 700 }}
									suffix={<Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>只</Text>}
								/>
							</Col>
						</Row>
					</Col>
				</Row>
			</Card>

			{/* 筛选器 */}
			<Card
				size="small"
				style={{
					background: "linear-gradient(135deg, #141428 0%, #1a1a3e 100%)",
					border: "1px solid rgba(255,255,255,0.06)",
					borderRadius: 10,
					marginBottom: 16,
				}}
				styles={{ body: { padding: "12px 16px" } }}
			>
				<Row gutter={12} align="middle">
					<Col flex="auto">
						<Space size={12} wrap>
							<Input
								placeholder="搜索IPO公司名称"
								prefix={<SearchOutlined style={{ color: "rgba(255,255,255,0.3)" }} />}
								value={searchCompany}
								onChange={e => setSearchCompany(e.target.value)}
								allowClear
								style={{ width: 200, background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
							/>
							<Input
								placeholder="搜索影子股名称/代码"
								prefix={<StockOutlined style={{ color: "rgba(255,255,255,0.3)" }} />}
								value={searchShadow}
								onChange={e => setSearchShadow(e.target.value)}
								allowClear
								style={{ width: 200, background: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.1)" }}
							/>
							<Select
								mode="multiple"
								placeholder="上市阶段"
								value={filterStatus}
								onChange={setFilterStatus}
								options={statusOptions}
								allowClear
								maxTagCount={2}
								style={{ minWidth: 200 }}
							/>
						</Space>
					</Col>
					<Col>
						<Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
							{activeTab === "ipo"
								? `${filteredTracks.reduce((s, t) => s + t.company_count, 0)} 家公司`
								: `${shadowDimension.length} 只影子股`}
						</Text>
					</Col>
				</Row>
			</Card>

			{/* 双维度 Tab */}
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				type="card"
				items={[
					{
						key: "ipo",
						label: (
							<Space>
								<BankOutlined />
								<span>IPO公司维度</span>
								<Badge count={filteredTracks.reduce((s, t) => s + t.company_count, 0)} style={{ background: "#722ed1" }} />
							</Space>
						),
						children: (
							<Collapse
								defaultActiveKey={filteredTracks.slice(0, 3).map((_, i) => String(i))}
								style={{ background: "transparent", border: "none" }}
								items={filteredTracks.map((track, idx) => ({
									key: String(idx),
									style: {
										background: "linear-gradient(135deg, #141428 0%, #1a1a3e 100%)",
										border: "1px solid rgba(255,255,255,0.06)",
										borderRadius: 10,
										marginBottom: 10,
										overflow: "hidden",
									},
									label: (
										<div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
											<FireOutlined style={{ color: "#fa8c16", fontSize: 18 }} />
											<Text strong style={{ color: "#fff", fontSize: 15 }}>{track.track_name}</Text>
											<Tag style={{ background: "rgba(250,173,20,0.15)", color: "#faad14", border: "none", fontSize: 11, margin: 0 }}>
												热度
												{" "}
												{track.heat_score.toFixed(0)}
											</Tag>
											<Tag style={{ background: "rgba(82,196,26,0.15)", color: "#52c41a", border: "none", fontSize: 11, margin: 0 }}>
												{track.company_count}
												{" "}
												家 IPO
											</Tag>
											{track.policy_support && (
												<Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginLeft: 8 }} ellipsis>
													{track.policy_support}
												</Text>
											)}
										</div>
									),
									children: (
										<div style={{ padding: "8px 0" }}>
											{track.track_description && (
												<Paragraph style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 12 }}>
													{track.track_description}
												</Paragraph>
											)}
											{track.companies.map(company => (
												<CompanyCard key={company.company_name} company={company} />
											))}
										</div>
									),
								}))}
							/>
						),
					},
					{
						key: "shadow",
						label: (
							<Space>
								<StockOutlined />
								<span>影子股维度</span>
								<Badge count={shadowDimension.length} style={{ background: "#13c2c2" }} />
							</Space>
						),
						children: (
							<Table<ShadowStockDimensionItem>
								dataSource={shadowDimension}
								columns={shadowMainColumns}
								rowKey={r => r.holder_stock_code || r.holder_name}
								size="small"
								className="dark-table"
								style={{ background: "transparent" }}
								scroll={{ x: 800 }}
								pagination={{ pageSize: 20, showSizeChanger: true, showTotal: t => `共 ${t} 只影子股` }}
								expandable={{
									expandedRowRender: record => (
										<div style={{ padding: "8px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
											<Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 8, display: "block" }}>
												关联
												{" "}
												{record.linked_count}
												{" "}
												家 IPO 公司
											</Text>
											<Table
												dataSource={record.linked_companies}
												columns={linkedCompanyColumns}
												rowKey="company_name"
												pagination={false}
												size="small"
												className="dark-table"
											/>
										</div>
									),
									rowExpandable: () => true,
								}}
							/>
						),
					},
				]}
			/>

			{/* dark table 样式 */}
			<style>
				{`
				.dark-table .ant-table {
					background: transparent !important;
				}
				.dark-table .ant-table-thead > tr > th {
					background: rgba(255,255,255,0.04) !important;
					color: rgba(255,255,255,0.45) !important;
					border-bottom: 1px solid rgba(255,255,255,0.06) !important;
					font-size: 11px !important;
					padding: 6px 8px !important;
				}
				.dark-table .ant-table-tbody > tr > td {
					background: transparent !important;
					border-bottom: 1px solid rgba(255,255,255,0.04) !important;
					padding: 6px 8px !important;
				}
				.dark-table .ant-table-tbody > tr:hover > td {
					background: rgba(255,255,255,0.04) !important;
				}
				.dark-table .ant-table-cell-row-hover {
					background: rgba(255,255,255,0.04) !important;
				}
				.dark-table .ant-table-expanded-row > td {
					background: rgba(255,255,255,0.02) !important;
				}
				.ant-collapse-content {
					background: transparent !important;
					border-top: 1px solid rgba(255,255,255,0.06) !important;
				}
				.ant-collapse-header {
					color: #fff !important;
				}
				.ant-collapse-expand-icon {
					color: rgba(255,255,255,0.5) !important;
				}
				.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
					background: rgba(255,255,255,0.04) !important;
					border-color: rgba(255,255,255,0.08) !important;
					color: rgba(255,255,255,0.5) !important;
				}
				.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
					background: rgba(114,46,209,0.15) !important;
					border-color: rgba(114,46,209,0.3) !important;
					color: #a78bfa !important;
				}
				.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn {
					color: #a78bfa !important;
				}
				.ant-select-selector {
					background: rgba(255,255,255,0.06) !important;
					border-color: rgba(255,255,255,0.1) !important;
				}
				.ant-input {
					color: rgba(255,255,255,0.85) !important;
				}
				.ant-select-selection-item {
					color: rgba(255,255,255,0.85) !important;
				}
				.ant-pagination-item a {
					color: rgba(255,255,255,0.65) !important;
				}
				.ant-pagination-item-active {
					border-color: #722ed1 !important;
				}
				`}
			</style>
		</div>
	);
};

export default ShadowStockAggregate;
