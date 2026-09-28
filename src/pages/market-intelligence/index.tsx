import type { IntelligenceArticle, IntelligenceRun, IntelligenceSource } from "#src/api/market-intelligence";
import { fetchIntelligence, fetchIntelligenceRun, refreshIntelligence, setIntelligenceSource } from "#src/api/market-intelligence";
import { BasicContent } from "#src/components/basic-content";
import { useUserStore } from "#src/store/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Card, Col, Drawer, Empty, Input, List, Row, Select, Space, Spin, Statistic, Switch, Table, Tabs, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { evidenceLabel, filterArticles, formatTime, impactLabel, isRunning, priorityLabel, safeHref, statusLabel } from "./data";

const { Title, Text, Paragraph } = Typography;

export default function MarketIntelligencePage() {
	const { message } = App.useApp();
	const client = useQueryClient();
	const roles = useUserStore(state => state.roles);
	const isAdmin = roles.includes("admin");
	const [selectedRun, setSelectedRun] = useState<string | null>(null);
	const [article, setArticle] = useState<IntelligenceArticle | null>(null);
	const [category, setCategory] = useState("");
	const [keyword, setKeyword] = useState("");
	const [tab, setTab] = useState("focus");
	const [triggering, setTriggering] = useState(false);
	const [savingSource, setSavingSource] = useState<string | null>(null);
	const overview = useQuery({ queryKey: ["market-intelligence"], queryFn: fetchIntelligence, refetchInterval: query => isRunning(query.state.data?.data.run?.status) ? 5000 : 60000 });
	const detail = useQuery({ queryKey: ["market-intelligence-run", selectedRun], queryFn: () => fetchIntelligenceRun(selectedRun!), enabled: !!selectedRun, refetchInterval: query => isRunning(query.state.data?.data.status) ? 5000 : false });
	const data = overview.data?.data;
	const run = selectedRun ? detail.data?.data : data?.run;
	const report = run?.report;
	const analysis = report?.analysis;
	const articles = report?.articles || [];
	const coverage = report?.coverage;
	const categoryNames = Object.fromEntries((data?.categories || []).map(c => [c.id, c.name]));
	const sourceStatus = Object.fromEntries((run?.source_status || []).map(s => [s.source_id, s]));
	const filtered = useMemo(() => filterArticles(report?.articles || [], category, keyword), [report, category, keyword]);
	const failed = run?.status === "failed" || run?.status === "interrupted";
	const historical = !!selectedRun && selectedRun !== data?.run?.run_id;

	async function trigger() {
		setTriggering(true);
		try {
			const result = await refreshIntelligence();
			if (result.run_id)
				setSelectedRun(result.run_id);
			setTab("focus");
			message.info(result.status === "busy" ? "已有任务运行，正在显示进度" : result.status === "started" ? "抓取任务已开始" : "任务暂未启动，请稍后重试");
			await client.invalidateQueries({ queryKey: ["market-intelligence"] });
		}
		catch { message.error("未能启动任务，请重试"); }
		finally { setTriggering(false); }
	}
	async function toggleSource(source: IntelligenceSource, enabled: boolean) {
		setSavingSource(source.id);
		try {
			await setIntelligenceSource(source.id, enabled);
			await client.invalidateQueries({ queryKey: ["market-intelligence"] });
			message.success("已保存，下次抓取生效");
		}
		catch { message.error("配置未保存，请确认管理员权限"); }
		finally { setSavingSource(null); }
	}
	function openRun(id: string) {
		setSelectedRun(id);
		setArticle(null);
		setTab("focus");
	}
	const observationList = (values: string[], empty: string) => values.length ? <List size="small" dataSource={values} renderItem={value => <List.Item>{value}</List.Item>} /> : <Text type="secondary">{empty}</Text>;

	return (
		<BasicContent>
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<Row gutter={[12, 12]} justify="space-between" align="middle">
					<Col>
						<Title level={3} style={{ marginBottom: 4 }}>每日重点情报</Title>
						<Text type="secondary">先看新增变化，再看影响与证据</Text>
					</Col>
					<Col>
						<Space wrap>
							<Button onClick={() => {
								setSelectedRun(null);
								client.invalidateQueries({ queryKey: ["market-intelligence"] });
							}}
							>
								查看最新
							</Button>
							<Button type="primary" loading={triggering} disabled={isRunning(data?.run?.status)} onClick={trigger}>立即抓取并分析</Button>
						</Space>
					</Col>
				</Row>
				<Space wrap>
					<Tag color={data?.runtime.running ? "blue" : "default"}>{data?.runtime.running ? "每日自动更新" : "自动任务未运行"}</Tag>
					<Text type="secondary">
						每天
						{data?.runtime.time || "07:30"}
						（北京时间，含周末）
					</Text>
					{run && (
						<Text type="secondary">
							资料截止：
							{formatTime(run.cutoff)}
						</Text>
					)}
				</Space>
				{overview.isError && <Alert type="error" showIcon message="情报服务暂不可用" description="无法读取最新任务状态，请稍后重试。" action={<Button onClick={() => overview.refetch()}>重试</Button>} />}
				{selectedRun && detail.isError && <Alert type="error" message="历史批次读取失败" action={<Button onClick={() => detail.refetch()}>重试</Button>} />}
				{historical && <Alert type="info" showIcon message={`正在查看历史情报：${formatTime(run?.cutoff)}`} />}
				{isRunning(run?.status) && <Alert type="info" showIcon icon={<Spin size="small" />} message={statusLabel[run!.status]} description="页面会自动更新。采集和AI分析完成后，重点与证据会一起显示。" />}
				{failed && <Alert type="error" showIcon message="本轮分析未完成" description={run?.error || "已采集的资料保留在下方，可重新运行。"} />}
				{((coverage?.failed || 0) + (coverage?.limited || 0)) > 0 && <Alert type="warning" showIcon message={`${coverage!.failed} 个来源抓取失败，${coverage!.limited || 0} 个原站受限，当前结论覆盖不完整`} description="缺失数据不代表没有风险或没有新消息，可在信息源页查看。" />}
				<Row gutter={[12, 12]}>
					<Col xs={12} lg={6}><Card size="small"><Statistic title="重点变化" value={analysis?.highlights.length ?? "—"} /></Card></Col>
					<Col xs={12} lg={6}><Card size="small"><Statistic title="新增资料" value={coverage?.new_articles ?? "—"} /></Card></Col>
					<Col xs={12} lg={6}><Card size="small"><Statistic title="来源响应" value={coverage ? `${coverage.responded} / ${coverage.enabled}` : "—"} /></Card></Col>
					<Col xs={12} lg={6}><Card size="small"><Statistic title="原文待核验" value={articles.filter(a => a.evidence_level === "summary" || a.freshness === "unknown").length} /></Card></Col>
				</Row>
				<Tabs
					activeKey={tab}
					onChange={setTab}
					items={[
						{ key: "focus", label: "今日重点", children: (
							<Space direction="vertical" size="large" style={{ width: "100%" }}>
								{analysis
									? (
										<>
											<Card style={{ borderTop: "4px solid #1677ff" }}>
												<Text type="secondary">本轮判断</Text>
												<Title level={4}>{analysis.headline}</Title>
												<Paragraph style={{ marginBottom: 0 }}>{analysis.summary}</Paragraph>
											</Card>
											{analysis.highlights.map((item, index) => (
												<Card
													key={`${item.category}-${item.evidence_ids.join(",")}`}
													title={(
														<Space wrap>
															<Tag color={item.priority === "high" ? "red" : item.priority === "medium" ? "blue" : "default"}>{priorityLabel[item.priority]}</Tag>
															<Text strong>
																{index + 1}
																.
																{" "}
																{item.title}
															</Text>
														</Space>
													)}
													styles={{ header: { whiteSpace: "normal", paddingTop: 12, paddingBottom: 12 } }}
												>
													<Space wrap style={{ marginBottom: 12 }}>
														<Tag>{categoryNames[item.category] || item.category}</Tag>
														<Tag>{impactLabel[item.impact]}</Tag>
														{item.affected_sectors.map(sector => <Tag key={sector}>{sector}</Tag>)}
													</Space>
													<Paragraph>
														<Text strong>发生了什么：</Text>
														{item.fact}
													</Paragraph>
													<Paragraph>
														<Text strong>为什么重要：</Text>
														{item.why_it_matters}
													</Paragraph>
													<Paragraph>
														<Text strong>接下来验证：</Text>
														{item.watch_next}
													</Paragraph>
													<Paragraph type="secondary">
														不确定性：
														{item.uncertainty}
													</Paragraph>
													<Space wrap>
														{item.evidence_ids.map((id) => {
															const evidence = articles.find(a => a.id === id);
															return evidence
																? (
																	<Button key={id} size="small" onClick={() => setArticle(evidence)}>
																		{evidence.source_name}
																		{" "}
																		· 查看证据
																	</Button>
																)
																: <Tag key={id}>证据暂不可用</Tag>;
														})}
													</Space>
												</Card>
											))}
											{analysis.highlights.length === 0 && <Empty description="AI未筛出足够证据支持的重点变化" />}
											<Row gutter={[16, 16]}>
												<Col xs={24} lg={8}><Card title="风险与反证">{observationList(analysis.risks, "本轮未提取到具体风险；不代表市场无风险")}</Card></Col>
												<Col xs={24} lg={8}><Card title="观点分歧">{observationList(analysis.disagreements, "本轮未提取到明确分歧")}</Card></Col>
												<Col xs={24} lg={8}><Card title="接下来观察">{observationList(analysis.watchlist, "等待新增证据")}</Card></Col>
											</Row>
										</>
									)
									: !isRunning(run?.status) && <Empty description={report?.analysis_status === "no_new_evidence" ? "本轮没有新增且日期明确的可分析资料；可查看分类原文和历史情报" : failed ? "AI结果不可用，已抓取资料仍可阅读" : "首次抓取完成后，这里将展示最重要的变化"} />}
							</Space>
						) },
						{ key: "articles", label: `分类原文（${articles.length}）`, children: (
							<Space direction="vertical" style={{ width: "100%" }} size="middle">
								<Space wrap>
									<Select aria-label="信息分类" value={category} onChange={setCategory} style={{ width: 190 }} options={[{ value: "", label: "全部分类" }, ...(data?.categories || []).map(c => ({ value: c.id, label: c.name }))]} />
									<Input.Search aria-label="搜索资料" placeholder="搜索标题、来源或正文" allowClear value={keyword} onChange={event => setKeyword(event.target.value)} style={{ width: 260 }} />
								</Space>
								<List
									loading={overview.isLoading}
									dataSource={filtered}
									pagination={{ pageSize: 12, showSizeChanger: false }}
									locale={{ emptyText: "本轮没有匹配的资料" }}
									renderItem={item => (
										<List.Item key={item.id} actions={[<Button key="read" onClick={() => setArticle(item)}>阅读证据</Button>]}>
											<List.Item.Meta
												title={(
													<Space wrap>
														<Tag>{categoryNames[item.category]}</Tag>
														{item.is_new && <Tag color="blue">新增</Tag>}
														<a href={safeHref(item.url)} target="_blank" rel="noreferrer">{item.title}</a>
													</Space>
												)}
												description={(
													<>
														<Text type="secondary">
															{item.source_name}
															{" "}
															·
															{" "}
															{item.publisher}
															{" "}
															·
															{" "}
															{formatTime(item.published_at)}
														</Text>
														<br />
														<Tag color={item.evidence_level === "official" ? "green" : "default"}>{evidenceLabel[item.evidence_level]}</Tag>
														{item.freshness === "unknown" && <Tag color="orange">日期待核验</Tag>}
														{item.duplicate_source_ids.length > 0 && (
															<Tag>
																合并
																{item.duplicate_source_ids.length}
																{" "}
																个重复来源
															</Tag>
														)}
													</>
												)}
											/>
										</List.Item>
									)}
								/>
							</Space>
						) },
						{ key: "sources", label: "信息源与抓取状态", children: (
							<>
								<Paragraph type="secondary">原站无法读取时尝试公开转载；仅拿到摘要会降级为待核验线索。机构与大V优先级不代表预测胜率。管理员可调整启用状态。</Paragraph>
								<Table<IntelligenceSource>
									rowKey="id"
									dataSource={data?.sources || []}
									pagination={false}
									scroll={{ x: 1000 }}
									columns={[
										{ title: "启用", key: "enabled", render: (_, s) => <Switch aria-label={`启用${s.name}`} checked={s.enabled} disabled={!isAdmin} loading={savingSource === s.id} onChange={enabled => toggleSource(s, enabled)} /> },
										{ title: "来源", dataIndex: "name", width: 240 },
										{ title: "分类", key: "category", render: (_, s) => categoryNames[s.category] },
										{ title: "本轮状态", key: "status", render: (_, s) => !s.enabled ? <Tag>已停用</Tag> : <Tag color={sourceStatus[s.id]?.status === "failed" ? "red" : "default"}>{statusLabel[sourceStatus[s.id]?.status] || "尚未抓取"}</Tag> },
										{ title: "资料数", key: "count", render: (_, s) => sourceStatus[s.id]?.count ?? "—" },
										{ title: "用途与边界", key: "use", render: (_, s) => (
											<>
												<Text>{s.intended_use}</Text>
												<br />
												<Text type="secondary">{s.limitations}</Text>
												{sourceStatus[s.id]?.errors?.length > 0 && <Paragraph type="secondary">{sourceStatus[s.id].errors.join("；")}</Paragraph>}
											</>
										) },
									]}
								/>
							</>
						) },
						{ key: "history", label: "历史情报", children: (
							<Table<IntelligenceRun>
								rowKey="run_id"
								dataSource={data?.history || []}
								pagination={{ pageSize: 10 }}
								scroll={{ x: 650 }}
								columns={[
									{ title: "资料截止", key: "cutoff", render: (_, r) => formatTime(r.cutoff) },
									{ title: "运行状态", key: "status", render: (_, r) => <Tag color={r.status === "failed" ? "red" : "default"}>{statusLabel[r.status] || r.status}</Tag> },
									{ title: "完成时间", key: "finished", render: (_, r) => r.finished_at ? formatTime(r.finished_at) : "—" },
									{ title: "操作", key: "open", render: (_, r) => <Button type="link" onClick={() => openRun(r.run_id)}>查看本批次</Button> },
								]}
							/>
						) },
					]}
				/>
			</Space>
			<Drawer title={article?.title} open={!!article} onClose={() => setArticle(null)} width={Math.min(720, typeof window === "undefined" ? 720 : window.innerWidth)}>
				{article && (
					<Space direction="vertical" style={{ width: "100%" }} size="middle">
						<Space wrap>
							<Tag>{evidenceLabel[article.evidence_level]}</Tag>
							<Text>{article.source_name}</Text>
						</Space>
						<Text type="secondary">
							发布时间：
							{formatTime(article.published_at)}
							<br />
							抓取时间：
							{formatTime(article.fetched_at)}
						</Text>
						{article.evidence_level !== "official" && <Alert type="info" message={article.evidence_level === "summary" ? "仅取得摘要，原文尚待核验" : "本条为转载，观点归属以正文署名为准"} />}
						<a href={safeHref(article.url)} target="_blank" rel="noreferrer">打开来源页面</a>
						<Paragraph style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>{article.content}</Paragraph>
					</Space>
				)}
			</Drawer>
		</BasicContent>
	);
}
