import type { AnalysisData } from "./presentation";
import WatchlistModal from "#src/components/WatchlistModal";
import { StarOutlined } from "@ant-design/icons";
import { Alert, Button, Progress, Space, Tabs, Tag } from "antd";
import { useState } from "react";
import { actionTone, finiteNumber, numberText, priceText } from "./data";
import { Copy, ResultSource, Section, TextList } from "./presentation";

function PriceRange({ value, market }: {
	value?: {
		price_low?: number
		price_high?: number
		description?: string
	}
	market?: string
}) {
	const low = finiteNumber(value?.price_low);
	const high = finiteNumber(value?.price_high);
	const valid = low !== null && high !== null && low > 0 && high >= low;
	return (
		<>
			<strong className="sa-price-value">{valid ? `${priceText(low, market)} – ${numberText(high)}` : "未提供有效区间"}</strong>
			<Copy text={value?.description} />
		</>
	);
}
export default function AnalysisResult({ data, historical = false }: {
	data: AnalysisData
	historical?: boolean
}) {
	const [watchlistOpen, setWatchlistOpen] = useState(false);
	const market = data.market || (/^\d{5}$/.test(data.stock_code) ? "hk" : "a");
	const veto = data.veto_checks?.veto_triggered === true;
	const downgraded = data.llm_enhanced === false;
	const change = finiteNumber(data.change_pct);
	const score = finiteNumber(data.score);
	const confidence = finiteNumber(data.confidence);
	const warnings: string[] = Array.isArray(data.market_data?.warnings) ? data.market_data.warnings.filter((item: unknown) => typeof item === "string") : [];
	const dimensions = data.dimension_scores || [];
	const summary = (
		<div className="sa-overview-grid">
			<div>
				<Section title="分析结论" subtitle="本次保存的研究判断"><Copy text={data.summary} /></Section>
				<Section title="价格计划" subtitle="基于分析时快照；区间与仓位为原始分析建议">
					<div className="sa-price-grid">
						<div>
							<span className="sa-field-label">买入参考区间</span>
							<PriceRange value={data.buy_point} market={market} />
						</div>
						<div>
							<span className="sa-field-label">卖出参考区间</span>
							<PriceRange value={data.sell_point} market={market} />
						</div>
						<div>
							<span className="sa-field-label">止损参考</span>
							<strong className="sa-price-value">{priceText(data.stop_loss?.price, market)}</strong>
							<Copy text={data.stop_loss?.description} />
						</div>
					</div>
					<div className="sa-position">
						<span className="sa-field-label">仓位与执行</span>
						<Copy text={data.position_plan?.position_pct || data.position_advice} />
						<Copy text={data.position_plan?.execution || data.rebalance_sop?.trigger} />
					</div>
				</Section>
				<div className="sa-two-columns">
					{([["短期展望 · 1–2 周", data.short_term_outlook], ["中长期展望 · 3–6 月", data.long_term_outlook]] as const).map(([title, outlook]) => (
						<Section key={title} title={title}>
							<Space wrap>
								<Tag>{outlook?.direction || "方向未提供"}</Tag>
								<span>
									目标
									{priceText(outlook?.target_price, market)}
								</span>
							</Space>
							<Copy text={outlook?.detail} />
						</Section>
					))}
				</div>
			</div>
			<aside className="sa-decision-aside">
				<Section title="关键风险">
					<TextList items={data.risk_factors?.slice(0, 3)} />
					{(data.risk_factors?.length || 0) > 3 && <p className="sa-muted">全部风险见「风险与反证」。</p>}
				</Section>
				<Section title="支持因素">
					<TextList items={data.positive_factors?.slice(0, 3)} />
					{(data.positive_factors?.length || 0) > 3 && <p className="sa-muted">全部支持因素见「研究依据」。</p>}
				</Section>
				<Section title="结果状态">
					<dl className="sa-facts">
						<div>
							<dt>生成方式</dt>
							<dd><ResultSource value={data.llm_enhanced} /></dd>
						</div>
						<div>
							<dt>否决检查</dt>
							<dd>{veto ? "报告标记已触发" : data.veto_checks ? "报告未标记触发" : "未提供"}</dd>
						</div>
						<div>
							<dt>框架版本</dt>
							<dd>{data.framework_version || "未标注"}</dd>
						</div>
						<div>
							<dt>分析日期</dt>
							<dd>{data.market_date || "未标注"}</dd>
						</div>
					</dl>
					<p className="sa-muted">评分与置信度来自本次分析，未经胜率校准。未标记风险不代表风险已经排除。</p>
				</Section>
			</aside>
		</div>
	);
	const research = (
		<>
			<Section title="六维研究评分" subtitle="显示原始分项；总分未在前端重新计算">
				{dimensions.length
					? (
						<div className="sa-dimension-list">
							{dimensions.map((item, index) => {
								const current = finiteNumber(item.current_score);
								const valid = current !== null && current >= 0 && current <= 100;
								return (
									<div className="sa-dimension" key={`${index}-${item.dimension}`}>
										<div>
											<h4>{item.dimension}</h4>
											<span className="sa-muted">
												权重
												{numberText(finiteNumber(item.weight) === null ? null : item.weight * 100, 0, "%")}
											</span>
										</div>
										<div>
											<div className="sa-dimension-stats">
												<b>
													{numberText(current, 0)}
													{valid ? " / 100" : " · 口径待核验"}
												</b>
												<span>
													趋势
													{numberText(item.trend_score, 0)}
													{" "}
													· 置信度
													{numberText(finiteNumber(item.confidence) === null ? null : item.confidence * 100, 0, "%")}
												</span>
											</div>
											{valid && <Progress percent={current} showInfo={false} size="small" />}
											<Copy text={item.rationale} />
										</div>
									</div>
								);
							})}
						</div>
					)
					: <p className="sa-muted">本次没有提供六维评分</p>}
			</Section>
			<div className="sa-two-columns">
				<Section title="行业与竞争位置">
					<Space wrap>
						<Tag>{data.industry_analysis?.industry || data.industry || "行业未提供"}</Tag>
						{data.industry_analysis?.sector && <Tag>{data.industry_analysis.sector}</Tag>}
					</Space>
					<Copy text={data.industry_analysis?.industry_outlook} />
					<Copy text={data.industry_analysis?.position} />
				</Section>
				<Section title="竞争优势与护城河">
					<Copy text={data.fundamental_analysis?.moat} />
					<Copy text={data.fundamental_analysis?.competitive_advantage} />
					<Copy text={data.fundamental_analysis?.detail} />
				</Section>
				<Section title="财务摘要">
					<dl className="sa-facts">
						<div>
							<dt>PE TTM</dt>
							<dd>{numberText(data.pe_ttm)}</dd>
						</div>
						<div>
							<dt>PB</dt>
							<dd>{numberText(data.pb)}</dd>
						</div>
						<div>
							<dt>财务分类</dt>
							<dd>{data.financial_summary?.case_type || "未提供"}</dd>
						</div>
					</dl>
					<Copy text={data.financial_summary?.revenue_trend} />
					<Copy text={data.financial_summary?.profit_trend} />
					<Copy text={data.financial_summary?.growth} />
					<Copy text={data.financial_summary?.detail} />
				</Section>
				<Section title="技术面">
					<Space wrap>
						{data.kline_analysis?.trend && <Tag>{data.kline_analysis.trend}</Tag>}
						{data.kline_analysis?.pattern && <Tag>{data.kline_analysis.pattern}</Tag>}
					</Space>
					<Copy text={data.kline_analysis?.detail} />
				</Section>
			</div>
			<Section title="支持因素"><TextList items={data.positive_factors} /></Section>
			<Section title="催化与来源" subtitle="原始分析提供的线索；来源存在不等于已验证">
				{data.catalyst_checks?.length
					? (
						<div className="sa-evidence-list">
							{data.catalyst_checks.map((item, index) => (
								<article key={`${index}-${item.category}`}>
									<div className="sa-evidence-heading">
										<h4>{item.category}</h4>
										<Space wrap>
											<Tag>{item.status || (item.checked ? "已标记检索" : "未检索")}</Tag>
											{item.credibility && (
												<Tag>
													原始可信级
													{item.credibility}
												</Tag>
											)}
											<span className="sa-muted">{item.date || "日期未提供"}</span>
										</Space>
									</div>
									<Copy text={item.detail} />
									{item.source && <div className="sa-source"><Copy text={item.source} /></div>}
								</article>
							))}
						</div>
					)
					: <p className="sa-muted">本次未提供催化检查</p>}
			</Section>
		</>
	);
	const risk = (
		<>
			<Section title="否决检查" subtitle="报告中的风险标记">
				<Copy text={data.veto_checks?.summary} />
				{data.veto_checks?.items?.map((item, index) => (
					<div className="sa-evidence-row" key={`${index}-${item.category}`}>
						<Space>
							<b>{item.category}</b>
							<Tag color={item.triggered ? "red" : "default"}>{item.triggered ? "触发" : "未标记触发"}</Tag>
						</Space>
						<Copy text={item.detail} />
					</div>
				))}
			</Section>
			<div className="sa-two-columns">
				<Section title="风险因素"><TextList items={data.risk_factors} /></Section>
				<Section title="反证：哪些条件会推翻判断"><TextList items={data.counter_evidence} /></Section>
			</div>
			<Section title="概念真实性">
				<Tag>{data.concept_authenticity?.verdict || "未提供结论"}</Tag>
				{data.concept_authenticity?.checks?.map((item, index) => (
					<div className="sa-evidence-row" key={`${index}-${item.question}`}>
						<b>{item.question}</b>
						<Tag color={item.passed ? "blue" : "default"}>{item.passed ? "报告标记通过" : "未通过"}</Tag>
						<Copy text={item.detail} />
					</div>
				))}
			</Section>
			<Section title="重复叙事与评分折扣">
				<Copy text={data.anti_correlation_check?.detail} />
				<Space wrap>{data.anti_correlation_check?.same_story_dimensions?.map(item => <Tag key={item}>{item}</Tag>)}</Space>
				<p className="sa-muted">
					原始折扣系数
					{numberText(data.anti_correlation_check?.discount_factor)}
					{" "}
					· 原始调整分
					{numberText(data.anti_correlation_check?.adjusted_score, 0)}
					；不自动替代综合分。
				</p>
			</Section>
		</>
	);
	const execution = (
		<>
			<div className="sa-two-columns">
				<Section title="仓位计划">
					<Copy text={data.position_plan?.position_pct || data.position_advice} />
					<Copy text={data.position_plan?.cash_reserve_rule} />
					<Copy text={data.position_plan?.execution} />
				</Section>
				<Section title="调仓条件">
					<Copy text={data.rebalance_sop?.priority} />
					<Copy text={data.rebalance_sop?.trigger} />
					<Copy text={data.rebalance_sop?.sell_plan} />
					<Copy text={data.rebalance_sop?.buy_plan} />
				</Section>
			</div>
			<Section title="心理纪律">
				<Copy text={data.psychology_check?.summary} />
				<TextList items={data.psychology_check?.risks} />
				<TextList items={data.psychology_check?.discipline_answers} />
			</Section>
			<details className="sa-review">
				<summary>复盘清单与案例</summary>
				<h4>每日复盘</h4>
				<TextList items={data.review_template?.daily} />
				<h4>每周体检</h4>
				<TextList items={data.review_template?.weekly} />
				<h4>季度回看</h4>
				<TextList items={data.review_template?.quarterly} />
				{data.mistake_case_notes?.map((item, index) => (
					<div key={`${index}-${item.case}`}>
						<h4>{item.case}</h4>
						<Copy text={item.lesson} />
						<Copy text={item.patch} />
					</div>
				))}
			</details>
		</>
	);
	return (
		<div className="sa-result">
			<div className="sa-result-heading">
				<div>
					<div className="sa-eyebrow">{historical ? "历史分析快照" : "本次分析结果"}</div>
					<h2>
						{data.stock_name}
						<span>{data.stock_code}</span>
						<Tag>{market === "hk" ? "港股" : "A股"}</Tag>
					</h2>
					<p className="sa-muted">
						{data.industry || data.industry_analysis?.industry || "行业待补充"}
						{" "}
						· 分析于
						{" "}
						{data.analyzed_at || "未标注"}
					</p>
				</div>
				<Button icon={<StarOutlined />} onClick={() => setWatchlistOpen(true)}>加入自选盯盘</Button>
			</div>
			{data.fuzzy_match && <Alert showIcon type="warning" message="当前股票由名称模糊匹配，请先核对代码" description={data.candidates?.map(item => `${item.stock_name}（${item.stock_code}）`).join("、")} />}
			{veto && <Alert showIcon type="error" message="报告标记已触发否决，请先核验风险" description={data.action === "买入" ? "原始建议仍为买入，与否决标记冲突；本页保留原始结果供核验。" : data.veto_checks?.summary} />}
			{downgraded && <Alert showIcon type="warning" message="本次为规则降级结果" description="以下建议与评分来自降级规则，完整模型分析未成功；请先核验依据，再决定是否采用。" />}
			{warnings.length > 0 && <Alert showIcon type="warning" message="本次数据存在缺口或降级" description={<TextList items={warnings} />} />}
			<div className="sa-verdict">
				<div className={`sa-action sa-action-${actionTone(data.action)}`}>
					<span className="sa-field-label">原始分析建议</span>
					<strong>{data.action || "未提供"}</strong>
					<Space wrap>
						<ResultSource value={data.llm_enhanced} />
						<Tag color={data.risk_level === "高" ? "red" : "default"}>{data.risk_level ? `${data.risk_level}风险` : "风险未标注"}</Tag>
					</Space>
				</div>
				<div className="sa-metrics">
					<div>
						<span>分析时价</span>
						<b>{priceText(data.current_price, market)}</b>
						<small className={change !== null && change !== 0 ? change > 0 ? "sa-up" : "sa-down" : ""}>{change === null ? "涨跌幅未提供" : `${change > 0 ? "+" : ""}${numberText(change)}%`}</small>
					</div>
					<div>
						<span>综合评分</span>
						<b>{score !== null && score >= 0 && score <= 100 ? `${numberText(score, 0)} / 100` : "口径待核验"}</b>
						<small>{score !== null && (score < 0 || score > 100) ? `原始值 ${score}` : "分析评分，非收益预测"}</small>
					</div>
					<div>
						<span>结果置信度</span>
						<b>{confidence !== null && confidence >= 0 && confidence <= 100 ? `${numberText(confidence, 0)}%` : "口径待核验"}</b>
						<small>未经胜率校准</small>
					</div>
					<div>
						<span>推荐缓存命中</span>
						<b>{market === "hk" ? "不适用" : data.strategies_total === 0 ? "无策略数据" : `${numberText(data.strategies_hit, 0)} / ${numberText(data.strategies_total, 0)}`}</b>
						<small>未命中不代表看空</small>
					</div>
				</div>
			</div>
			<p className="sa-snapshot-note">
				以上价格与涨跌幅属于分析时快照，未随当前行情刷新。
				{historical ? "历史记录未保存完整原始行情包。" : ""}
			</p>
			{data.quadrant_classification && (
				<div className="sa-classification">
					<Space wrap>
						{data.framework_version && <Tag>{data.framework_version}</Tag>}
						{data.quadrant_classification.quadrant && <Tag>{data.quadrant_classification.quadrant}</Tag>}
						{data.quadrant_classification.rating && <Tag>{data.quadrant_classification.rating}</Tag>}
					</Space>
					{data.quadrant_classification.summary && <Copy text={data.quadrant_classification.summary} />}
				</div>
			)}
			<Tabs
				className="sa-result-tabs"
				defaultActiveKey="overview"
				items={[
					{ key: "overview", label: "结论与计划", children: summary },
					{ key: "research", label: "研究依据", children: research },
					{ key: "risk", label: "风险与反证", children: risk },
					{ key: "strategies", label: "战法信号", children: (
						<Section title="战法与推荐缓存" subtitle="信号与命中数是两个口径">
							{data.strategy_analysis?.length
								? (
									<div className="sa-evidence-list">
										{data.strategy_analysis.map((item, index) => (
											<article key={`${index}-${item.strategy}`}>
												<Space wrap>
													<h4>{item.strategy}</h4>
													<Tag color={item.signal === "看多" ? "red" : item.signal === "看空" ? "green" : "default"}>{item.signal}</Tag>
												</Space>
												<Copy text={item.detail} />
											</article>
										))}
									</div>
								)
								: <p className="sa-muted">{market === "hk" ? "港股不读取 A 股战法推荐缓存。" : "本次没有提供战法明细。"}</p>}
						</Section>
					) },
					{ key: "execution", label: "仓位与复盘", children: execution },
				]}
			/>
			<WatchlistModal open={watchlistOpen} onClose={() => setWatchlistOpen(false)} onSuccess={() => setWatchlistOpen(false)} stockCode={data.stock_code} stockName={data.stock_name} suggestedBuyPrice={finiteNumber(data.current_price) || undefined} sourceDate={data.market_date} />
		</div>
	);
}
