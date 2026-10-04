import type { ReactNode } from "react";
import type { IndustryAnalysisBatch } from "./quant-analysis";
import type { IndustryResearch, ResearchCompany } from "./research-model";
import { Alert, Button, Card, Collapse, Empty, Select, Table, Tabs, Tag, Typography } from "antd";
import { useMemo, useRef, useState } from "react";
import { AIEvolutionPanel, AIJudgmentCard, AIResearchStatus, useIndustryAI } from "./ai-research";
import QuantAnalysis from "./quant-analysis";
import { decisionLabels, safeEvidenceUrl } from "./research-model";
import SectorOverview from "./sector-overview";
import "./research-workbench.css";

const { Paragraph, Text, Title } = Typography;
const num = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "待补";
const colors = { focus: "blue", watch: "orange", exclude: "default" };

function Evidence({ company }: { company: ResearchCompany }) {
	const observation = company.observation;
	const url = safeEvidenceUrl(observation.source_url);
	return (
		<div className="industry-evidence">
			<div>{observation.mapping_scope}</div>
			<Text type="secondary">
				映射依据：
				{url ? <a href={url} target="_blank" rel="noreferrer">{observation.mapping_source || "来源文件"}</a> : observation.mapping_source || "尚未提供"}
			</Text>
		</div>
	);
}

interface Props { chainCode: string, research: IndustryResearch, analysis?: IndustryAnalysisBatch | null, legacy: () => ReactNode }

function HistoricalCatalog({ render }: { render: () => ReactNode }) {
	return render();
}

export default function ResearchWorkbench({ chainCode, research, analysis, legacy }: Props) {
	const ai = useIndustryAI(chainCode);
	const judgments = useMemo(() => Object.fromEntries((ai.data?.latest?.output?.sectors || []).map(item => [item.subject_id, item])), [ai.data]);
	const [filter, setFilter] = useState("all");
	const [selectedId, setSelectedId] = useState((research.sectors.find(s => s.financial_count > 0) || research.sectors.find(s => s.companies.length > 0) || research.sectors[0])?.id);
	const [activeResearchTab, setActiveResearchTab] = useState("panorama");
	const overviewRef = useRef<HTMLDivElement>(null);
	const selectSector = (id: string) => {
		setSelectedId(id);
		if (activeResearchTab === "panorama")
			requestAnimationFrame(() => overviewRef.current?.scrollIntoView?.({ block: "start" }));
	};
	const visible = research.sectors.filter(sector => filter === "all" || (filter === "pending" ? !ai.data?.current || !judgments[sector.id] : ai.data?.current && judgments[sector.id]?.decision === filter));
	const selected = visible.find(sector => sector.id === selectedId) || visible[0];
	const financial = useMemo(() => {
		if (!analysis || !selected)
			return analysis;
		const observations = new Map(selected.companies.filter(c => c.observation.financial_status === "available").map(c => [c.stock_code, c.observation]));
		return { ...analysis, companies: analysis.companies.filter(c => observations.has(c.stock_code)).map((company) => {
			const observation = observations.get(company.stock_code)!;
			return { ...company, latest: { ...company.latest, ...observation.metrics }, market: { ...observation.market, date: observation.market.date || undefined }, quarters: company.quarters.filter(q => q.disclosed_at && q.disclosed_at >= q.period && q.disclosed_at <= analysis.cutoff && q.period <= analysis.report_period) };
		}), sectors: analysis.sectors.filter(s => s.name === selected.name) };
	}, [analysis, selected]);
	const exportRecords = () => {
		const blob = new Blob([JSON.stringify({ chain: chainCode, exportedAt: new Date().toISOString(), aiResearch: ai.data, strategy: ai.strategy }, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `industry-ai-${chainCode.replace(/[^\w-]/g, "_")}.json`;
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};
	const companyColumn = { title: "公司", key: "company", render: (_: unknown, row: ResearchCompany) => (
		<>
			<Text strong>{row.stock_name}</Text>
			<br />
			<Text type="secondary">
				{row.stock_code}
				{" "}
				·
				{" "}
				{row.market || "市场待补"}
			</Text>
		</>
	) };
	return (
		<div className="s-industry-workbench">
			<div className="industry-research-intro">
				<div>
					<Tag color="red">S老师产业研究方法</Tag>
					<Title level={3}>先看全景，再聚焦值得深研的环节</Title>
					<Paragraph>{research.question}</Paragraph>
				</div>
				<Button onClick={exportRecords}>导出AI研究与复盘</Button>
			</div>
			<div className="industry-research-stats">
				{[["一级结构", research.summary.layer_count], ["细分环节", research.summary.sector_count], ["映射公司", research.summary.company_count], ["已对齐财务样本", research.summary.financial_company_count]].map(([label, value]) => (
					<div key={label}>
						<strong>{value}</strong>
						<span>{label}</span>
					</div>
				))}
			</div>
			<Paragraph type="secondary">
				资料截止：
				{research.cutoff || "待核验"}
				{" "}
				· 统一报告期：
				{research.report_period || "待补"}
				。财务仅为合并报表，产业目录描述仍需逐条核验。
			</Paragraph>
			<AIResearchStatus {...ai} onRefresh={() => { void ai.refresh(); }} />
			<div className="industry-research-toolbar">
				<label>
					研究范围
					<Select aria-label="研究范围" value={filter} onChange={setFilter} options={[{ value: "all", label: "全部环节" }, { value: "pending", label: "等待AI研究 / 复核" }, ...Object.entries(decisionLabels).map(([value, label]) => ({ value, label }))]} />
				</label>
				<label>
					选择细分环节
					<Select aria-label="选择细分环节" showSearch optionFilterProp="label" value={selected?.id} onChange={selectSector} options={visible.map(s => ({ value: s.id, label: `${s.layer_name} / ${s.name}` }))} />
				</label>
				<Text type="secondary">AI判断与证据保存在服务器，自动复核并保留历史版本。</Text>
			</div>
			<Tabs
				className="industry-research-tabs"
				activeKey={activeResearchTab}
				onChange={setActiveResearchTab}
				items={[
					{ key: "panorama", label: "全景与取舍", children: (
						<div className="industry-overview-layout">
							<div className="industry-overview-main" ref={overviewRef}>
								{selected
									? (
										<>
											<SectorOverview sector={selected} period={research.report_period} onOpen={setActiveResearchTab} />
											<Collapse items={[{ key: "research-gaps", label: "行业规模、成长空间与资料缺口", children: (
												<>
													<div className="industry-fact-grid">
														{selected.facts.map(f => (
															<section key={f.key}>
																<Text strong>{f.label}</Text>
																<p>{f.value ? `${f.value}（历史字段，来源与单位待核验）` : "待补证据"}</p>
																<Text type="secondary">{f.question}</Text>
															</section>
														))}
													</div>
													<ul className="industry-research-list">{selected.gaps.map(g => <li key={g}>{g}</li>)}</ul>
												</>
											) }]}
											/>
											<AIJudgmentCard title={selected.name} judgment={judgments[selected.id]} evidence={ai.data?.latest?.evidence} current={!!ai.data?.current} />
										</>
									)
									: <Empty description="当前范围没有待展示的环节" />}
							</div>
							<aside className="industry-panorama-grid" aria-label="产业全景导航">
								{Array.from(new Set(visible.map(s => s.layer_name))).map(layer => (
									<Card key={layer} size="small" title={layer}>
										<div className="industry-sector-list">
											{visible.filter(s => s.layer_name === layer).map(s => (
												<button type="button" aria-pressed={selected?.id === s.id} className={selected?.id === s.id ? "is-selected" : ""} key={s.id} onClick={() => selectSector(s.id)}>
													<strong>{s.name}</strong>
													<span>
														{s.companies.slice(0, 3).map(c => c.stock_name).join("、") || "公司关联缺失"}
														{s.companies.length > 3 ? "等" : ""}
													</span>
													<Tag color={s.financial_count ? "blue" : "default"}>{s.financial_count ? `${s.financial_count} 家财务已载入` : s.companies.length ? "公司已关联 · 财务待补" : "资料缺口"}</Tag>
													{judgments[s.id] && (
														<Tag color={ai.data?.current ? colors[judgments[s.id].decision] : "orange"}>
															AI：
															{decisionLabels[judgments[s.id].decision]}
															{!ai.data?.current && " · 历史"}
														</Tag>
													)}
												</button>
											))}
										</div>
									</Card>
								))}
							</aside>
						</div>
					) },
					{ key: "competition", label: "竞争格局 → 焦点 → 优势", children: selected
						? (
							<>
								<Card title={`${selected.name} · 竞争研究`}>
									<Alert type="info" showIcon message={selected.competition.status} />
									<div className="industry-competition-grid">
										{[["竞争格局", selected.competition.landscape, "谁参与，位置如何变化？"], ["竞争焦点", selected.competition.focus, "这个阶段真正比什么？"], ["壁垒线索", selected.competition.barriers, "优势如何持续，需要哪些验证？"]].map(([name, values, prompt]) => (
											<section key={name as string}>
												<Title level={5}>{name as string}</Title>
												<ul>{(values as string[]).map(v => <li key={v}>{v}</li>)}</ul>
												{!(values as string[]).length && <Text type="secondary">资料待补</Text>}
												<p>{prompt as string}</p>
											</section>
										))}
									</div>
									<Paragraph type="secondary">观察角度可包括同行、上下游、地域扩张和第二增长曲线，按行业选择，不要求每次凑齐四项。</Paragraph>
								</Card>
								<Card title="公司优势如何对应竞争焦点"><Table rowKey="stock_code" size="small" scroll={{ x: 850 }} dataSource={selected.companies} columns={[companyColumn, { title: "产品与位置", dataIndex: "products", render: value => value || "待补" }, { title: "已有优势线索（待核验）", dataIndex: "advantage_clue", render: value => value || "尚无优势证据" }, { title: "映射依据与边界", render: (_, c: ResearchCompany) => <Evidence company={c} /> }]} /></Card>
								{(ai.data?.latest?.output?.companies || []).filter(c => c.sector_ids?.includes(selected.id)).map(company => <AIJudgmentCard key={company.subject_id} title={company.name} judgment={company} evidence={ai.data?.latest?.evidence} current={!!ai.data?.current} />)}
							</>
						)
						: <Empty description="先选择有数据的细分环节" /> },
					{ key: "financial", label: "公司与财务验证", children: selected
						? (
							<>
								<Card title={`${selected.name} · 先诊断，再作判断`}><Table rowKey="stock_code" size="small" scroll={{ x: 780 }} dataSource={selected.companies} columns={[companyColumn, { title: "证据状态", render: (_, c: ResearchCompany) => <Tag color={c.observation.financial_status === "available" ? "blue" : "orange"}>{c.observation.financial_status === "available" ? "报告期已对齐" : "数据待补"}</Tag> }, { title: "需要解释的经营问题", render: (_, c: ResearchCompany) => <ul className="industry-research-list">{[...c.observation.financial_gaps, ...c.observation.diagnostics].map(x => <li key={x}>{x}</li>)}</ul> }, { title: "业务口径", render: (_, c: ResearchCompany) => c.observation.business_scope }]} /></Card>
								{selected.financial_count ? <QuantAnalysis key={selected.id} analysis={financial} /> : <Alert type="warning" showIcon message="该环节尚无可对齐的财务样本" description="先补齐报告期和披露日期，再比较经营数据。缺数据不等于公司或赛道应该被排除。" />}
							</>
						)
						: <Empty description="先选择有数据的细分环节" /> },
					{ key: "valuation", label: "估值与持续跟踪", children: selected
						? (
							<>
								<Card title="好公司与好价格分别判断">
									<Paragraph>行情数据用于提出问题：当前价格隐含怎样的成长、多久能兑现、什么证据会改变判断。单个 PE 数字不能证明低估。</Paragraph>
									<Table rowKey="stock_code" size="small" scroll={{ x: 780 }} dataSource={selected.companies} columns={[companyColumn, { title: "市值（亿）", render: (_, c: ResearchCompany) => num(c.observation.market.market_cap) }, { title: "PE.ttm", render: (_, c: ResearchCompany) => num(c.observation.market.pe_ttm) }, { title: "行情日期", render: (_, c: ResearchCompany) => c.observation.market.date || "待补" }, { title: "研究状态", render: (_, c: ResearchCompany) => c.observation.valuation_status }]} />
								</Card>
								<Card title="季检、年检与变化触发">
									<ul className="industry-research-list">{selected.monitoring.map(item => <li key={item}>{item}</li>)}</ul>
									{judgments[selected.id] && (
										<Paragraph style={{ marginTop: 12 }}>
											AI下一轮核对：
											{judgments[selected.id].next_check}
										</Paragraph>
									)}
								</Card>
							</>
						)
						: <Empty description="先选择有数据的细分环节" /> },
					{ key: "evolution", label: "AI复盘与自进化", children: <AIEvolutionPanel data={ai.data} strategy={ai.strategy} chain={chainCode} /> },
					{ key: "sources", label: "方法与原始资料", children: (
						<>
							<Card title="按研究对象组合方法">
								<div className="industry-fact-grid">
									{research.methods.map(method => (
										<section key={method.id}>
											<Text strong>{method.name}</Text>
											<p>{method.purpose}</p>
										</section>
									))}
								</div>
								<ul className="industry-research-list">{research.principles.map(p => <li key={p}>{p}</li>)}</ul>
							</Card>
							<Alert type="warning" showIcon message="当前证据范围" description={<ul>{research.limitations.map(x => <li key={x}>{x}</li>)}</ul>} />
							<Collapse items={[{ key: "catalog", label: "展开原有产业图谱与历史资料", children: <HistoricalCatalog render={legacy} /> }]} />
						</>
					) },
				]}
			/>
		</div>
	);
}
