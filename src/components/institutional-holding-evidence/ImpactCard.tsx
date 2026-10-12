import type { ResearchImpact } from "#src/api/institutional-research";
import { safeLink } from "#src/pages/institutional-research/data";
import { Button, Card, Space, Tag, Typography } from "antd";

export const impactNames: Record<string, string> = { bullish: "偏利多", bearish: "偏利空", mixed: "多空并存", uncertain: "影响待确认" };
const relations: Record<string, string> = { direct: "原文点名", industry_chain: "产业链推断", macro: "宏观传导" };

export function ImpactCard({ impact, onOpen }: { impact: ResearchImpact, onOpen?: (id: string) => void }) {
	const inferred = impact.analysis_origin ? impact.analysis_origin === "system_inference" : impact.relation !== "direct" || impact.content_type === "news";
	const href = impact.source_url ? safeLink(impact.source_url) : undefined;
	return (
		<Card size="small" style={{ marginTop: 10 }}>
			<Space wrap>
				<Typography.Text strong>{`${impact.name} · ${impact.symbol}`}</Typography.Text>
				<Tag color={impact.direction === "bullish" ? "red" : impact.direction === "bearish" ? "green" : "default"}>{impactNames[impact.direction] || impact.direction}</Tag>
				<Tag>{inferred ? "系统影响推演" : "机构原文观点"}</Tag>
				<Tag>{relations[impact.relation] || impact.relation}</Tag>
				{impact.verified === false && <Tag color="orange">来源待核验</Tag>}
			</Space>
			{impact.title && <div style={{ marginTop: 8 }}><Typography.Text strong>{impact.title}</Typography.Text></div>}
			{impact.summary && <Typography.Paragraph type="secondary" style={{ margin: "8px 0" }}>{impact.summary}</Typography.Paragraph>}
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
				{inferred && <Typography.Text type="secondary">该持仓影响为系统分析，不代表机构已对该股票给出评级。</Typography.Text>}
			</details>
			<Space>
				{onOpen && impact.report_id && <Button type="link" onClick={() => onOpen(impact.report_id!)}>查看报告与证据</Button>}
				{href && <a href={href} target="_blank" rel="noopener noreferrer">打开消息来源 ↗</a>}
			</Space>
		</Card>
	);
}
