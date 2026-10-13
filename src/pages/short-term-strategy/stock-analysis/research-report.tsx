import type { ResearchComparison, ResearchLayer, ResearchReport } from "#src/api/strategy/types";
import { Alert, Space, Tag } from "antd";
import { numberText, researchGroups } from "./data";
import { Copy, Section, TextList } from "./presentation";

export function ResearchStatus({ value }: { value?: string }) {
	return <Tag color={value === "有利" ? "blue" : value === "承压" ? "orange" : "default"}>{value || "未记录"}</Tag>;
}
export function ResearchOverviewCards({ report, onSelect }: { report?: ResearchReport, onSelect: (key: string) => void }) {
	return (
		<div className="sa-research-map" aria-label="分层分析总览">
			{["macro", "industry", "company", "valuation", "technical", "chips"].map((key, index) => {
				const layer = report?.layers.find(item => item.key === key);
				const group = researchGroups.find(item => item.layers.includes(key));
				return (
					<button key={key} type="button" onClick={() => onSelect(group?.key || "research")}>
						<span className="sa-map-heading">
							<span>
								{String(index + 1).padStart(2, "0")}
								{" "}
								{layer?.title || ({ macro: "宏观环境", industry: "赛道分析", company: "公司分析", valuation: "估值分析", technical: "技术面分析", chips: "筹码与拥挤度" } as Record<string, string>)[key]}
							</span>
							<ResearchStatus value={layer?.status} />
						</span>
						<p>{layer?.conclusion || "该次分析未记录这一层"}</p>
					</button>
				);
			})}
		</div>
	);
}
function Layer({ layer }: { layer: ResearchLayer }) {
	const sources = layer.sources.filter(item => /^https?:\/\//i.test(item.url || ""));
	return (
		<Section title={layer.title} subtitle={layer.question}>
			<div className="sa-layer-verdict">
				<ResearchStatus value={layer.status} />
				<Copy text={layer.conclusion} />
			</div>
			{layer.key_points.length > 0 && (
				<div className="sa-layer-points">
					<h4>最重要的依据</h4>
					<TextList items={layer.key_points} />
				</div>
			)}
			<div className="sa-two-columns">
				{layer.risks.length > 0 && (
					<div>
						<h4>需要警惕</h4>
						<TextList items={layer.risks} />
					</div>
				)}
				{layer.watch_points.length > 0 && (
					<div>
						<h4>接下来观察什么</h4>
						<TextList items={layer.watch_points} />
					</div>
				)}
			</div>
			{layer.invalidation.length > 0 && (
				<div className="sa-layer-invalidation">
					<h4>什么情况会推翻判断</h4>
					<TextList items={layer.invalidation} />
				</div>
			)}
			{layer.data_gaps.length > 0 && (
				<div className="sa-layer-gaps">
					<b>资料缺口：</b>
					{layer.data_gaps.join("；")}
				</div>
			)}
			{sources.length > 0 && (
				<div className="sa-layer-sources">
					{sources.map(source => (
						<a key={`${source.url}-${source.date}-${source.title}`} href={source.url} target="_blank" rel="noopener noreferrer">
							{source.title || "证据来源"}
							{" "}
							{source.date || ""}
						</a>
					))}
				</div>
			)}
		</Section>
	);
}
function Facts({ items }: { items: [string, unknown, string?][] }) {
	return (
		<dl className="sa-facts">
			{items.map(([label, value, suffix]) => (
				<div key={label}>
					<dt>{label}</dt>
					<dd>{numberText(value, 2, suffix || "")}</dd>
				</div>
			))}
		</dl>
	);
}
export function ResearchLayers({ report, group }: { report?: ResearchReport, group: string }) {
	const keys = researchGroups.find(item => item.key === group)?.layers || [];
	const layers = report?.layers.filter(item => keys.includes(item.key)) || [];
	const snapshot = report?.data_snapshot;
	const chips = snapshot?.chips;
	const macro = snapshot?.macro;
	const technical = snapshot?.technical;
	return (
		<>
			{!layers.length && <Alert type="info" showIcon message="该次分析未记录这一层" description="历史判断按原样保留，无法用当前数据还原当时结论。" />}
			{layers.map(layer => <Layer key={layer.key} layer={layer} />)}
			{group === "macro" && macro && (
				<Section title="大盘证据快照" subtitle={`${macro.benchmark || "基准"} · 数据截至 ${macro.as_of || "未标注"}`}>
					<Facts items={[["指数收盘", macro.close], ["20日均线", macro.ma20], ["60日均线", macro.ma60], ["涨停家数", macro.sentiment?.limit_up_count], ["跌停家数", macro.sentiment?.limit_down_count], ["涨跌家数比", macro.sentiment?.up_down_ratio]]} />
					<p className="sa-muted">
						市场情绪日期：
						{macro.sentiment?.trading_date || "未提供"}
						{" "}
						{macro.sentiment_stale ? "（数据过期，仅作背景）" : ""}
					</p>
					<TextList items={macro.limitations} />
				</Section>
			)}
			{group === "fundamental" && (
				<>
					<Section title="最近四期财务证据" subtitle="营收、利润只展示明确的单季度数；其余保持报告原口径和单位">
						{snapshot?.financials?.length
							? (
								<div className="sa-snapshot-table">
									<table>
										<thead>
											<tr>
												<th>报告期</th>
												<th>单季营收</th>
												<th>单季归母净利</th>
												<th>毛利率（原口径）</th>
												<th>经营现金流（原口径）</th>
												<th>来源</th>
											</tr>
										</thead>
										<tbody>
											{snapshot.financials.map(row => (
												<tr key={`${row.period}-${row.source}-${row.revenue_single_quarter}-${row.profit_single_quarter}`}>
													<td>{row.period || "未提供"}</td>
													<td>{row.revenue_single_quarter || "缺少单季数"}</td>
													<td>{row.profit_single_quarter || "缺少单季数"}</td>
													<td>{row.gross_margin_reported || "未提供"}</td>
													<td>{row.cash_flow_reported || "未提供"}</td>
													<td>{row.source || "未标注"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)
							: <p className="sa-muted">该次分析缺少可核对的财务报表。</p>}
					</Section>
					{snapshot?.valuation && <Section title="估值证据快照" subtitle="PE/PB本身不能证明便宜；亏损、周期与同行口径需结合判断"><Facts items={[["PE TTM", snapshot.valuation.pe_ttm], ["PB", snapshot.valuation.pb]]} /></Section>}
				</>
			)}
			{group === "technical" && technical && <Section title="趋势与量价证据" subtitle={`日线截至 ${technical.data_date || "未标注"}`}><Facts items={[["20日均线", technical.ma20], ["60日均线", technical.ma60], ["距20日均线", technical.price_vs_ma20_pct, "%"], ["当日量 / 5日均量", technical.vol_ratio, "倍"], ["20个交易日涨幅", technical.change_20d, "%"], ["20日最高价", technical.high_20d], ["20日最低价", technical.low_20d]]} /></Section>}
			{group === "chips" && chips && (
				<>
					<div className="sa-two-columns">
						<Section title="持仓集中：股票在谁手里" subtitle="股东户数和前十大流通持仓属于持有人证据">
							<Space wrap>
								<Tag>{chips.ownership_trend}</Tag>
								<span className="sa-muted">
									户数较上期
									{numberText(chips.holder_change_pct, 2, "%")}
								</span>
							</Space>
							{!chips.share_capital_comparable && <p className="sa-layer-gaps">股本口径未确认一致，户数下降暂不能确认为持仓集中。</p>}
							<div className="sa-holder-series">
								{chips.holder_history.map(row => (
									<div key={row.as_of}>
										<span>{row.as_of}</span>
										<b>
											{numberText(row.count, 0)}
											{" "}
											户
										</b>
									</div>
								))}
							</div>
							<Facts items={[["前十大占同日流通股本", chips.top10_float_pct, "%"]]} />
							<p className="sa-muted">
								报告期：
								{chips.top10_as_of || "未提供"}
								；计算依据：
								{chips.top10_basis || "未提供"}
								。缺少同日分母口径时不估算占比；控股股东与名义持有人不等于主动投资机构。
							</p>
						</Section>
						<Section title="成本集中：买入价格是否接近" subtitle={`模型估算 · 截至 ${chips.cost.as_of || "未提供"}`}>
							<Tag>{chips.cost_trend}</Tag>
							<Facts items={[["90%成本下沿", chips.cost.cost_90_low], ["90%成本上沿", chips.cost.cost_90_high], ["90%集中度（越小越集中）", chips.cost.concentration_90_pct, "%"], ["70%集中度", chips.cost.concentration_70_pct, "%"], ["较20个交易日前变化", chips.concentration_change_20_sessions_pp, "个百分点"], ["估算获利筹码占比", chips.cost.profit_ratio_pct, "%"]]} />
							<p className="sa-muted">{chips.method}</p>
						</Section>
					</div>
					<Section title="交易拥挤：是否涨得急、换手热" subtitle="观察热度证据，不把高换手直接称为主力吸筹">
						<Facts items={[["当日换手率", chips.turnover_rate_pct, "%"], ["当日量 / 5日均量", chips.volume_ratio_5d, "倍"], ["距20日均线", chips.price_vs_ma20_pct, "%"], ["20个交易日涨幅", chips.return_20_sessions_pct, "%"]]} />
						<TextList items={chips.limitations} />
					</Section>
				</>
			)}
		</>
	);
}
export function ResearchComparisonView({ comparison }: { comparison?: ResearchComparison }) {
	return (
		<Section title="与上次分析相比" subtitle={comparison?.previous_at ? `上次：${comparison.previous_at}` : "本次是首份完整记录，或缺少可比较的上次快照"}>
			{comparison
				? (
					<>
						<p>
							分析建议：
							{comparison.previous_action || "未记录"}
							{" "}
							→
							{comparison.current_action || "未记录"}
						</p>
						<div className="sa-comparison-list">
							{comparison.changes.map(item => (
								<div key={item.key}>
									<h4>
										{item.title}
										{" "}
										<Tag>{item.previous_status === "未记录" ? "上次未记录" : item.changed ? "判断有变化" : "判断延续"}</Tag>
									</h4>
									<div className="sa-two-columns">
										<div>
											<span className="sa-field-label">上次</span>
											<Copy text={item.previous} />
										</div>
										<div>
											<span className="sa-field-label">本次</span>
											<Copy text={item.current} />
										</div>
									</div>
								</div>
							))}
						</div>
						<p className="sa-muted">{comparison.note}</p>
					</>
				)
				: <p className="sa-muted">后续分析会逐层记录结论变化；旧记录缺失的部分保持“未记录”。</p>}
		</Section>
	);
}
