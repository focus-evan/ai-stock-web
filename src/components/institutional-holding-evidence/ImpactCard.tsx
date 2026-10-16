import type { ResearchImpact } from "#src/api/institutional-research";
import { safeLink } from "#src/pages/institutional-research/data";
import { Button, Card, Space, Tag, Typography } from "antd";

export const impactNames: Record<string, string> = { bullish: "偏多", bearish: "偏空", neutral: "中性", mixed: "偏向待复核", uncertain: "证据不足" };
const relations: Record<string, string> = { direct: "原文点名", industry_chain: "产业链推断", macro: "宏观传导" };

export function impactBiasLabel(impact: ResearchImpact): string {
	const bias = impact.net_bias;
	if (!bias)
		return impactNames[impact.direction] || "偏向待复核";
	const horizon = { short_term: "短期", medium_term: "中期", long_term: "长期" }[bias.horizon];
	if (bias.direction === "uncertain")
		return `${horizon}偏向待确认`;
	if (bias.direction === "neutral")
		return `${horizon}中性`;
	const strength = bias.strength === "weak" ? "轻度" : bias.strength === "strong" ? "明显" : "";
	return `${horizon}${strength}${bias.direction === "bullish" ? "偏多" : "偏空"}`;
}

export function impactBiasColor(impact: ResearchImpact): string {
	const direction = impact.net_bias?.direction ?? impact.direction;
	return direction === "bullish" ? "red" : direction === "bearish" ? "green" : direction === "uncertain" || direction === "mixed" ? "gold" : "default";
}

export function ImpactCard({ impact, onOpen }: { impact: ResearchImpact, onOpen?: (id: string) => void }) {
	const inferred = impact.analysis_origin ? impact.analysis_origin === "system_inference" : impact.relation !== "direct" || impact.content_type === "news";
	const href = impact.source_url ? safeLink(impact.source_url) : undefined;
	const bias = impact.net_bias;
	return (
		<Card size="small" style={{ marginTop: 10 }}>
			<Space wrap>
				<Typography.Text strong>{`${impact.name} · ${impact.symbol}`}</Typography.Text>
				<Tag color={impactBiasColor(impact)}>{impactBiasLabel(impact)}</Tag>
				{bias && <Tag>{({ sentiment_valuation: "情绪 / 估值", earnings_orders: "订单 / 盈利", costs: "成本", liquidity: "流动性", uncertain: "传导待确认" })[bias.channel]}</Tag>}
				{bias && <Tag>{`判断把握：${{ low: "低", medium: "中", high: "高" }[bias.confidence]}`}</Tag>}
				<Tag>{inferred ? "系统影响推演" : "机构原文观点"}</Tag>
				<Tag>{relations[impact.relation] || impact.relation}</Tag>
				{impact.verified === false && <Tag color="orange">来源待核验</Tag>}
			</Space>
			{impact.title && <div style={{ marginTop: 8 }}><Typography.Text strong>{impact.title}</Typography.Text></div>}
			{impact.summary && <Typography.Paragraph type="secondary" style={{ margin: "8px 0" }}>{impact.summary}</Typography.Paragraph>}
			{bias && (
				<div style={{ marginTop: 10, padding: 12, background: "#fafafa", borderRadius: 8 }}>
					<Typography.Paragraph style={{ marginBottom: 6 }}>
						<Typography.Text strong>{`当前判断：${impactBiasLabel(impact)}。`}</Typography.Text>
						{bias.reason}
					</Typography.Paragraph>
					{bias.condition && (
						<Typography.Paragraph style={{ marginBottom: 6 }}>
							<Typography.Text strong>成立前提：</Typography.Text>
							{bias.condition}
						</Typography.Paragraph>
					)}
					{bias.longer_term && (
						<Typography.Paragraph style={{ marginBottom: 6 }}>
							<Typography.Text strong>更长期看：</Typography.Text>
							{bias.longer_term}
						</Typography.Paragraph>
					)}
					<div>
						<Typography.Text strong>何时改变判断：</Typography.Text>
						{bias.reversal_condition}
					</div>
					<Typography.Text type="secondary">该偏向仅描述这条消息的影响，不代表整只股票的买卖结论。</Typography.Text>
				</div>
			)}
			<Typography.Paragraph style={{ margin: "8px 0" }}>{impact.mechanism}</Typography.Paragraph>
			{impact.bull_case && (
				<Typography.Paragraph>
					<Typography.Text strong>利多条件：</Typography.Text>
					{impact.bull_case}
				</Typography.Paragraph>
			)}
			{impact.bear_case && (
				<Typography.Paragraph>
					<Typography.Text strong>利空 / 风险条件：</Typography.Text>
					{impact.bear_case}
				</Typography.Paragraph>
			)}
			{impact.horizon && <div><Typography.Text type="secondary">{`影响期限：${impact.horizon}`}</Typography.Text></div>}
			<div><Typography.Text type="secondary">{`下一项核验：${impact.watch_next}`}</Typography.Text></div>
			{impact.published_at && <div><Typography.Text type="secondary">{`消息时间：${new Date(impact.published_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}`}</Typography.Text></div>}
			{impact.analyzed_at && <div><Typography.Text type="secondary">{`关联更新：${new Date(impact.analyzed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}`}</Typography.Text></div>}
			<details style={{ marginTop: 8 }}>
				<summary>查看关联依据</summary>
				<blockquote>{impact.evidence_quote}</blockquote>
				{bias && <blockquote>{`净偏向依据：${bias.evidence_quote}`}</blockquote>}
				{bias && <Typography.Text type="secondary">净偏向是系统在指定期限内的权衡；判断把握不是收益概率。</Typography.Text>}
				{inferred && <Typography.Text type="secondary">该持仓影响为系统分析，不代表机构已对该股票给出评级。</Typography.Text>}
			</details>
			<Space>
				{onOpen && impact.report_id && <Button type="link" onClick={() => onOpen(impact.report_id!)}>查看报告与证据</Button>}
				{href && <a href={href} target="_blank" rel="noopener noreferrer">打开消息来源 ↗</a>}
			</Space>
		</Card>
	);
}
