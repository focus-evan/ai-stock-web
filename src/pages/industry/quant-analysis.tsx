import { Alert, Card, Select, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { QuarterTrendChart } from "./industry-charts";

interface Quarter {
	period: string
	disclosed_at?: string
	revenue?: number | null
	net_profit?: number | null
	revenue_growth?: number | null
	profit_growth?: number | null
	gross_margin?: number | null
	net_margin?: number | null
	roe?: number | null
	profit_base?: number | null
}
interface QuantCompany {
	stock_code: string
	stock_name: string
	sectors: string[]
	score: number | null
	label: string
	issues: string[]
	quarters: Quarter[]
	latest: Quarter
	market: { date?: string, market_cap?: number | null, pe_ttm?: number | null }
	mapping_scope?: string
	source_label?: string
	source_url?: string
}
export interface IndustryAnalysisBatch {
	batch_id: string
	cutoff: string
	report_period: string
	methodology: string
	limitations: string[]
	companies: QuantCompany[]
	sectors: { name: string, average_score: number | null, top3: string[], company_count: number }[]
}

const display = (value: number | null | undefined) => value == null ? "—" : value.toFixed(2);
const metrics = [
	["revenue_growth", "营收同比%"],
	["profit_growth", "归母净利同比%"],
	["gross_margin", "毛利率%"],
	["net_margin", "净利率%"],
	["revenue", "营收(亿)"],
	["net_profit", "归母净利(亿)"],
	["roe", "累计ROE%"],
] as const;

function showMetric(row: Quarter, key: typeof metrics[number][0]) {
	if (key === "profit_growth" && row[key] == null && row.profit_base != null && row.profit_base <= 0)
		return "不适用";
	return display(row[key]);
}

export default function QuantAnalysis({ analysis }: { analysis?: IndustryAnalysisBatch | null }) {
	const [selected, setSelected] = useState<string>();
	if (!analysis)
		return <Alert type="info" showIcon message="该产业尚无S量化完整批次" description="产业映射和静态实力分不能替代季度财务验证。" style={{ marginBottom: 24 }} />;
	const company = analysis.companies.find(row => row.stock_code === selected) || analysis.companies[0];
	return (
		<Space className="industry-analysis-stack" direction="vertical" style={{ width: "100%", minWidth: 0, display: "flex", marginBottom: 24 }} size="middle">
			<Alert
				type="info"
				showIcon
				message={`季度经营诊断 · 截至 ${analysis.cutoff} · 报告期 ${analysis.report_period}`}
				description={(
					<>
						<div>{analysis.methodology}</div>
						<div>合并财务用于经营验证。量化分和批次初筛标记只提示待研究问题，不自动决定研究取舍或仓位。仍需解释行业差异、现金流与主题业务贡献。</div>
						<Typography.Text type="secondary">
							批次
							{analysis.batch_id}
						</Typography.Text>
					</>
				)}
			/>
			{analysis.companies.length === 0
				? <Alert type="warning" showIcon message="公司池尚未建立，当前产业数分未完成" description="需要先建立有来源的产业链公司映射，再拉取财务并做同行PK。" />
				: (
					<>
						<Card title="公司五维PK · 最新单季度">
							<Table
								size="small"
								rowKey="stock_code"
								scroll={{ x: 1500 }}
								dataSource={analysis.companies}
								expandable={{ expandedRowRender: row => (
									<Space direction="vertical" size={4}>
										<span>{row.mapping_scope || "既有产业链研究映射；合并财务不等于主题分部财务。"}</span>
										<span>
											映射来源：
											{row.source_url && /^https?:\/\//.test(row.source_url) ? <a href={row.source_url} target="_blank" rel="noreferrer">{row.source_label || "公司披露"}</a> : (row.source_label || "既有产业图谱")}
										</span>
									</Space>
								) }}
								pagination={{ pageSize: 10 }}
								columns={[
									{ title: "公司", fixed: "left", render: (_: unknown, row: QuantCompany) => `${row.stock_name} ${row.stock_code}` },
									{ title: "赛道", render: (_: unknown, row: QuantCompany) => row.sectors.join("、") },
									{ title: "参考量化分", dataIndex: "score", render: display },
									{ title: "批次初筛标记", dataIndex: "label", render: (label: string) => <Tag color={label === "保留" ? "green" : label.includes("剔除") ? "red" : "orange"}>{label}</Tag> },
									{ title: "报告期", render: (_: unknown, row: QuantCompany) => row.latest.period || "缺失" },
									...metrics.map(([key, title]) => ({ title, render: (_: unknown, row: QuantCompany) => showMetric(row.latest, key) })),
									{ title: "市值(亿)", render: (_: unknown, row: QuantCompany) => display(row.market.market_cap) },
									{ title: "PE.ttm", render: (_: unknown, row: QuantCompany) => display(row.market.pe_ttm) },
									{ title: "行情日期", render: (_: unknown, row: QuantCompany) => row.market.date || "缺失" },
									{ title: "数据缺口", render: (_: unknown, row: QuantCompany) => row.issues.join("；") || "—" },
								]}
							/>
						</Card>
						<Card title="最近六季度 · 趋势验证">
							<Select value={company?.stock_code} onChange={setSelected} style={{ width: 240, marginBottom: 16 }} options={analysis.companies.map(row => ({ value: row.stock_code, label: `${row.stock_name} ${row.stock_code}` }))} />
							<QuarterTrendChart periods={company?.quarters || []} />
							<Table
								size="small"
								rowKey="period"
								scroll={{ x: 1000 }}
								pagination={false}
								dataSource={company?.quarters || []}
								columns={[
									{ title: "报告期", dataIndex: "period" },
									{ title: "披露日期", dataIndex: "disclosed_at" },
									...metrics.map(([key, title]) => ({ title, render: (_: unknown, row: Quarter) => showMetric(row, key) })),
								]}
							/>
						</Card>
					</>
				)}
			<Alert type="warning" showIcon message="数据与证据边界" description={analysis.limitations.join(" ")} />
		</Space>
	);
}
