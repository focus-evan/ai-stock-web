import { fetchInstitutionalResearch } from "#src/api/institutional-research";
import { useUserStore } from "#src/store/user";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Collapse, Empty, Space, Spin, Tag, Typography } from "antd";
import { ImpactCard, impactNames } from "./ImpactCard";

export default function InstitutionalHoldingEvidence() {
	const username = useUserStore(s => s.username);
	const query = useQuery({ queryKey: ["institutional-research", username], queryFn: fetchInstitutionalResearch, enabled: !!username, refetchInterval: 60000 });
	const data = query.data?.data;
	return (
		<Card title="持仓消息面多空" style={{ marginTop: 16 }} extra={<Button onClick={() => query.refetch()} disabled={!username}>刷新消息</Button>}>
			<Typography.Paragraph type="secondary">按当前登录账号的实际持仓关联近48小时机构资料。与日线技术判断分开；转载条数不作为多空投票或胜率。</Typography.Paragraph>
			{query.isLoading && <Spin />}
			{(query.isError || (data && data.holdings_status !== "ok")) && <Alert type="error" message="持仓消息读取失败，不能据此判断没有风险" />}
			{data?.holdings_status === "ok" && !data.holdings.length && <Empty description="当前账号没有有效持仓" />}
			{data?.holdings_status === "ok" && !!data.holdings.length && (
				<Collapse items={data.holdings.map(h => ({
					key: h.symbol,
					label: (
						<Space wrap>
							<Typography.Text strong>{`${h.name} · ${h.symbol}`}</Typography.Text>
							{Object.entries(impactNames).map(([key, name]) => {
								const count = h.impacts.filter(i => (i.net_bias?.direction ?? i.direction) === key).length;
								return count ? <Tag key={key}>{`${name} ${count}条`}</Tag> : null;
							})}
							{!h.impacts.length && <Tag>暂未发现明确关联</Tag>}
						</Space>
					),
					children: h.impacts.length ? h.impacts.map((impact, index) => <ImpactCard key={`${impact.report_id}-${index}`} impact={impact} />) : <Typography.Text type="secondary">近48小时已采集内容未发现明确关联，不表示没有影响；可在“机构观点与消息”更新关联。</Typography.Text>,
				}))}
				/>
			)}
		</Card>
	);
}
