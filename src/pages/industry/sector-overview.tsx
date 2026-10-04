import type { ResearchCompany, ResearchSector } from "./research-model";
import { Alert, Button, Card, Empty, Table, Tag, Typography } from "antd";

const { Paragraph, Text } = Typography;
const metrics = [
	["revenue", "营收（亿）", false],
	["net_profit", "归母净利（亿）", false],
	["revenue_growth", "营收同比", true],
	["profit_growth", "净利同比", true],
	["gross_margin", "毛利率", true],
	["net_margin", "净利率", true],
] as const;

function metric(company: ResearchCompany, key: string, percent: boolean) {
	const value = company.observation.metrics[key];
	if (company.observation.financial_status !== "available" || typeof value !== "number" || !Number.isFinite(value))
		return "—";
	return `${value.toFixed(2)}${percent ? "%" : ""}`;
}

export default function SectorOverview({ sector, period, onOpen }: { sector: ResearchSector, period: string | null, onOpen: (tab: string) => void }) {
	const available = sector.companies.filter(c => c.observation.financial_status === "available").length;
	return (
		<Card className="industry-selected-data" title={`${sector.name} · 公司与经营数据`} extra={<Button type="link" onClick={() => onOpen("financial")}>完整财务与趋势</Button>}>
			<Paragraph>
				{sector.description || "产业位置说明尚未补充。"}
				<Text type="secondary">（目录说明，历史研究线索）</Text>
			</Paragraph>
			{sector.companies.length > 0
				? (
					<>
						<Paragraph type="secondary">
							{sector.companies.length}
							{" "}
							家公司 ·
							{available}
							{" "}
							家财务已载入 · 单季度
							{period || "报告期待补"}
							。以下是公司合并报表，主题业务收入占比另需核验。横线表示缺失或不可比。
						</Paragraph>
						<div className="industry-overview-table">
							<Table<ResearchCompany>
								size="small"
								rowKey="stock_code"
								dataSource={sector.companies}
								scroll={{ x: 860 }}
								pagination={sector.companies.length > 6 ? { pageSize: 6, showSizeChanger: false } : false}
								columns={[
									{ title: "公司", fixed: "left", width: 148, render: (_, c) => (
										<div>
											<Text strong>{c.stock_name}</Text>
											<br />
											<Text type="secondary">{c.stock_code}</Text>
										</div>
									) },
									...metrics.map(([key, title, percent]) => ({ title, key, align: "right" as const, render: (_: unknown, c: ResearchCompany) => metric(c, key, percent) })),
								]}
								expandable={{ expandedRowRender: c => (
									<div>
										<Paragraph>{c.products || "产品说明待补"}</Paragraph>
										<Paragraph>{c.observation.mapping_scope}</Paragraph>
										<Text type="secondary">
											披露日期：
											{c.observation.disclosed_at || "待补"}
										</Text>
									</div>
								) }}
							/>
						</div>
						<div className="industry-overview-mobile">
							{sector.companies.map(c => (
								<section key={c.stock_code}>
									<Text strong>
										{c.stock_name}
										{" "}
										<Text type="secondary">{c.stock_code}</Text>
									</Text>
									<dl>
										{metrics.map(([key, title, percent]) => (
											<div key={key}>
												<dt>{title}</dt>
												<dd>{metric(c, key, percent)}</dd>
											</div>
										))}
									</dl>
									<Text type="secondary">
										披露：
										{c.observation.disclosed_at || "待补"}
									</Text>
								</section>
							))}
						</div>
						{available < sector.companies.length && <Alert type="info" showIcon message={`${sector.companies.length - available} 家公司财务尚未对齐`} description="横线表示该项缺失或不可比。具体缺口可在完整财务页查看。" />}
					</>
				)
				: <Empty description="此环节尚未建立公司关联，本批财务也未包含该环节。当前为真实资料缺口。" />}
			<div className="industry-overview-clues">
				<div>
					<Tag>已有竞争线索 · 待核验</Tag>
					<Button type="link" size="small" onClick={() => onOpen("competition")}>展开竞争研究</Button>
				</div>
				{sector.competition.focus.length || sector.competition.landscape.length
					? <Paragraph>{(sector.competition.focus.length ? sector.competition.focus : sector.competition.landscape).join("；")}</Paragraph>
					: <Paragraph type="secondary">竞争资料尚未补齐，可先从公司产品、经营数据和证据来源展开研究。</Paragraph>}
			</div>
		</Card>
	);
}
