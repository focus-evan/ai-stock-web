import type { AIEvidence, AIJudgment, AIResearchState, IndustryAIStrategy } from "#src/api/industry-ai";
import { fetchIndustryAI, fetchIndustryAIStrategy, refreshIndustryAI } from "#src/api/industry-ai";
import { Alert, Button, Card, Collapse, Empty, Space, Statistic, Table, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { decisionLabels, safeEvidenceUrl } from "./research-model";

const { Paragraph, Text } = Typography;
const decisionColors = { focus: "blue", watch: "orange", exclude: "default" };
const metrics: Record<string, string> = { revenue_growth: "营收同比", profit_growth: "归母净利同比", gross_margin: "毛利率", net_margin: "净利率" };
const directions: Record<string, string> = { increase: "提升", decrease: "下降", stable: "大致稳定" };
const decisions: Record<string, string> = { baseline: "初始版本", insufficient_data: "样本积累中", applied: "已更新规则", rejected: "保留现行规则", observed: "继续观察", rollback: "已回滚", frozen: "规则已冻结" };
const time = (value?: string | null) => value ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "尚未完成";

export function useIndustryAI(chain: string) {
	const [data, setData] = useState<AIResearchState | null>(null);
	const [strategy, setStrategy] = useState<IndustryAIStrategy | null>(null);
	const [error, setError] = useState("");
	const [refreshing, setRefreshing] = useState(false);
	const [generation, setGeneration] = useState(0);
	useEffect(() => {
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout>;
		setData(null);
		setStrategy(null);
		setError("");
		const load = async () => {
			let delay = 60000;
			try {
				const response = await fetchIndustryAI(chain, controller.signal);
				if (controller.signal.aborted)
					return;
				setData(response.data);
				setError("");
				if (["collecting", "analyzing"].includes(response.data.attempt?.status || ""))
					delay = 5000;
				try {
					const state = await fetchIndustryAIStrategy(controller.signal);
					if (!controller.signal.aborted)
						setStrategy(state.data);
				}
				catch {
					if (!controller.signal.aborted)
						setStrategy(null);
				}
			}
			catch {
				if (!controller.signal.aborted) {
					setError("自动研究暂时连接失败，已显示的结论仅供历史查看。");
					setData(previous => previous ? { ...previous, current: false } : null);
				}
			}
			finally {
				if (!controller.signal.aborted)
					timer = setTimeout(load, delay);
			}
		};
		void load();
		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [chain, generation]);
	const refresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await refreshIndustryAI(chain);
			setGeneration(v => v + 1);
		}
		catch { setError("暂不能发起额外复核，请确认管理员权限或等待自动任务重试。"); }
		finally { setRefreshing(false); }
	}, [chain]);
	return { data, strategy, error, refresh, refreshing };
}

export function AIResearchStatus({ data, strategy, error, onRefresh, refreshing }: ReturnType<typeof useIndustryAI> & { onRefresh: () => void }) {
	const running = ["collecting", "analyzing"].includes(data?.attempt?.status || "");
	const output = data?.latest?.output;
	return (
		<Card className="industry-ai-status" title="AI自动研究 · 选股 · 模拟验证">
			<Space wrap>
				<Tag color={running ? "processing" : data?.current ? "success" : "orange"}>{running ? "正在收集证据与分析" : data?.current ? "本轮证据已检查" : output ? "历史判断 · 新买暂停" : "等待首轮自动研究"}</Tag>
				<Text type="secondary">
					最近检查：
					{time(data?.attempt?.finished_at)}
				</Text>
				<Button size="small" loading={refreshing} disabled={running} onClick={onRefresh}>立即AI复核</Button>
			</Space>
			<Paragraph style={{ marginTop: 12 }}>{output?.summary || "系统自动收集财报与行业信息，生成赛道和公司判断，保存证据并持续复盘，无需填写研究笔记。"}</Paragraph>
			<Text type="secondary">每天北京时间 07:50、17:30 检查证据；交易时段独立校验模拟买点。财报预测与实际模拟成交分别检验。</Text>
			{error && <Alert style={{ marginTop: 12 }} type="error" showIcon message={error} />}
			{data?.attempt?.error && <Alert style={{ marginTop: 12 }} type="warning" showIcon message={data.attempt.error} />}
			{strategy && !strategy.runtime.loop_running && <Alert style={{ marginTop: 12 }} type="warning" showIcon message="自动研究调度未运行，等待服务恢复" />}
		</Card>
	);
}

export function AIJudgmentCard({ title, judgment, evidence = [], current }: { title: string, judgment?: AIJudgment, evidence?: AIEvidence[], current: boolean }) {
	return (
		<Card title={`${title} · AI判断与自动跟踪`} className="industry-ai-judgment">
			{judgment
				? (
					<>
						<Space wrap>
							<Tag color={decisionColors[judgment.decision]}>{decisionLabels[judgment.decision]}</Tag>
							<Text type="secondary">
								研究质量
								{judgment.quality_score.toFixed(0)}
								{" "}
								/ 100 · 非预测胜率
							</Text>
							{!current && <Tag color="orange">历史判断</Tag>}
						</Space>
						<Paragraph style={{ marginTop: 12 }}>{judgment.thesis}</Paragraph>
						<div className="industry-ai-reason-grid">
							<section>
								<Text strong>反证与主要疑点</Text>
								<p>{judgment.counterargument}</p>
							</section>
							<section>
								<Text strong>下一轮自动核对</Text>
								<p>{judgment.next_check}</p>
							</section>
						</div>
						{judgment.forecast?.status === "pending" && (
							<Paragraph>
								待检验假设：下一次披露的
								{metrics[judgment.forecast.metric] || judgment.forecast.metric}
								{directions[judgment.forecast.direction] || judgment.forecast.direction}
								。基准报告期
								{" "}
								{judgment.forecast.baseline_period}
								，当前尚未结算。
							</Paragraph>
						)}
						{judgment.gate_issues.length > 0 && <Alert type="warning" showIcon message="当前执行限制" description={judgment.gate_issues.join("；")} />}
						<Collapse
							style={{ marginTop: 12 }}
							items={[{ key: "evidence", label: `查看 ${judgment.evidence_ids.length} 条判断依据`, children: (
								<ul className="industry-research-list">
									{judgment.evidence_ids.map((id) => {
										const item = evidence.find(e => e.id === id);
										const url = safeEvidenceUrl(item?.url);
										return (
											<li key={id}>
												{url ? <a href={url} target="_blank" rel="noreferrer">{item?.title || id}</a> : item?.title || id}
												<div>
													<Text type="secondary">
														{item?.as_of || "历史目录，时点待核验"}
														{" "}
														·
														{" "}
														{item?.source || item?.scope}
													</Text>
												</div>
											</li>
										);
									})}
								</ul>
							) }]}
						/>
					</>
				)
				: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="AI尚未完成该对象的研究，系统会自动生成判断" />}
		</Card>
	);
}

export function AIEvolutionPanel({ data, strategy, chain }: { data: AIResearchState | null, strategy: IndustryAIStrategy | null, chain: string }) {
	const evolution = strategy?.evolution;
	const stats = evolution?.latest_metrics;
	const output = data?.latest?.output;
	return (
		<div className="industry-ai-evolution">
			<Card title="研究复盘与自进化进度">
				<div className="industry-research-stats">
					<Statistic title="已核验经营假设" value={data?.reviews.length || 0} />
					<Statistic title="被新证据否定" value={data?.reviews.filter(r => r.outcome === "contradicted").length || 0} />
					<Statistic title="完整模拟成交轮次" value={stats?.sample_count || 0} />
					<Statistic title="当前规则版本" value={evolution?.version || 1} prefix="V" />
				</div>
				<Alert showIcon type="info" message={decisions[evolution?.last_decision || "baseline"] || evolution?.last_decision} description={evolution?.last_reason || "初始规则尚无验证成绩，等待真实后续证据和模拟成交。"} />
				<Paragraph style={{ marginTop: 12 }}>财报披露后检查经营假设；交易参数只学习扣费且证据完整的模拟成交。至少 60 轮、20 个入场日期，并通过按日期留出的验证后才会调整质量门槛；每次最多 1 分，效果恶化时回滚。</Paragraph>
				{output?.learning_applied.length ? <ul className="industry-research-list">{output.learning_applied.map(item => <li key={item}>{item}</li>)}</ul> : <Text type="secondary">尚无可用于本轮的成熟历史教训，后续会持续积累。</Text>}
			</Card>
			<Card title="本产业候选与模拟执行" extra={<a href="#/short-term-strategy/portfolio">查看模拟组合</a>}>
				<Table
					size="small"
					rowKey="code"
					scroll={{ x: 680 }}
					pagination={false}
					dataSource={strategy?.recommendations.filter(c => c.chain_code === chain) || []}
					columns={[
						{ title: "公司", render: (_, c) => `${c.name} ${c.code}` },
						{ title: "执行状态", dataIndex: "decision" },
						{ title: "等待条件", render: (_, c) => c.blocking_reasons.join("；") || "全部确认条件通过，等待实际盘口成交" },
					]}
					locale={{ emptyText: "当前没有符合准入条件的候选，模拟组合保留现金" }}
				/>
			</Card>
			<Card title="经营假设的证据复核">
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: 750 }}
					dataSource={data?.reviews || []}
					columns={[
						{ title: "公司", dataIndex: "stock_name" },
						{ title: "指标", render: (_, r) => metrics[r.metric] || r.metric },
						{ title: "基准 → 后续披露", render: (_, r) => `${r.before.toFixed(2)}% → ${r.after.toFixed(2)}%` },
						{ title: "报告期", dataIndex: "period" },
						{ title: "复核结果", render: (_, r) => r.outcome === "confirmed" ? "得到验证" : "被新证据否定" },
					]}
					locale={{ emptyText: "还没有晚于判断时间的新财报，不提前计算准确率" }}
				/>
			</Card>
			<Card title="自动研究历史">
				<Table
					rowKey="run_id"
					size="small"
					scroll={{ x: 700 }}
					dataSource={data?.history || []}
					columns={[
						{ title: "时间", render: (_, r) => time(r.started_at) },
						{ title: "状态", render: (_, r) => ({ completed: "已完成", unchanged: "证据无变化", failed: "失败待重试", analyzing: "分析中", collecting: "收集证据" })[r.status] || r.status },
						{ title: "判断摘要", render: (_, r) => r.summary || r.error || "正在处理" },
					]}
				/>
			</Card>
			<Card title="规则版本记录">
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: 700 }}
					dataSource={strategy?.evolution_history || []}
					columns={[
						{ title: "时间", dataIndex: "created_at" },
						{ title: "版本", render: (_, r) => `V${r.version_before} → V${r.version_after}` },
						{ title: "决定", render: (_, r) => decisions[r.decision] || r.decision },
						{ title: "依据", dataIndex: "reason" },
					]}
				/>
			</Card>
		</div>
	);
}
