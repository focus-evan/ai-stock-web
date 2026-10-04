import type { ReactNode } from "react";
import type { IndustryAnalysisBatch } from "./quant-analysis";
import type { IndustryResearch, ResearchCompany, ResearchDecision, ResearchReview, ResearchReviews, ResearchSector } from "./research-model";
import { useUserStore } from "#src/store/user";
import { Alert, Button, Card, Collapse, Descriptions, Empty, Input, Select, Table, Tabs, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import QuantAnalysis from "./quant-analysis";
import { decisionLabels, parseReviews, reviewIsCurrent, reviewStorageKey, safeEvidenceUrl, validateReview } from "./research-model";
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

function ReviewForm({ sector, previous, snapshotKey, onSave }: {
	sector: Pick<ResearchSector, "id" | "name">
	previous?: ResearchReview
	snapshotKey: string
	onSave: (value: ResearchReview) => void
}) {
	const [decision, setDecision] = useState<ResearchDecision>(previous?.decision || "watch");
	const [reason, setReason] = useState(previous?.reason || "");
	const [signal, setSignal] = useState(previous?.signal || "");
	const [evidenceUrl, setEvidenceUrl] = useState(previous?.evidenceUrl || "");
	const [error, setError] = useState<string | null>(null);
	return (
		<Card title={`${sector.name} · 研究取舍与复核条件`} className="industry-review-card">
			{previous && !reviewIsCurrent(previous, snapshotKey) && <Alert type="warning" showIcon message="资料已更新，上次取舍需要重新核验" description="下方保留原理由，确认本批资料后再保存。" />}
			<Paragraph type="secondary">这是你的研究记录。量化分、公司规模和市场标签不会自动替你作取舍。</Paragraph>
			<div className="industry-review-fields">
				<label>
					研究处理
					<Select aria-label="研究处理" value={decision} onChange={setDecision} options={Object.entries(decisionLabels).map(([value, label]) => ({ value, label }))} />
				</label>
				<label>
					取舍理由
					<Input.TextArea aria-label="取舍理由" value={reason} maxLength={2000} rows={3} onChange={event => setReason(event.target.value)} placeholder="哪些证据支持这个取舍？最重要的未知或反证是什么？" />
				</label>
				<label>
					下一次验证或重新纳入条件
					<Input.TextArea aria-label="下一次验证条件" value={signal} maxLength={1000} rows={2} onChange={event => setSignal(event.target.value)} placeholder="例如：客户交付、利润转化或下次财报出现什么变化时复核。" />
				</label>
				<label>
					补充证据链接（选填）
					<Input aria-label="补充证据链接" value={evidenceUrl} maxLength={2000} onChange={event => setEvidenceUrl(event.target.value)} placeholder="公告、财报或可靠行业材料" />
				</label>
			</div>
			{error && <Alert type="error" showIcon message={error} />}
			<Button
				type="primary"
				onClick={() => {
					const invalid = validateReview({ reason, signal, evidenceUrl });
					setError(invalid);
					if (!invalid)
						onSave({ sectorId: sector.id, snapshotKey, decision, reason: reason.trim(), signal: signal.trim(), evidenceUrl: evidenceUrl.trim(), updatedAt: new Date().toISOString() });
				}}
			>
				保存研究记录
			</Button>
		</Card>
	);
}

interface Props { chainCode: string, research: IndustryResearch, analysis?: IndustryAnalysisBatch | null, legacy: () => ReactNode }

function HistoricalCatalog({ render }: { render: () => ReactNode }) {
	return render();
}

function CompanyReview({ sector, reviews, snapshotKey, onSave }: { sector: ResearchSector, reviews: ResearchReviews, snapshotKey: string, onSave: (value: ResearchReview) => void }) {
	const [code, setCode] = useState(sector.companies[0]?.stock_code);
	const company = sector.companies.find(c => c.stock_code === code) || sector.companies[0];
	if (!company)
		return null;
	const id = `${sector.id}/company/${company.stock_code}`;
	return (
		<>
			<label>
				选择公司作取舍
				<Select aria-label="选择公司作取舍" value={company.stock_code} onChange={setCode} options={sector.companies.map(c => ({ value: c.stock_code, label: `${c.stock_name} ${c.stock_code}` }))} style={{ width: 260, margin: 12 }} />
			</label>
			<ReviewForm key={`${id}:${reviews[id]?.updatedAt || ""}:${snapshotKey}`} sector={{ id, name: company.stock_name }} previous={reviews[id]} snapshotKey={snapshotKey} onSave={onSave} />
		</>
	);
}

export default function ResearchWorkbench(props: Props) {
	const userId = useUserStore(state => String(state.id || ""));
	return <Workspace key={`${userId}:${props.chainCode}`} {...props} userId={userId} />;
}

function Workspace({ chainCode, research, analysis, legacy, userId }: Props & { userId: string }) {
	const storageKey = reviewStorageKey(userId, chainCode);
	const [initial] = useState(() => {
		try {
			return { reviews: parseReviews(storageKey ? localStorage.getItem(storageKey) : null), error: "" };
		}
		catch { return { reviews: {} as ResearchReviews, error: "本机记录暂时无法读取，本次修改可通过导出保存。" }; }
	});
	const [reviews, setReviews] = useState(initial.reviews);
	const [storageError, setStorageError] = useState(initial.error);
	const [notice, setNotice] = useState("");
	const [filter, setFilter] = useState("all");
	const [selectedId, setSelectedId] = useState(research.sectors[0]?.id);
	const visible = research.sectors.filter((sector) => {
		const review = reviews[sector.id];
		const current = reviewIsCurrent(review, research.snapshot_key);
		return filter === "all" || (filter === "pending" ? !current : current && review.decision === filter);
	});
	const selected = visible.find(sector => sector.id === selectedId) || visible[0];
	const staleCount = Object.values(reviews).filter(r => !reviewIsCurrent(r, research.snapshot_key)).length;
	const financial = useMemo(() => {
		if (!analysis || !selected)
			return analysis;
		const observations = new Map(selected.companies.filter(c => c.observation.financial_status === "available").map(c => [c.stock_code, c.observation]));
		return { ...analysis, companies: analysis.companies.filter(c => observations.has(c.stock_code)).map((company) => {
			const observation = observations.get(company.stock_code)!;
			return { ...company, latest: { ...company.latest, ...observation.metrics }, market: { ...observation.market, date: observation.market.date || undefined }, quarters: company.quarters.filter(q => q.disclosed_at && q.disclosed_at >= q.period && q.disclosed_at <= analysis.cutoff && q.period <= analysis.report_period) };
		}), sectors: analysis.sectors.filter(s => s.name === selected.name) };
	}, [analysis, selected]);
	const save = (review: ResearchReview) => {
		const next = { ...reviews, [review.sectorId]: review };
		setReviews(next);
		if (storageKey && !storageError) {
			try {
				localStorage.setItem(storageKey, JSON.stringify({ version: 1, entries: Object.values(next) }));
				setNotice("研究记录已保存到本机，按当前账号区分。");
			}
			catch { setStorageError("本机存储不可用，请导出研究记录，避免刷新后丢失。"); }
		}
		else { setNotice("本次研究记录已更新，请导出保存。"); }
	};
	const exportRecords = () => {
		const blob = new Blob([JSON.stringify({ chain: chainCode, exportedAt: new Date().toISOString(), research, reviews: Object.values(reviews), note: "个人研究记录，不是系统自动投资评级；旧快照记录需要复核。" }, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `industry-research-${chainCode.replace(/[^\w-]/g, "_")}.json`;
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
				<Button onClick={exportRecords}>导出研究记录</Button>
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
			{staleCount > 0 && <Alert type="warning" showIcon message={`${staleCount} 条历史取舍需要复核`} description="产业资料或财务批次已变化，旧记录不自动计入本批深研、观察或排除清单。" />}
			{(storageError || notice) && <Alert type={storageError ? "warning" : "success"} showIcon message={storageError || notice} />}
			<div className="industry-research-toolbar">
				<label>
					研究范围
					<Select aria-label="研究范围" value={filter} onChange={setFilter} options={[{ value: "all", label: "全部环节" }, { value: "pending", label: "待研究 / 待复核" }, ...Object.entries(decisionLabels).map(([value, label]) => ({ value, label }))]} />
				</label>
				<label>
					选择细分环节
					<Select aria-label="选择细分环节" showSearch optionFilterProp="label" value={selected?.id} onChange={setSelectedId} options={visible.map(s => ({ value: s.id, label: `${s.layer_name} / ${s.name}` }))} />
				</label>
				<Text type="secondary">取舍记录按账号保存在此设备，可导出留档。</Text>
			</div>
			<Tabs
				className="industry-research-tabs"
				items={[
					{ key: "panorama", label: "全景与取舍", children: (
						<>
							<div className="industry-panorama-grid">
								{Array.from(new Set(research.sectors.map(s => s.layer_name))).map(layer => (
									<Card key={layer} size="small" title={layer}>
										<div className="industry-sector-list">
											{visible.filter(s => s.layer_name === layer).map(s => (
												<button type="button" aria-pressed={selected?.id === s.id} className={selected?.id === s.id ? "is-selected" : ""} key={s.id} onClick={() => setSelectedId(s.id)}>
													<strong>{s.name}</strong>
													<span>
														{s.companies.length}
														{" "}
														家映射 ·
														{" "}
														{s.financial_count}
														{" "}
														家财务样本
													</span>
													{reviewIsCurrent(reviews[s.id], research.snapshot_key) ? <Tag color={colors[reviews[s.id].decision]}>{decisionLabels[reviews[s.id].decision]}</Tag> : <Tag>待研究 / 待复核</Tag>}
												</button>
											))}
										</div>
									</Card>
								))}
							</div>
							{selected
								? (
									<>
										<Card title={`${selected.name} · 赛道基本马步`}>
											<Paragraph>{selected.description || "产品边界与产业位置尚待补充。"}</Paragraph>
											<div className="industry-fact-grid">
												{selected.facts.map(f => (
													<section key={f.key}>
														<Text strong>{f.label}</Text>
														<p>{f.value ? `${f.value}（历史字段，来源与单位待核验）` : "待补证据"}</p>
														<Text type="secondary">{f.question}</Text>
													</section>
												))}
											</div>
										</Card>
										<Card title="下一步先补什么"><ul className="industry-research-list">{selected.gaps.map(g => <li key={g}>{g}</li>)}</ul></Card>
										<ReviewForm key={`${selected.id}:${reviews[selected.id]?.updatedAt || ""}:${research.snapshot_key}`} sector={selected} previous={reviews[selected.id]} snapshotKey={research.snapshot_key} onSave={save} />
									</>
								)
								: <Empty description="当前范围没有待展示的环节" />}
						</>
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
								<CompanyReview key={selected.id} sector={selected} reviews={reviews} snapshotKey={research.snapshot_key} onSave={save} />
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
									{reviews[selected.id] && (
										<Descriptions
											column={1}
											items={[{ key: "decision", label: "已记录取舍", children: (
												<>
													{decisionLabels[reviews[selected.id].decision]}
													{!reviewIsCurrent(reviews[selected.id], research.snapshot_key) && <Tag color="orange">待复核</Tag>}
												</>
											) }, { key: "reason", label: "理由", children: reviews[selected.id].reason }, { key: "signal", label: "复核条件", children: reviews[selected.id].signal }]}
										/>
									)}
								</Card>
							</>
						)
						: <Empty description="先选择有数据的细分环节" /> },
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
