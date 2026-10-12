import type { ResearchImpact, ResearchReport } from "#src/api/institutional-research";
import { backfillFocusResearch, backfillInstitutionalResearch, backfillPublicResearch, fetchInstitutionalReport, fetchInstitutionalResearch, rebuildHoldingAssociations, refreshInstitutionalResearch } from "#src/api/institutional-research";
import { BasicContent } from "#src/components/basic-content";
import { ImpactCard, impactNames } from "#src/components/institutional-holding-evidence/ImpactCard";
import { useUserStore } from "#src/store/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Checkbox, Col, Descriptions, Drawer, Empty, Input, List, Row, Select, Space, Spin, Statistic, Table, Tabs, Tag, Typography } from "antd";
import ReactECharts from "echarts-for-react";
import { useState } from "react";
import { contentTypeNames, directionNames, evidenceNames, filterReports, percent, safeLink, statusNames } from "./data";
import { ImportDialog } from "./import-dialog";

const { Title, Text, Paragraph } = Typography;
const stamp = (s?: string) => s ? new Date(s).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "—";
const direction = (s: string) => <Tag color={s === "bullish" ? "red" : s === "bearish" ? "green" : "default"}>{directionNames[s] || s}</Tag>;

function sourceLink(payload: ResearchReport["payload"], label = evidenceNames[payload.evidence_level] || "打开来源") {
	const href = safeLink(payload.source_url);
	return href
		? (
			<a href={href} target="_blank" rel="noopener noreferrer" title="在新窗口打开原文或来源页面">
				{label}
				<span aria-hidden="true"> ↗</span>
			</a>
		)
		: (
			<Text type="secondary">
				{label}
				（链接不可用）
			</Text>
		);
}

export default function InstitutionalResearchPage() {
	const [institution, setInstitution] = useState("");
	const [keyword, setKeyword] = useState("");
	const [contentType, setContentType] = useState("");
	const [holdingsOnly, setHoldingsOnly] = useState(false);
	const [sourceGroup, setSourceGroup] = useState("focus");
	const [selected, setSelected] = useState<string | null>(null);
	const [importing, setImporting] = useState(false);
	const [draft, setDraft] = useState<ResearchReport | null>(null);
	const [starting, setStarting] = useState(false);
	const roles = useUserStore(s => s.roles);
	const username = useUserStore(s => s.username);
	const admin = roles.includes("admin");
	const client = useQueryClient();
	const { message } = App.useApp();
	const query = useQuery({ queryKey: ["institutional-research", username], queryFn: fetchInstitutionalResearch, refetchInterval: q => q.state.data?.data.history[0]?.status === "running" ? 5000 : 60000 });
	const detail = useQuery({ queryKey: ["institutional-report", selected], queryFn: () => fetchInstitutionalReport(selected!), enabled: !!selected });
	const data = query.data?.data;
	const names = Object.fromEntries((data?.sources || []).map(s => [s.id, s.name]));
	const groupFor = (id: string) => data?.sources.find(s => s.id === id)?.group || "focus";
	const groupTag = (id: string) => <Tag color={groupFor(id) === "focus" ? "blue" : "default"}>{groupFor(id) === "focus" ? "重点机构" : "补充公开源"}</Tag>;
	const reports = filterReports(data?.reports || [], institution, keyword, contentType).filter(r => (!sourceGroup || groupFor(r.institution) === sourceGroup) && (!holdingsOnly || !!r.holding_impacts?.length)).sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
	const report = detail.data?.data;
	const selectedHoldingImpacts = data?.reports.find(r => r.id === selected)?.holding_impacts || [];
	const review = report?.review;
	const latest = data?.history[0];
	async function refresh(backfill: boolean | "focus" | "public" | "associations" = false) {
		setStarting(true);
		try {
			const result = await (backfill === "associations" ? rebuildHoldingAssociations(institution) : backfill === "public" ? backfillPublicResearch(institution) : backfill === "focus" ? backfillFocusResearch() : backfill ? backfillInstitutionalResearch() : refreshInstitutionalResearch());
			message.info(result.status === "started" ? backfill === "associations" ? "持仓关联分析已开始" : "采集和历史检验已开始" : result.status === "busy" ? "已有任务运行，正在查看进度" : "短时间内已运行，请稍后重试");
			await client.invalidateQueries({ queryKey: ["institutional-research"] });
		}
		catch { message.error("任务未启动，请重试"); }
		finally { setStarting(false); }
	}
	const columns = [
		{ title: "发布 / 机构", key: "source", width: 185, render: (_: unknown, r: ResearchReport) => (
			<>
				<div>{r.payload.time_precision === "month" ? `${r.payload.publication_month}（仅知月份）` : r.payload.report_date || stamp(r.published_at)}</div>
				{r.payload.catalog_published_at && (
					<div>
						<Text type="secondary">
							公开收录
							{r.payload.catalog_published_at.slice(0, 10)}
						</Text>
					</div>
				)}
				{r.payload.time_precision === "unknown" && <div><Text type="secondary">{r.payload.content_type && r.payload.content_type !== "report" ? "来源时间，内容待核验" : "来源时间，原报告时间待核验"}</Text></div>}
				<Text type="secondary">{names[r.institution]}</Text>
				<div>{groupTag(r.institution)}</div>
			</>
		) },
		{ title: "研报、观点与消息", key: "title", render: (_: unknown, r: ResearchReport) => (
			<>
				<Button type="link" style={{ padding: 0, whiteSpace: "normal", height: "auto", textAlign: "left" }} onClick={() => setSelected(r.id)}>{r.payload.title}</Button>
				<Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4 }}>{r.payload.summary}</Paragraph>
				<Tag>{contentTypeNames[r.payload.content_type || "report"]}</Tag>
				<Tag>{sourceLink(r.payload)}</Tag>
				<Tag color={r.payload.verified ? "blue" : "orange"}>{r.payload.verified ? r.payload.evidence_level === "reprint" ? "公开转载已核验" : r.payload.verification_method === "pdf_catalog" ? "PDF原文核验" : "原文证据已核验" : "待核验"}</Tag>
			</>
		) },
		{ title: "我的持仓影响", key: "holdings", width: 330, render: (_: unknown, r: ResearchReport) => r.holding_impacts?.length
			? (
				<>
					<Space wrap>{r.holding_impacts.map(i => <Tag key={`${i.symbol}-${i.relation}`} color={i.direction === "bullish" ? "red" : i.direction === "bearish" ? "green" : "default"}>{`${i.name} · ${impactNames[i.direction] || i.direction}`}</Tag>)}</Space>
					<Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, marginBottom: 0 }}>{r.holding_impacts[0].mechanism}</Paragraph>
					<Button type="link" onClick={() => setSelected(r.id)}>查看持仓多空与条件</Button>
				</>
			)
			: <Text type="secondary">{{ unavailable: "持仓读取失败", no_positions: "当前无有效持仓", no_match: "已分析，暂未发现明确关联", pending: "待更新持仓关联", matched: "—" }[r.holding_impact_status || "pending"]}</Text> },
		{ title: "原文总体判断", key: "direction", width: 120, render: (_: unknown, r: ResearchReport) => (
			<>
				{r.payload.content_type === "news" ? <Tag>新闻事实</Tag> : direction(r.payload.direction)}
				<div>{r.payload.rating}</div>
				<Text type="secondary">{r.payload.evaluation_symbol}</Text>
			</>
		) },
		{ title: "20日实际表现", key: "return", width: 155, render: (_: unknown, r: ResearchReport) => {
			const h = r.review?.horizons.find(h => h.sessions === 20);
			return h?.status === "completed"
				? (
					<>
						<div>{percent(h.stock_return)}</div>
						<Text type="secondary">
							超额
							{percent(h.excess_return)}
						</Text>
						<div>{!r.review?.eligible ? "关联走势，不计命中率" : h.direction_match == null ? "无明确方向" : h.direction_match ? "方向一致" : "方向不一致"}</div>
					</>
				)
				: <Text type="secondary">{r.payload.content_type === "news" ? "新闻归档，不计命中率" : !r.payload.evaluation_symbol ? "未指定A股检验标的" : r.payload.time_precision === "unknown" ? "待核对报告时间" : statusNames[h?.status || "pending"]}</Text>;
		} },
	];
	function impactCard(impact: ResearchImpact, index: number) {
		return <ImpactCard key={`${impact.report_id}-${index}`} impact={impact} onOpen={setSelected} />;
	}
	return (
		<BasicContent>
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<Row justify="space-between" gutter={[16, 16]} align="middle">
					<Col>
						<Title level={3} style={{ margin: 0 }}>机构观点与消息</Title>
						<Text type="secondary">汇集公开研报、策略观点、采访发言与新闻快讯，跟踪对持仓的影响</Text>
					</Col>
					<Col>
						<Space wrap>
							<Button onClick={() => query.refetch()}>刷新页面</Button>
							{admin && (
								<>
									<Button onClick={() => {
										setDraft(null);
										setImporting(true);
									}}
									>
										录入历史资料
									</Button>
									<Button disabled={starting || latest?.status === "running"} onClick={() => refresh("focus")}>补入重点机构历史</Button>
									<Button disabled={starting || latest?.status === "running"} onClick={() => refresh(true)}>补采国内券商持仓研报</Button>
									<Button type="primary" loading={starting || latest?.status === "running"} onClick={() => refresh()}>采集并更新检验</Button>
								</>
							)}
						</Space>
					</Col>
				</Row>
				{query.isError && <Alert type="error" showIcon message="机构研究数据暂不可用" description="请重试；读取失败不能当作没有研报或没有持仓影响。" />}
				{query.isLoading && <Spin />}
				{data && (
					<>
						<Row gutter={[12, 12]}>
							<Col xs={12} lg={6}>
								<Card>
									<Statistic title="重点机构已核验证据" value={data.diagnostics?.focus_verified ?? 0} />
									<Text type="secondary">
										覆盖重点机构
										{data.diagnostics?.focus_covered ?? 0}
										{" "}
										/ 11家 · 全部归档
										{data.reports.length}
										{" "}
										篇
									</Text>
								</Card>
							</Col>
							<Col xs={12} lg={6}><Card><Statistic title="近48小时公开资料" value={data.fresh_report_ids.length} /></Card></Col>
							<Col xs={12} lg={6}>
								<Card>
									<Statistic title="近48小时涉及持仓" value={data.holdings.filter(h => h.impacts.length).length} suffix="只" />
									<Text type="secondary">
										已读取当前持仓
										{data.holdings.length}
										{" "}
										只
									</Text>
								</Card>
							</Col>
							<Col xs={12} lg={6}>
								<Card>
									<Statistic title="每日采集（北京时间）" value={data.runtime.time} />
									<Text type="secondary">{data.runtime.enabled && data.runtime.running ? "调度运行中" : "调度未运行"}</Text>
								</Card>
							</Col>
						</Row>
						<Alert type="info" showIcon message={data.coverage_note} />
						{latest && <Alert showIcon type={latest.status === "failed" ? "error" : latest.status === "partial" ? "warning" : "info"} message={`最近任务：${statusNames[latest.status] || latest.status} · ${stamp(latest.started_at)}`} description={[latest.error, ...(latest.payload.errors || []), ...((latest.payload.review?.errors || []).map(e => e.reason))].filter(Boolean).slice(0, 4).join("；") || `新增 ${latest.payload.new_reports || 0} 篇，修订 ${latest.payload.corrected_reports || 0} 篇关联说明，更新 ${latest.payload.review?.completed || 0} 个行情观察`} />}
						<Tabs
							defaultActiveKey="history"
							items={[
								{ key: "daily", label: "每日持仓影响", children: (
									<Space direction="vertical" style={{ width: "100%" }}>
										<Text type="secondary">
											读取当前账号自选盯盘中尚未清仓、股数大于0的持仓；同步于
											{stamp(data.holdings_as_of)}
											。影响方向是研究判断，等待业务数据确认。
										</Text>
										{data.holdings_status !== "ok"
											? <Alert type="error" message="持仓读取失败，无法判断影响范围" />
											: !data.holdings.length
												? <Empty description="当前账号尚无有效持仓，请先维护自选盯盘" />
												: (
													<Row gutter={[16, 16]}>
														{data.holdings.map(h => (
															<Col xs={24} xl={12} key={h.symbol}>
																<Card
																	title={`${h.name} · ${h.symbol}`}
																	extra={(
																		<Tag>
																			{h.impacts.length}
																			{" "}
																			条相关证据
																		</Tag>
																	)}
																>
																	{h.impacts.length ? h.impacts.map(impactCard) : <Text type="secondary">近48小时已采集资料中未发现匹配；不等于没有风险。</Text>}
																	{!!h.recent_focus_impacts?.length && (
																		<>
																			<Title level={5}>最近核验的重点观点（历史参考）</Title>
																			<Text type="secondary">按实际披露日期排列，不表示今日新增或观点仍然有效。</Text>
																			{h.recent_focus_impacts.map(impactCard)}
																		</>
																	)}
																</Card>
															</Col>
														))}
													</Row>
												)}
										<Title level={5}>近48小时报告与其他相关股票</Title>
										<Table
											rowKey="id"
											columns={columns}
											dataSource={data.reports.filter(r => data.fresh_report_ids.includes(r.id))}
											scroll={{ x: 800 }}
											expandable={{ expandedRowRender: r => r.payload.impacts.length
												? (
													<List
														dataSource={r.payload.impacts}
														renderItem={i => (
															<List.Item>
																<Space wrap>
																	<Text strong>
																		{i.name}
																		{" "}
																		{i.symbol}
																	</Text>
																	{direction(i.direction)}
																	<Text>{i.mechanism}</Text>
																</Space>
															</List.Item>
														)}
													/>
												)
												: <Text type="secondary">暂无可核验的个股映射</Text> }}
										/>
									</Space>
								) },
								{ key: "history", label: "重点机构观点与走势", children: (
									<Space direction="vertical" style={{ width: "100%" }}>
										<Space wrap>
											<Select aria-label="历史来源分组" style={{ width: 190 }} value={sourceGroup} onChange={setSourceGroup} options={[{ value: "focus", label: "11家重点机构" }, { value: "supplemental", label: "补充公开源" }, { value: "", label: "全部来源" }]} />
											<Select aria-label="机构筛选" style={{ width: 200 }} value={institution} onChange={setInstitution} options={[{ value: "", label: "全部机构" }, ...data.sources.map(s => ({ value: s.id, label: s.name }))]} />
											<Select aria-label="内容类型" style={{ width: 170 }} value={contentType} onChange={setContentType} options={[{ value: "", label: "全部内容类型" }, ...Object.entries(contentTypeNames).map(([value, label]) => ({ value, label }))]} />
											<Input.Search aria-label="搜索历史报告" placeholder="标题、代码或股票名称" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: 280 }} />
											<Checkbox checked={holdingsOnly} onChange={e => setHoldingsOnly(e.target.checked)}>只看持仓相关</Checkbox>
											{admin && <Button disabled={starting || latest?.status === "running" || (!!institution && groupFor(institution) !== "focus")} onClick={() => refresh("associations")}>更新近30天持仓关联</Button>}
											{admin && <Button disabled={starting || latest?.status === "running" || (!!institution && groupFor(institution) !== "focus")} onClick={() => refresh("public")}>{institution ? `补采${names[institution]}近30天公开资料` : "补采重点机构近30天公开资料"}</Button>}
										</Space>
										<Text type="secondary">研报、公开观点和新闻消息全部展示，按发布时间排序；待核验内容保留标记，新闻事实不计观点命中率。</Text>
										<Text type="secondary">
											最多展示最近
											{data.record_limit}
											{" "}
											篇。1/5/20/60 个交易日分别观察；未到期不计失败，缺失行情不填零。
										</Text>
										<Table rowKey="id" columns={columns} dataSource={reports} scroll={{ x: 1400 }} />
									</Space>
								) },
								{ key: "scores", label: "机构历史匹配度", children: (
									<Space direction="vertical" style={{ width: "100%" }}>
										<Alert type="warning" showIcon message="仅统计已核验、有明确方向且观察到期的报告；看多与看空、历史补录与事前留档分开。匹配不代表因果或可交易收益。" />
										<Select aria-label="来源分组" style={{ width: 230 }} value={sourceGroup} onChange={setSourceGroup} options={[{ value: "", label: "全部来源（分组显示）" }, { value: "focus", label: "11家重点机构" }, { value: "supplemental", label: "补充公开源" }]} />
										<Title level={5}>样本覆盖与数据缺口</Title>
										<Table
											rowKey="institution"
											pagination={false}
											scroll={{ x: 820 }}
											dataSource={(data.institution_coverage || []).filter(r => !sourceGroup || r.group === sourceGroup)}
											columns={[
												{ title: "机构", dataIndex: "name" },
												{ title: "来源分组", dataIndex: "institution", render: groupTag },
												{ title: "归档", dataIndex: "archived" },
												{ title: "原站 / PDF核验", key: "original", render: (_, r) => r.original_verified ?? r.verified },
												{ title: "可靠转载核验", dataIndex: "reprint_verified", render: v => v ?? 0 },
												{ title: "行情观察", dataIndex: "observed" },
												{ title: "有效方向样本", dataIndex: "eligible_samples" },
												{ title: "当前缺口", dataIndex: "reason" },
												{ title: "研究内容", key: "open", render: (_, r) => r.latest_report_id ? <Button type="link" onClick={() => setSelected(r.latest_report_id!)}>查看最新核验观点</Button> : "—" },
											]}
										/>
										<Title level={5}>已到期窗口的走势匹配</Title>
										<Text type="secondary">公开PDF与目录交叉核验；目录收录日可能晚于原文落款，按收录日后首个交易日开盘保守观察。短窗口匹配不能代替原评级完整期限的检验。</Text>
										<Table
											rowKey={r => `${r.institution}-${r.direction}-${r.sessions}-${r.cohort}-${r.direction_basis}-${r.evidence_level}-${r.publication_basis}`}
											dataSource={data.scorecards.filter(r => !sourceGroup || groupFor(r.institution) === sourceGroup)}
											locale={{ emptyText: <Empty description={`尚无符合条件的到期样本。已归档 ${data.reports.length} 篇，原文核验 ${data.diagnostics?.verified ?? 0} 篇；请查看上方各机构缺口，或补采持仓历史研报。`} /> }}
											scroll={{ x: 950 }}
											columns={[
												{ title: "机构", dataIndex: "institution", render: v => names[v] },
												{ title: "来源分组", dataIndex: "institution", key: "group", render: groupTag },
												{ title: "证据类型", dataIndex: "evidence_level", render: v => evidenceNames[v] || "原文" },
												{ title: "观点", dataIndex: "direction", render: direction },
												{ title: "观察交易日", dataIndex: "sessions" },
												{ title: "留档类型", dataIndex: "cohort", render: v => v === "prospective" ? "事前留档" : "历史补录" },
												{ title: "到期样本", dataIndex: "samples" },
												{ title: "方向匹配", dataIndex: "hit_rate", render: v => `${v}%` },
												{ title: "评级口径", dataIndex: "direction_basis", render: v => v === "relative" ? "相对表现" : "绝对涨跌" },
												{ title: "相对大盘匹配", dataIndex: "excess_hit_rate", render: v => v == null ? "—" : `${v}%` },
												{ title: "平均超额收益", dataIndex: "mean_excess_return", render: percent },
												{ title: "样本说明", dataIndex: "sample_warning" },
											]}
										/>
									</Space>
								) },
								{ key: "sources", label: "来源与运行记录", children: (
									<Space direction="vertical" style={{ width: "100%" }}>
										<Table
											rowKey="id"
											pagination={false}
											dataSource={data.sources}
											columns={[{ title: "机构", dataIndex: "name" }, { title: "本轮状态", key: "status", render: (_, s) => {
												const state = latest?.payload.sources?.find(x => x.source_id === s.id);
												return (
													<>
														<Tag>{s.group === "supplemental" ? "历史公开原文补采" : state ? statusNames[state.status] || state.status : "尚未采集"}</Tag>
														<Text type="secondary">{state?.errors?.join("；")}</Text>
													</>
												);
											} }, { title: "覆盖范围", dataIndex: "limitations" }]}
										/>
										<Table rowKey="id" dataSource={data.history} columns={[{ title: "任务开始", dataIndex: "started_at", render: stamp }, { title: "状态", dataIndex: "status", render: v => statusNames[v] || v }, { title: "错误", dataIndex: "error" }]} />
									</Space>
								) },
							]}
						/>
					</>
				)}
			</Space>
			<ImportDialog open={importing} draft={draft} sources={data?.sources || []} onClose={() => setImporting(false)} onSaved={() => client.invalidateQueries({ queryKey: ["institutional-research"] })} />
			<Drawer title="原始观点与行情检验" width={860} open={!!selected} onClose={() => setSelected(null)}>
				{detail.isLoading && <Spin />}
				{detail.isError && <Alert type="error" message="报告读取失败，请关闭后重试" />}
				{report && (
					<Space direction="vertical" size="middle" style={{ width: "100%" }}>
						<Title level={4}>{report.payload.title}</Title>
						<Title level={5}>我的持仓多空分析</Title>
						{selectedHoldingImpacts.length
							? selectedHoldingImpacts.map(impactCard)
							: <Text type="secondary">{data?.holdings_status !== "ok" ? "持仓读取失败，无法判断关联" : "暂未发现当前持仓的明确关联，可更新持仓关联后查看。"}</Text>}
						{admin && (
							<Button onClick={() => {
								setDraft(report);
								setImporting(true);
							}}
							>
								核验原始观点并另存版本
							</Button>
						)}
						<Space wrap>
							{direction(report.payload.direction)}
							<Tag>{contentTypeNames[report.payload.content_type || "report"]}</Tag>
							<Tag>{sourceLink(report.payload)}</Tag>
							<Tag>{report.payload.verified ? "已核验" : "待核验"}</Tag>
							{sourceLink(report.payload, "打开来源")}
						</Space>
						{groupTag(report.institution)}
						<Descriptions size="small" column={1} items={[{ key: "published", label: report.payload.publication_basis === "month_bound" ? "月份上界（保守观察依据）" : report.payload.publication_basis === "public_disclosure" ? "公开披露 / 更新时点（观察依据）" : report.payload.catalog_published_at ? "公开收录日（观察依据）" : report.payload.time_precision === "unknown" ? "来源时间（原报告待核验）" : "报告发布时间", children: stamp(report.published_at) }, { key: "original-date", label: "原文落款日期", children: report.payload.report_date || report.payload.publication_month || "待核验" }, { key: "seen", label: "首次入库", children: stamp(report.first_seen_at) }, { key: "id", label: "报告 ID", children: <Text copyable>{report.id}</Text> }]} />
						{!!report.payload.verification_notes?.length && <Alert type="info" message="原文核验与观察口径" description={report.payload.verification_notes.join("；")} />}
						<Paragraph>{report.payload.summary}</Paragraph>
						{review
							? (
								<>
									<Alert type={review.eligible ? "info" : "warning"} message={review.eligible ? "该记录符合统计条件；各观察窗口需分别到期" : review.excluded_reasons.join("；")} description={review.note} />
									<Text>
										观察起点：
										{review.entry_date || "待确定"}
										；行情截至
										{review.as_of}
										；
										{review.price_source}
										。
									</Text>
									{!!review.curve?.length && <ReactECharts option={{ tooltip: { trigger: "axis", valueFormatter: (v: number) => percent(v) }, legend: { data: ["检验标的", "对照指数"] }, grid: { left: 60, right: 25, bottom: 55 }, xAxis: { type: "category", data: review.curve.map(p => p.date) }, yAxis: { type: "value", axisLabel: { formatter: "{value}%" } }, series: [{ name: "检验标的", type: "line", data: review.curve.map(p => p.stock), showSymbol: false }, { name: "对照指数", type: "line", data: review.curve.map(p => p.benchmark), showSymbol: false }] }} style={{ height: 300 }} />}
									{review.event_reaction && <Alert type="info" message={`事件日 ${review.event_reaction.date}：标的 ${percent(review.event_reaction.stock_return)}，对照指数 ${percent(review.event_reaction.benchmark_return)}`} description={review.event_reaction.note} />}
									<Table size="small" pagination={false} rowKey="sessions" dataSource={review.horizons} columns={[{ title: "交易日", dataIndex: "sessions" }, { title: "状态", dataIndex: "status", render: v => statusNames[v] || v }, { title: "涨跌", dataIndex: "stock_return", render: percent }, { title: "超额收益", dataIndex: "excess_return", render: percent }, { title: "最大浮亏", dataIndex: "max_loss", render: percent }]} />
									<Card size="small" title="目标价检验">
										<Paragraph>
											{statusNames[review.target.status]}
											{" "}
											{review.target.reason}
										</Paragraph>
										{review.target.deadline && (
											<>
												<Paragraph>
													截止：
													{review.target.deadline}
													；同口径目标价：
													{review.target.adjusted_target}
												</Paragraph>
												<Paragraph>
													盘中触及：
													{review.target.intraday_touch_date || "未触及"}
													；收盘触及：
													{review.target.close_touch_date || "未触及"}
													；到期收益：
													{percent(review.target.expiry_return)}
												</Paragraph>
											</>
										)}
										<Text type="secondary">
											{review.adjustment}
											。触及目标价不等于实际成交获利。
										</Text>
									</Card>
								</>
							)
							: <Alert type="info" message={report.payload.content_type === "news" ? "新闻事实已归档，不计机构观点命中率。" : !report.payload.evaluation_symbol ? "该观点未指定A股检验标的，不能移用境外市场观点计算A股命中率；可查看持仓关联。" : report.payload.time_precision === "unknown" ? "尚未核对原报告时间，保留证据，暂不做历史检验" : "尚未生成行情检验，请运行更新"} />}
						{report.payload.impacts.filter(i => !selectedHoldingImpacts.some(own => own.symbol === i.symbol)).map(i => (
							<Card key={`${i.symbol}-${i.relation}-${i.evidence_quote}`} size="small" title={`${i.name} · ${i.relation === "direct" ? "直接点名" : i.relation === "macro" ? "宏观传导" : "产业链推断"}`}>
								<Paragraph>{i.mechanism}</Paragraph>
								<blockquote>{i.evidence_quote}</blockquote>
								<Text>
									下一项核验：
									{i.watch_next}
								</Text>
							</Card>
						))}
						<Title level={5}>保存的证据正文</Title>
						<Paragraph style={{ whiteSpace: "pre-wrap" }}>{report.payload.content}</Paragraph>
						<Text type="secondary">
							内容指纹：
							{report.content_hash}
						</Text>
					</Space>
				)}
			</Drawer>
		</BasicContent>
	);
}
