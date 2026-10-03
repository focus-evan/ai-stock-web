import { Alert, Card, Select, Space, Table, Tag, Typography } from "antd";
import ReactECharts from "echarts-for-react";
import { useState } from "react";

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

export default function QuantAnalysis({ analysis }: { analysis?: IndustryAnalysisBatch | null }) {
	const [selected, setSelected] = useState<string>();
	if (!analysis)
		return <Alert type="info" showIcon message="该产业尚无S量化完整批次" description="产业映射和静态实力分不能替代季度财务验证。" style={{ marginBottom: 24 }} />;
	const company = analysis.companies.find(row => row.stock_code === selected) || analysis.companies[0];
	return (
		<Space direction="vertical" style={{ width: "100%", marginBottom: 24 }} size="middle">
			<Alert
				type="info"
				showIcon
				message={`S老师季度五维 · 截至 ${analysis.cutoff} · 报告期 ${analysis.report_period}`}
				description={(
					<>
						<div>{analysis.methodology}</div>
						<div>合并财务用于经营验证；保留/观察/剔除为研究筛选，须再核验利润池、国产替代、护城河及新业务兑现阶段。</div>
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
						<Card title="赛道经营数据PK · 合并财务口径">
							<ReactECharts
								style={{ height: Math.max(280, analysis.sectors.length * 45) }}
								option={{
									tooltip: { trigger: "axis" },
									grid: { left: 150, right: 40, top: 20, bottom: 30 },
									xAxis: { type: "value", max: 100, name: "S量化分" },
									yAxis: { type: "category", inverse: true, data: analysis.sectors.map(row => row.name) },
									series: [{ type: "bar", data: analysis.sectors.map(row => row.average_score), itemStyle: { color: "#cf183b", borderRadius: [0, 6, 6, 0] } }],
								}}
							/>
							<Table
								size="small"
								rowKey="name"
								pagination={false}
								dataSource={analysis.sectors}
								columns={[
									{ title: "赛道", dataIndex: "name" },
									{ title: "公司数", dataIndex: "company_count" },
									{ title: "均分", dataIndex: "average_score", render: display },
									{ title: "满足保留条件的前3", dataIndex: "top3", render: (names: string[]) => names.join("、") || "暂无" },
								]}
							/>
						</Card>
						<Card title="公司五维PK · 最新单季度">
							<Table
								size="small"
								rowKey="stock_code"
								scroll={{ x: 1500 }}
								dataSource={analysis.companies}
								pagination={{ pageSize: 10 }}
								columns={[
									{ title: "公司", fixed: "left", render: (_: unknown, row: QuantCompany) => `${row.stock_name} ${row.stock_code}` },
									{ title: "赛道", render: (_: unknown, row: QuantCompany) => row.sectors.join("、") },
									{ title: "S量化分", dataIndex: "score", render: display },
									{ title: "结论", dataIndex: "label", render: (label: string) => <Tag color={label === "保留" ? "green" : label === "剔除" ? "red" : "orange"}>{label}</Tag> },
									{ title: "报告期", render: (_: unknown, row: QuantCompany) => row.latest.period || "缺失" },
									...metrics.map(([key, title]) => ({ title, render: (_: unknown, row: QuantCompany) => display(row.latest[key]) })),
									{ title: "市值(亿)", render: (_: unknown, row: QuantCompany) => display(row.market.market_cap) },
									{ title: "PE.ttm", render: (_: unknown, row: QuantCompany) => display(row.market.pe_ttm) },
									{ title: "行情日期", render: (_: unknown, row: QuantCompany) => row.market.date || "缺失" },
									{ title: "数据缺口", render: (_: unknown, row: QuantCompany) => row.issues.join("；") || "—" },
								]}
							/>
						</Card>
						<Card title="最近六季度 · 趋势验证">
							<Select value={company?.stock_code} onChange={setSelected} style={{ width: 240, marginBottom: 16 }} options={analysis.companies.map(row => ({ value: row.stock_code, label: `${row.stock_name} ${row.stock_code}` }))} />
							<ReactECharts
								style={{ height: 280 }}
								option={{ tooltip: { trigger: "axis" }, legend: { data: ["营收(亿)", "归母净利(亿)"] }, xAxis: { type: "category", data: [...(company?.quarters || [])].reverse().map(row => row.period) }, yAxis: { type: "value" }, series: ["revenue", "net_profit"].map((key, index) => ({ name: ["营收(亿)", "归母净利(亿)"][index], type: "line", connectNulls: false, data: [...(company?.quarters || [])].reverse().map(row => row[key as "revenue" | "net_profit"] ?? null) })) }}
							/>
							<Table
								size="small"
								rowKey="period"
								scroll={{ x: 1000 }}
								pagination={false}
								dataSource={company?.quarters || []}
								columns={[
									{ title: "报告期", dataIndex: "period" },
									{ title: "披露日期", dataIndex: "disclosed_at" },
									...metrics.map(([key, title]) => ({ title, dataIndex: key, render: display })),
								]}
							/>
						</Card>
					</>
				)}
			<Alert type="warning" showIcon message="数据与证据边界" description={analysis.limitations.join(" ")} />
		</Space>
	);
}
