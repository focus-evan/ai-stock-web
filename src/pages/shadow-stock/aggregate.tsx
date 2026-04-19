import type { AggCompany, AggShadowStock, AggTrack, ShadowStockAggregateResponse } from "#src/api/shadow-stock";
import { fetchShadowStockAggregate } from "#src/api/shadow-stock";
import { BasicContent } from "#src/components/basic-content";
import {
	BankOutlined,
	FireOutlined,
	InfoCircleOutlined,
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
	Descriptions,
	Empty,
	Input,
	Progress,
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

const STATUS_COLOR: Record<string, string> = {
	辅导中: "default",
	辅导备案: "default",
	辅导验收: "processing",
	预披露: "purple",
	已受理: "purple",
	问询中: "warning",
	已问询: "warning",
	上市委审核: "magenta",
	已过会: "success",
	提交注册: "cyan",
	已注册: "cyan",
	注册生效: "green",
	已发行待上市: "red",
	中止: "error",
};

const RISK_COLOR: Record<string, string> = { low: "green", medium: "orange", high: "red" };
const RISK_LABEL: Record<string, string> = { low: "低", medium: "中", high: "高" };

/** 影子股维度数据 */
interface ShadowDimensionItem {
	holder_name: string
	holder_stock_code: string
	holder_market_cap: number
	holder_main_business: string
	risk_level: string
	linked_companies: Array<{
		company_name: string
		ipo_status: string
		track_name: string
		holding_ratio: number
		holding_type: string
		gain_ratio: number
	}>
	linked_count: number
	max_ratio: number
	avg_gain: number
}

function buildShadowDimension(tracks: AggTrack[]): ShadowDimensionItem[] {
	const map = new Map<string, ShadowDimensionItem>();
	for (const track of tracks) {
		for (const co of track.companies) {
			for (const ss of co.shadow_stocks) {
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
						max_ratio: 0,
						avg_gain: 0,
					});
				}
				const item = map.get(key)!;
				if (ss.holder_market_cap > 0)
					item.holder_market_cap = ss.holder_market_cap;
				if (ss.holder_main_business)
					item.holder_main_business = ss.holder_main_business;
				item.linked_companies.push({
					company_name: co.company_name,
					ipo_status: co.ipo_status,
					track_name: track.track_name,
					holding_ratio: ss.holding_ratio,
					holding_type: ss.holding_type,
					gain_ratio: ss.gain_ratio,
				});
			}
		}
	}
	const result: ShadowDimensionItem[] = [];
	for (const item of map.values()) {
		item.linked_count = item.linked_companies.length;
		item.max_ratio = Math.max(...item.linked_companies.map(c => c.holding_ratio));
		item.avg_gain = item.linked_companies.reduce((s, c) => s + c.gain_ratio, 0) / item.linked_count;
		result.push(item);
	}
	result.sort((a, b) => b.linked_count - a.linked_count || b.max_ratio - a.max_ratio);
	return result;
}

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

/** IPO维度 - 影子股表格列 */
function getHoldingCols() {
	return [
		{
			title: "影子股",
			dataIndex: "holder_name",
			key: "name",
			width: 150,
			render: (v: string, r: AggShadowStock) => (
				<>
					<Text strong>{v}</Text>
					{r.holder_stock_code && <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>{r.holder_stock_code}</Text>}
				</>
			),
		},
		{
			title: "持股比例",
			dataIndex: "holding_ratio",
			key: "ratio",
			width: 90,
			align: "right" as const,
			sorter: (a: AggShadowStock, b: AggShadowStock) => a.holding_ratio - b.holding_ratio,
			render: (v: number) => (
				<Text strong style={{ color: v >= 10 ? "#ff4d4f" : v >= 5 ? "#fa8c16" : undefined }}>
					{v.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "持股方式",
			dataIndex: "holding_type",
			key: "type",
			width: 80,
			render: (v: string) => <Tag>{v}</Tag>,
		},
		{
			title: "市值(亿)",
			dataIndex: "holder_market_cap",
			key: "cap",
			width: 80,
			align: "right" as const,
			sorter: (a: AggShadowStock, b: AggShadowStock) => a.holder_market_cap - b.holder_market_cap,
			render: (v: number) => v > 0 ? v.toFixed(1) : "-",
		},
		{
			title: (
				<Tooltip title="市值弹性 = 预期收益 / 自身市值">
					<span>
						弹性
						<InfoCircleOutlined />
					</span>
				</Tooltip>
			),
			dataIndex: "gain_ratio",
			key: "gain",
			width: 80,
			align: "right" as const,
			sorter: (a: AggShadowStock, b: AggShadowStock) => a.gain_ratio - b.gain_ratio,
			render: (v: number) => <Text strong style={{ color: v >= 5 ? "#ff4d4f" : v >= 2 ? "#fa8c16" : undefined }}>{v > 0 ? `${v.toFixed(1)}%` : "-"}</Text>,
		},
		{
			title: "主营业务",
			dataIndex: "holder_main_business",
			key: "biz",
			ellipsis: true,
			render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "-"}</Text>,
		},
		{
			title: "风险",
			dataIndex: "risk_level",
			key: "risk",
			width: 60,
			render: (v: string) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v] || "中"}</Tag>,
		},
	];
}

/** IPO维度 - 公司卡片 */
function CompanyCard({ company }: { company: AggCompany }) {
	return (
		<Card
			size="small"
			style={{ marginBottom: 10, borderRadius: 8 }}
			styles={{ body: { padding: "10px 14px" } }}
		>
			{/* 头部 */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
				<Space size={6} align="center">
					<RocketOutlined style={{ color: "#667eea" }} />
					<Text strong style={{ fontSize: 14 }}>{company.company_name}</Text>
					<Tag color={STATUS_COLOR[company.ipo_status] || "default"}>{company.ipo_status}</Tag>
					{company.target_market && <Tag color="blue">{company.target_market}</Tag>}
				</Space>
				<Space size={10}>
					{company.appear_count > 1 && (
						<Tooltip title={`在 ${company.appear_count} 次报告中被推荐`}>
							<Badge count={`×${company.appear_count}`} style={{ background: "#722ed1" }} />
						</Tooltip>
					)}
					{company.expected_valuation > 0 && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							估值
							{" "}
							<Text strong style={{ color: "#1677ff" }}>{company.expected_valuation.toFixed(0)}</Text>
							{" "}
							亿
						</Text>
					)}
				</Space>
			</div>

			{company.latest_progress && (
				<Paragraph type="secondary" style={{ fontSize: 12, margin: "0 0 6px 0" }} ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}>
					{company.latest_progress}
				</Paragraph>
			)}

			{company.shadow_stocks.length > 0 && (
				<Table<AggShadowStock>
					dataSource={company.shadow_stocks}
					columns={getHoldingCols()}
					rowKey="holder_stock_code"
					pagination={false}
					size="small"
					scroll={{ x: 700 }}
				/>
			)}
		</Card>
	);
}

// ==================== 主页面 ====================
export default function ShadowStockAggregate() {
	const [data, setData] = useState<ShadowStockAggregateResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("ipo");
	const [searchCompany, setSearchCompany] = useState("");
	const [searchShadow, setSearchShadow] = useState("");
	const [filterStatus, setFilterStatus] = useState<string[]>([]);

	useEffect(() => {
		(async () => {
			try {
				setData(await fetchShadowStockAggregate());
			}
			catch (e) {
				console.error("Aggregate fetch failed", e);
			}
			finally {
				setLoading(false);
			}
		})();
	}, []);

	const statusOptions = useMemo(() => {
		if (!data?.tracks)
			return [];
		return extractStatuses(data.tracks).map(s => ({ label: s, value: s }));
	}, [data]);

	// IPO维度筛选
	const filteredTracks = useMemo(() => {
		if (!data?.tracks)
			return [];
		const kw = searchCompany.trim().toLowerCase();
		const skw = searchShadow.trim().toLowerCase();
		return data.tracks
			.map((track) => {
				const companies = track.companies.filter((c) => {
					if (filterStatus.length > 0 && !filterStatus.includes(c.ipo_status))
						return false;
					if (kw && !c.company_name.toLowerCase().includes(kw))
						return false;
					if (skw && !c.shadow_stocks.some(s => s.holder_name.toLowerCase().includes(skw) || s.holder_stock_code.toLowerCase().includes(skw)))
						return false;
					return true;
				});
				return { ...track, companies, company_count: companies.length };
			})
			.filter(t => t.companies.length > 0);
	}, [data, searchCompany, searchShadow, filterStatus]);

	// 影子股维度
	const shadowItems = useMemo(() => {
		if (!data?.tracks)
			return [];
		let items = buildShadowDimension(data.tracks);
		const skw = searchShadow.trim().toLowerCase();
		const kw = searchCompany.trim().toLowerCase();
		if (skw)
			items = items.filter(i => i.holder_name.toLowerCase().includes(skw) || i.holder_stock_code.toLowerCase().includes(skw));
		if (kw)
			items = items.filter(i => i.linked_companies.some(c => c.company_name.toLowerCase().includes(kw)));
		if (filterStatus.length > 0)
			items = items.filter(i => i.linked_companies.some(c => filterStatus.includes(c.ipo_status)));
		return items;
	}, [data, searchShadow, searchCompany, filterStatus]);

	// 影子股维度 - 展开行列
	const linkedCols = [
		{ title: "IPO公司", dataIndex: "company_name", key: "name", width: 160, render: (v: string) => <Text strong>{v}</Text> },
		{ title: "状态", dataIndex: "ipo_status", key: "status", width: 90, render: (v: string) => <Tag color={STATUS_COLOR[v] || "default"}>{v}</Tag> },
		{ title: "赛道", dataIndex: "track_name", key: "track", width: 100, render: (v: string) => <Tag color="orange">{v}</Tag> },
		{ title: "持股", dataIndex: "holding_ratio", key: "ratio", width: 80, align: "right" as const, render: (v: number) => (
			<Text strong>
				{v.toFixed(2)}
				%
			</Text>
		) },
		{ title: "方式", dataIndex: "holding_type", key: "type", width: 80, render: (v: string) => <Tag>{v}</Tag> },
		{ title: "弹性", dataIndex: "gain_ratio", key: "gain", width: 70, align: "right" as const, render: (v: number) => v > 0 ? `${v.toFixed(1)}%` : "-" },
	];

	// 影子股维度 - 主表列
	const shadowCols = [
		{
			title: "影子股",
			dataIndex: "holder_name",
			key: "name",
			width: 150,
			fixed: "left" as const,
			render: (v: string, r: ShadowDimensionItem) => (
				<Space direction="vertical" size={0}>
					<Text strong>{v}</Text>
					{r.holder_stock_code && <Text type="secondary" style={{ fontSize: 11 }}>{r.holder_stock_code}</Text>}
				</Space>
			),
		},
		{
			title: "关联IPO",
			dataIndex: "linked_count",
			key: "count",
			width: 90,
			align: "center" as const,
			sorter: (a: ShadowDimensionItem, b: ShadowDimensionItem) => a.linked_count - b.linked_count,
			defaultSortOrder: "descend" as const,
			render: (v: number) => <Badge count={v} style={{ background: v >= 3 ? "#f5222d" : v >= 2 ? "#fa8c16" : "#1677ff" }} />,
		},
		{
			title: "最高持股",
			dataIndex: "max_ratio",
			key: "ratio",
			width: 95,
			align: "right" as const,
			sorter: (a: ShadowDimensionItem, b: ShadowDimensionItem) => a.max_ratio - b.max_ratio,
			render: (v: number) => (
				<Text strong style={{ color: v >= 10 ? "#f5222d" : v >= 5 ? "#fa8c16" : undefined }}>
					{v.toFixed(2)}
					%
				</Text>
			),
		},
		{
			title: "市值(亿)",
			dataIndex: "holder_market_cap",
			key: "cap",
			width: 90,
			align: "right" as const,
			sorter: (a: ShadowDimensionItem, b: ShadowDimensionItem) => a.holder_market_cap - b.holder_market_cap,
			render: (v: number) => v > 0 ? v.toFixed(1) : "-",
		},
		{
			title: "均弹性",
			dataIndex: "avg_gain",
			key: "gain",
			width: 80,
			align: "right" as const,
			sorter: (a: ShadowDimensionItem, b: ShadowDimensionItem) => a.avg_gain - b.avg_gain,
			render: (v: number) => v > 0
				? (
					<Text style={{ color: v >= 3 ? "#f5222d" : undefined }}>
						{v.toFixed(1)}
						%
					</Text>
				)
				: "-",
		},
		{
			title: "主营业务",
			dataIndex: "holder_main_business",
			key: "biz",
			ellipsis: true,
			render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || "-"}</Text>,
		},
		{
			title: "风险",
			dataIndex: "risk_level",
			key: "risk",
			width: 60,
			render: (v: string) => <Tag color={RISK_COLOR[v]}>{RISK_LABEL[v] || "中"}</Tag>,
		},
	];

	if (loading) {
		return (
			<BasicContent className="h-full" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
				<Spin size="large" tip="正在聚合历史数据..." />
			</BasicContent>
		);
	}

	if (!data || data.status !== "ok" || !data.tracks?.length) {
		return <BasicContent><Empty description="暂无历史聚合数据" style={{ marginTop: 80 }} /></BasicContent>;
	}

	const totalShadow = buildShadowDimension(data.tracks).length;
	const filteredCount = activeTab === "ipo" ? filteredTracks.reduce((s, t) => s + t.company_count, 0) : shadowItems.length;

	return (
		<BasicContent className="h-full">
			<div style={{ padding: "0 4px" }}>
				{/* 顶部 */}
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
					<div>
						<Title level={4} style={{ margin: 0, marginBottom: 2 }}>
							<TrophyFilled style={{ marginRight: 8, color: "#faad14" }} />
							影子股历史聚合
						</Title>
						<Text type="secondary">
							跨
							{data.total_reports}
							{" "}
							次报告去重，多维度分析
						</Text>
					</div>
					<Row gutter={24}>
						<Col><Statistic title="赛道" value={data.total_tracks} valueStyle={{ color: "#fa8c16", fontSize: 20 }} suffix="个" /></Col>
						<Col><Statistic title="IPO标的" value={data.total_companies} valueStyle={{ color: "#52c41a", fontSize: 20 }} suffix="家" /></Col>
						<Col><Statistic title="影子股" value={totalShadow} valueStyle={{ color: "#1677ff", fontSize: 20 }} suffix="只" /></Col>
					</Row>
				</div>

				{/* 筛选器 */}
				<Card size="small" style={{ marginBottom: 12, borderRadius: 10 }} styles={{ body: { padding: "10px 14px" } }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<Space size={10} wrap>
							<Input
								placeholder="IPO公司名称"
								prefix={<SearchOutlined />}
								value={searchCompany}
								onChange={e => setSearchCompany(e.target.value)}
								allowClear
								style={{ width: 180 }}
							/>
							<Input
								placeholder="影子股名称/代码"
								prefix={<StockOutlined />}
								value={searchShadow}
								onChange={e => setSearchShadow(e.target.value)}
								allowClear
								style={{ width: 180 }}
							/>
							<Select
								mode="multiple"
								placeholder="上市阶段"
								value={filterStatus}
								onChange={setFilterStatus}
								options={statusOptions}
								allowClear
								maxTagCount={2}
								style={{ minWidth: 180 }}
							/>
						</Space>
						<Text type="secondary" style={{ fontSize: 12 }}>
							筛选结果：
							{filteredCount}
							{" "}
							{activeTab === "ipo" ? "家公司" : "只影子股"}
						</Text>
					</div>
				</Card>

				{/* 双维度 Tab */}
				<Tabs
					activeKey={activeTab}
					onChange={setActiveTab}
					items={[
						{
							key: "ipo",
							label: (
								<Space>
									<BankOutlined />
									<span>IPO公司维度</span>
									<Tag color="purple">{filteredTracks.reduce((s, t) => s + t.company_count, 0)}</Tag>
								</Space>
							),
							children: (
								<Collapse
									defaultActiveKey={filteredTracks.slice(0, 3).map((_, i) => String(i))}
									items={filteredTracks.map((track, idx) => ({
										key: String(idx),
										style: { marginBottom: 8, borderRadius: 8 },
										label: (
											<Space size={8}>
												<FireOutlined style={{ color: "#fa8c16" }} />
												<Text strong style={{ fontSize: 14 }}>{track.track_name}</Text>
												<Tag color="orange">
													热度
													{track.heat_score.toFixed(0)}
												</Tag>
												<Tag color="green">
													{track.company_count}
													{" "}
													家
												</Tag>
												<Progress percent={track.heat_score} showInfo={false} size="small" style={{ width: 60 }} />
											</Space>
										),
										children: (
											<div style={{ padding: "4px 0" }}>
												{track.track_description && (
													<Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
														{track.track_description}
													</Paragraph>
												)}
												{track.companies.map(co => (
													<CompanyCard key={co.company_name} company={co} />
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
									<Tag color="cyan">{shadowItems.length}</Tag>
								</Space>
							),
							children: (
								<Card size="small" style={{ borderRadius: 10 }}>
									<Descriptions size="small" column={3} style={{ marginBottom: 12 }}>
										<Descriptions.Item label="多关联(≥2家)">
											<Text strong style={{ color: "#f5222d" }}>
												{shadowItems.filter(i => i.linked_count >= 2).length}
											</Text>
											{" "}
											只
										</Descriptions.Item>
										<Descriptions.Item label="高持股(≥5%)">
											<Text strong style={{ color: "#fa8c16" }}>
												{shadowItems.filter(i => i.max_ratio >= 5).length}
											</Text>
											{" "}
											只
										</Descriptions.Item>
										<Descriptions.Item label="高弹性(≥3%)">
											<Text strong style={{ color: "#1677ff" }}>
												{shadowItems.filter(i => i.avg_gain >= 3).length}
											</Text>
											{" "}
											只
										</Descriptions.Item>
									</Descriptions>
									<Table<ShadowDimensionItem>
										dataSource={shadowItems}
										columns={shadowCols}
										rowKey={r => r.holder_stock_code || r.holder_name}
										size="small"
										scroll={{ x: 800 }}
										pagination={{ pageSize: 15, showSizeChanger: true, showTotal: t => `共 ${t} 只影子股` }}
										expandable={{
											expandedRowRender: record => (
												<div style={{ padding: "4px 8px" }}>
													<Text type="secondary" style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
														🔗 关联
														{" "}
														{record.linked_count}
														{" "}
														家 IPO 公司
													</Text>
													<Table
														dataSource={record.linked_companies}
														columns={linkedCols}
														rowKey="company_name"
														pagination={false}
														size="small"
													/>
												</div>
											),
											rowExpandable: () => true,
										}}
									/>
								</Card>
							),
						},
					]}
				/>
			</div>
		</BasicContent>
	);
}
