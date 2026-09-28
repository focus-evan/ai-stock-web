import type { CapitalEvidence, CapitalStockCard, PortfolioCapitalTracking } from "#src/api/strategy/portfolioCapitalTypes";
import { Alert, Card, Col, Collapse, Empty, Row, Space, Table, Tabs, Tag, Typography } from "antd";

const { Text, Paragraph } = Typography;
const EMPTY_EVIDENCE: CapitalEvidence[] = [];
const datasetLabels: Record<string, string> = {
	stock_zh_index_daily_em: "指数日线",
	stock_zh_a_spot_em: "全市场行情",
	market_breadth: "市场宽度",
	fund_etf_scale_sse: "ETF份额",
	stock_margin_detail_sse: "沪市融资余额",
	stock_margin_detail_szse: "深市融资余额",
	stock_lhb_detail_em: "龙虎榜",
	stock_lhb_stock_detail_em: "龙虎榜席位",
	stock_repurchase_em: "回购实施",
	stock_ggcg_em: "股东增减持",
	stock_individual_info_em: "行业归属",
	stock_gdfx_free_top_10_em: "十大流通股东",
	stock_zh_a_gdhs_detail_em: "股东户数",
	calendar: "交易日期",
	coverage: "持仓覆盖范围",
	deadline: "采集时限",
	configuration: "采集设置",
	collector: "资金数据",
};
const statusLabels: Record<string, string> = {
	current: "近期观察",
	historical: "历史披露",
	stale: "已过期",
	unverified: "待核验",
	unavailable: "暂无证据",
	proxy: "间接线索",
	product_observed: "产品变化可见",
	disclosed: "已披露实施",
};
const basisLabels: Record<string, string> = { fact: "披露 / 计算事实", proxy: "间接线索", inference: "推测" };

function safeSource(url: string) {
	try {
		const parsed = new URL(url);
		return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : undefined;
	}
	catch { return undefined; }
}

function valueText(e: CapitalEvidence) {
	if (e.value == null || !Number.isFinite(e.value))
		return "未知";
	if (Math.abs(e.value) >= 100000000 && e.unit === "元")
		return `${(e.value / 100000000).toFixed(2)} 亿元`;
	if (Math.abs(e.value) >= 10000 && ["元", "股"].includes(e.unit))
		return `${(e.value / 10000).toFixed(2)} 万${e.unit}`;
	return `${e.value.toLocaleString("zh-CN", { maximumFractionDigits: 2 })} ${e.unit}`;
}

export function EvidenceTable({ evidence }: { evidence: CapitalEvidence[] }) {
	return (
		<Table<CapitalEvidence>
			size="small"
			rowKey="id"
			dataSource={evidence}
			pagination={evidence.length > 6 ? { pageSize: 6, showSizeChanger: false } : false}
			scroll={{ x: 660 }}
			locale={{ emptyText: "暂无可核验记录；不代表没有买卖" }}
			columns={[
				{ title: "观察", dataIndex: "label", width: 210, render: (label, e) => (
					<>
						<Text>{label}</Text>
						<div>
							<Tag>{basisLabels[e.basis] || "待核验"}</Tag>
							<Tag color={e.status === "stale" ? "orange" : undefined}>{statusLabels[e.status] || e.status}</Tag>
						</div>
					</>
				) },
				{ title: "数据", width: 115, render: (_, e) => valueText(e) },
				{ title: "统计 / 公开时间", width: 155, render: (_, e) => (
					<>
						<div>{e.as_of || "统计日未知"}</div>
						<Text type="secondary" style={{ fontSize: 11 }}>
							公开：
							{e.published_at || "源未提供"}
						</Text>
					</>
				) },
				{ title: "来源", width: 140, render: (_, e) => safeSource(e.source?.url) ? <a href={safeSource(e.source.url)} target="_blank" rel="noopener noreferrer">{e.source.name}</a> : <Text type="secondary">来源待核验</Text> },
			]}
			expandable={{ expandedRowRender: e => (
				<>
					<Paragraph style={{ marginBottom: 4 }}>{e.note}</Paragraph>
					<Text type="secondary">
						首次采集：
						{e.observed_at || "未知"}
						；公开时间缺失时，不把统计日当成可用时间。
					</Text>
				</>
			) }}
		/>
	);
}

export function CapitalStockSection({ card, evidence = EMPTY_EVIDENCE }: { card?: CapitalStockCard, evidence?: CapitalEvidence[] }) {
	if (!card)
		return <Alert style={{ marginTop: 12 }} type="info" message="旧报告尚无资金证据，重新分析后查看。" />;
	const rows = evidence.filter(e => card.evidence_ids.includes(e.id));
	return (
		<div style={{ marginTop: 16 }}>
			<Alert type={card.state === "risk_review" ? "warning" : "info"} showIcon message={card.decision} description={card.industry !== "行业未核验" ? `行业：${card.industry} · 观察范围：${card.sector}` : "行业与关联产品待核验"} />
			<Collapse
				ghost
				size="small"
				items={[
					{ key: "evidence", label: `持仓证据卡 · ${rows.length} 条记录`, children: <EvidenceTable evidence={rows} /> },
					{ key: "conditions", label: "验证条件与失效条件", children: (
						<>
							<Text strong>参与前核验</Text>
							<ul>{card.entry_conditions.map(s => <li key={s}>{s}</li>)}</ul>
							<Text strong>持仓失效与复核</Text>
							<ul>{card.invalidations.map(s => <li key={s}>{s}</li>)}</ul>
							<Paragraph type="secondary">{card.next_check}</Paragraph>
						</>
					) },
					...(card.missing.length ? [{ key: "gaps", label: `待补证据 · ${card.missing.length} 项`, children: <ul>{card.missing.map(s => <li key={s}>{s}</li>)}</ul> }] : []),
				]}
			/>
		</div>
	);
}

export function CapitalTrackingOverview({ data }: { data?: PortfolioCapitalTracking }) {
	if (!data)
		return <Alert style={{ marginTop: 16 }} type="info" showIcon message="资金追踪已接入，点击重新分析生成大盘、板块与持仓证据。" />;
	const stale = data.status === "stale";
	const shared = data.evidence.filter(e => e.scope !== "stock");
	return (
		<Card
			style={{ marginTop: 16, borderRadius: 12 }}
			title={(
				<Space wrap>
					<span>资金追踪与持仓复核</span>
					<Tag color={stale ? "orange" : "blue"}>{stale ? "历史报告 · 请更新" : `${data.coverage.current_count} 条近期观察`}</Tag>
					<Tag>
						{data.coverage.historical_count}
						{" "}
						条历史披露
					</Tag>
				</Space>
			)}
		>
			<Alert showIcon type={stale || data.market.state === "defensive" ? "warning" : "info"} message={data.market.conclusion} description={data.market.warnings?.join("；")} />
			<Tabs
				style={{ marginTop: 12 }}
				items={[
					{ key: "layers", label: "大盘与板块", children: (
						<>
							<Space wrap style={{ marginBottom: 12 }}>
								{data.sectors.map(s => (
									<Tag key={s.name}>
										{s.name}
										{" "}
										·
										{" "}
										{s.stock_codes.length}
										{" "}
										只 ·
										{" "}
										{s.evidence_ids.length}
										{" "}
										条证据
									</Tag>
								))}
							</Space>
							<EvidenceTable evidence={shared} />
							<Paragraph type="secondary" style={{ marginTop: 10 }}>行业ETF作为板块参考，不将其申赎直接分配为某只持仓的主动买盘。</Paragraph>
						</>
					) },
					{ key: "actors", label: "11类参与者", children: (
						<Table
							rowKey="id"
							size="small"
							pagination={false}
							dataSource={data.actors}
							scroll={{ x: 560 }}
							columns={[
								{ title: "参与者", dataIndex: "name", width: 155 },
								{ title: "识别状态", width: 130, render: (_, a) => (
									<>
										<Tag>{statusLabels[a.status] || "待核验"}</Tag>
										<Text type="secondary">
											{a.evidence_ids.length}
											{" "}
											条
										</Text>
									</>
								) },
								{ title: "公开数据边界", dataIndex: "boundary" },
							]}
						/>
					) },
					{ key: "review", label: "组合暴露与复盘", children: (
						<>
							<Row gutter={[12, 12]}>
								{data.exposure.by_currency.map(group => (
									<Col key={group.currency} xs={24} md={12}>
										<Card size="small" title={`${group.currency} 持仓`}>
											<Paragraph>
												最大单股市值占比：
												<Text strong>
													{`${group.largest_stock_pct.toFixed(1)}%`}
												</Text>
											</Paragraph>
											<Space wrap>
												{group.sectors.map(s => (
													<Tag key={s.name}>
														{s.name}
														{" "}
														{`${s.weight_pct.toFixed(1)}%`}
													</Tag>
												))}
											</Space>
										</Card>
									</Col>
								))}
							</Row>
							<Paragraph type="secondary" style={{ marginTop: 12 }}>{data.exposure.note}</Paragraph>
							{data.review.items.length
								? (
									<Table
										rowKey="stock_code"
										size="small"
										pagination={false}
										dataSource={data.review.items}
										scroll={{ x: 540 }}
										columns={[
											{ title: "股票", dataIndex: "stock_code" },
											{ title: "观察区间", render: (_, r) => `${r.from_date} — ${r.to_date}` },
											{ title: "价格表现", render: (_, r) => `${r.observation_return_pct.toFixed(2)}%` },
											{ title: "相对上证", render: (_, r) => r.relative_index_pct == null ? "未知" : `${r.relative_index_pct.toFixed(2)} 个百分点` },
											{ title: "较起点最差跌幅", render: (_, r) => `${r.worst_from_open_pct.toFixed(2)}%` },
										]}
									/>
								)
								: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="等待先前报告发布后的完整交易日样本" />}
							<Paragraph type="secondary" style={{ marginTop: 10 }}>{data.review.note}</Paragraph>
						</>
					) },
					{ key: "workflow", label: "使用流程与缺口", children: (
						<>
							{data.workflow.map(w => (
								<Paragraph key={w.stage}>
									<Text strong>
										{w.stage}
										：
									</Text>
									{w.task}
								</Paragraph>
							))}
							{data.data_gaps.length > 0 && <Alert type="warning" showIcon message={`${data.data_gaps.length} 项取数或覆盖缺口，缺失数据保持未知`} />}
							<Collapse
								ghost
								items={[{ key: "gaps", label: "查看数据缺口", children: (
									<ul>
										{data.data_gaps.map(g => (
											<li key={`${g.dataset}-${JSON.stringify(g.query || {})}`}>
												{datasetLabels[g.dataset] || "其他数据"}
												：
												{g.message}
											</li>
										))}
									</ul>
								) }]}
							/>
						</>
					) },
				]}
			/>
			<Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>{data.rule_note}</Paragraph>
		</Card>
	);
}
