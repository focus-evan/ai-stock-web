import type { AggCompany, AggShadowStock, ShadowStockAggregateResponse } from "#src/api/shadow-stock";
import { fetchShadowStockAggregate } from "#src/api/shadow-stock";
import {
	FireOutlined,
	RocketOutlined,
	TrophyFilled,
} from "@ant-design/icons";

/**
 * 影子股历史聚合 — 跨所有批次按赛道 + 公司去重展示
 */
import {
	Badge,
	Card,
	Col,
	Collapse,
	Empty,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** IPO 状态颜色 */
const statusColor: Record<string, string> = {
	"辅导备案": "#8c8c8c",
	"辅导验收": "#1890ff",
	"预披露": "#2f54eb",
	"已受理": "#722ed1",
	"已问询": "#fa8c16",
	"上市委审核": "#eb2f96",
	"已过会": "#52c41a",
	"提交注册": "#13c2c2",
	"注册生效": "#389e0d",
	"已发行待上市": "#cf1322",
	"中止/暂缓": "#ff4d4f",
};

/** 风险颜色 */
const riskColor: Record<string, string> = { low: "#52c41a", medium: "#faad14", high: "#ff4d4f" };

/** 影子股表格列 */
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

/** 单个公司卡片 */
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
			{/* 头部 */}
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

			{/* 最新进展 */}
			{company.latest_progress && (
				<Paragraph
					style={{
						fontSize: 12,
						color: "rgba(255,255,255,0.5)",
						margin: "0 0 8px 0",
						lineHeight: "18px",
					}}
					ellipsis={{ rows: 2, expandable: true, symbol: "展开" }}
				>
					{company.latest_progress}
				</Paragraph>
			)}

			{/* 影子股表格 */}
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

/** 主页面 */
const ShadowStockAggregate: React.FC = () => {
	const [data, setData] = useState<ShadowStockAggregateResponse | null>(null);
	const [loading, setLoading] = useState(true);

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
									跨所有报告去重，按赛道分组
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
						</Row>
					</Col>
				</Row>
			</Card>

			{/* 赛道折叠面板 */}
			<Collapse
				defaultActiveKey={data.tracks.slice(0, 3).map((_, i) => String(i))}
				style={{ background: "transparent", border: "none" }}
				items={data.tracks.map((track, idx) => ({
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
							<Tag style={{
								background: "rgba(250,173,20,0.15)",
								color: "#faad14",
								border: "none",
								fontSize: 11,
								margin: 0,
							}}
							>
								热度
								{" "}
								{track.heat_score.toFixed(0)}
							</Tag>
							<Tag style={{
								background: "rgba(82,196,26,0.15)",
								color: "#52c41a",
								border: "none",
								fontSize: 11,
								margin: 0,
							}}
							>
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
			`}
			</style>
		</div>
	);
};

export default ShadowStockAggregate;
