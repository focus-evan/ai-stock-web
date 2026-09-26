import type { AdaptiveCandidate, AdaptiveData } from "#src/api/adaptive-confluence";
import { analyzeAdaptiveEvolution, fetchAdaptiveConfluence, freezeAdaptiveEvolution, refreshAdaptiveConfluence } from "#src/api/adaptive-confluence";
import { BasicContent } from "#src/components/basic-content";
import RecommendationHistory from "#src/components/RecommendationHistory";
import StrategyFollowTab from "#src/components/strategy-follow-tab";
import { Alert, Button, Card, Col, Descriptions, Empty, message, Row, Space, Statistic, Table, Tabs, Tag, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import "#src/pages/short-term-strategy/strategy-visuals.css";

const { Text, Paragraph, Title } = Typography;
const STRATEGY = "adaptive_confluence";
const money = (n: number) => Number.isFinite(n) && n > 0 ? n.toFixed(2) : "—";

export default function AdaptiveConfluence() {
	const [data, setData] = useState<AdaptiveData>({ recommendations: [] });
	const [loading, setLoading] = useState(false);
	const [acting, setActing] = useState(false);
	const [now, setNow] = useState(Date.now());
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const result = await fetchAdaptiveConfluence();
			setData(result.data);
		}
		catch { message.error("读取战法失败，请稍后重试"); }
		finally { setLoading(false); }
	}, []);
	useEffect(() => {
		void load();
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [load]);
	const act = async (fn: () => Promise<unknown>) => {
		setActing(true);
		try {
			await fn();
			await load();
		}
		catch { message.error("操作失败，保留当前状态"); }
		finally { setActing(false); }
	};
	const liveDecision = (r: AdaptiveCandidate) => {
		const expiry = r.valid_until ? Date.parse(`${r.valid_until.replace(" ", "T")}+08:00`) : 0;
		return r.decision === "买" && expiry > now ? "模拟买入候选" : r.decision === "买" ? "已过期，等待重检" : "只观察";
	};
	const metric = data.evolution?.latest_metrics;
	const market = data.market_gate;
	return (
		<BasicContent>
			<Space direction="vertical" size="large" style={{ width: "100%" }}>
				<Row className="app-page-hero strategy-heading" gutter={[16, 16]} justify="space-between" align="middle">
					<Col>
						<Title level={3} style={{ margin: 0 }}>情绪催化自适应</Title>
						<Text type="secondary">市场情绪 → 消息催化 → 缩量回撤转强 → 可成交确认 → 完整交易复盘</Text>
					</Col>
					<Col>
						<Space>
							<Button loading={loading} onClick={load}>读取最新</Button>
							<Button
								type="primary"
								loading={acting}
								onClick={() => act(async () => {
									const result = await refreshAdaptiveConfluence();
									if (result.status !== "success")
										message.warning(result.message || "数据不足，本轮保持观察");
								})}
							>
								重新扫描
							</Button>
						</Space>
					</Col>
				</Row>
				<Alert type="info" showIcon message="独立模拟战法 · 正在前向验证" description="目标是提高扣费后的交易胜率与收益质量。评分用于筛选，不能当作预测胜率；样本不足时保留固定基线。未成交的上涨不计交易成功。" />
				<Space>
					<Tag color={data.runtime?.strategy_loop_running ? "green" : "default"}>{data.runtime?.strategy_loop_running ? "自动流程运行中" : "自动流程尚未运行"}</Tag>
					<Text type="secondary">买入窗口 10:05—11:00 / 13:35—14:15；盘后统一复盘、自进化</Text>
				</Space>
				{data.source_status?.status === "unavailable" && <Alert type="warning" showIcon message="当前数据不可用，暂停新买" description={data.source_status.reason} />}
				<Row gutter={[16, 16]}>
					<Col xs={12} lg={6}>
						<Card>
							<Statistic title="市场阶段" value={market?.phase || "待扫描"} />
							<Text type="secondary">
								情绪分
								{market?.score ?? "—"}
								{" "}
								· 上涨占比
								{market?.breadth_pct ?? "—"}
								%
							</Text>
						</Card>
					</Col>
					<Col xs={12} lg={6}>
						<Card>
							<Statistic title="本轮总仓上限" value={market?.position_cap_pct ?? 0} suffix="%" />
							<Text type="secondary">单票≤5% · 同题材≤10% · 不摊低成本</Text>
						</Card>
					</Col>
					<Col xs={12} lg={6}>
						<Card>
							<Statistic title="完整成交轮次" value={metric?.sample_count ?? 0} />
							<Text type="secondary">
								独立入场日期
								{metric?.entry_date_count ?? 0}
								{" "}
								个
							</Text>
						</Card>
					</Col>
					<Col xs={12} lg={6}>
						<Card>
							<Statistic title="已完成模拟交易胜率" value={metric?.win_rate_pct ?? "未校准"} suffix={metric?.win_rate_pct != null ? "%" : undefined} />
							<Text type="secondary">研究目标≥55%，不代表已达到</Text>
						</Card>
					</Col>
				</Row>
				{market?.failures?.length ? <Alert type="warning" message={market.failures.join("；")} /> : null}
				<Text type="secondary">
					推荐时间：
					{data.generated_at || "尚未生成"}
					（北京时间）
				</Text>
				<Tabs items={[
					{ key: "recommendations", label: "推荐与观察", children: (
						<Table<AdaptiveCandidate>
							loading={loading}
							rowKey="code"
							dataSource={data.recommendations}
							pagination={false}
							scroll={{ x: 1000 }}
							locale={{ emptyText: <Empty description="本轮没有合格候选，保留现金并等待下一次扫描" /> }}
							columns={[
								{ title: "股票 / 题材", key: "stock", render: (_, r) => (
									<>
										<Text strong>
											{r.name}
											{" "}
											{r.code}
										</Text>
										<br />
										<Text type="secondary">{r.theme || "待核对"}</Text>
									</>
								) },
								{ title: "决策", key: "decision", render: (_, r) => <Tag color={liveDecision(r) === "模拟买入候选" ? "green" : "default"}>{liveDecision(r)}</Tag> },
								{ title: "质量分", dataIndex: "score" },
								{ title: "入场区间", key: "entry", render: (_, r) => `${money(r.entry_min)}—${money(r.entry_max)}` },
								{ title: "结构止损 / 前高目标", key: "exit", render: (_, r) => `${money(r.stop_loss_price)} / ${money(r.target_price)}` },
								{ title: "未通过的条件", key: "blockers", render: (_, r) => r.blocking_reasons?.join("；") || "全部确认条件通过；成交仍需新鲜盘口复核" },
							]}
							expandable={{ expandedRowRender: r => (
								<Space direction="vertical" style={{ width: "100%" }}>
									<Descriptions
										size="small"
										column={3}
										items={[
											{ key: "emotion", label: "情绪", children: r.score_breakdown?.emotion },
											{ key: "quant", label: "量价结构", children: r.quant_evidence?.reason },
											{ key: "contraction", label: "缩量比", children: r.quant_evidence?.volume_contraction?.toFixed(2) || "—" },
										]}
									/>
									{r.catalyst_evidence?.evidence?.map(n => (
										<Paragraph key={`${n.source}:${n.published_at}:${n.title}`}>
											<Tag>
												{n.tier}
												级
											</Tag>
											{n.url ? <a href={n.url} target="_blank" rel="noreferrer">{n.title}</a> : n.title}
											<br />
											<Text type="secondary">
												{n.source}
												{" "}
												·
												{" "}
												{n.published_at}
												{" "}
												·
												{" "}
												{n.mapping}
											</Text>
										</Paragraph>
									))}
								</Space>
							) }}
						/>
					) },
					{ key: "follow", label: "推荐跟进", children: <StrategyFollowTab strategyType={STRATEGY} isOvernight={false} /> },
					{ key: "history", label: "历史推荐", children: <RecommendationHistory strategyType={STRATEGY} /> },
					{ key: "evolution", label: "复盘与自进化", children: (
						<Card>
							<Descriptions
								column={2}
								items={[
									{ key: "version", label: "参数版本", children: data.evolution?.version ?? 1 },
									{ key: "score", label: "当前最低质量分", children: data.evolution?.active_params?.min_score ?? 82 },
									{ key: "return", label: "完整轮次平均净收益", children: metric?.avg_return_pct != null ? `${metric.avg_return_pct.toFixed(2)}%` : "未校准" },
									{ key: "pf", label: "盈利因子", children: metric?.profit_factor ?? "样本不足或无亏损样本" },
									{ key: "reason", label: "最近分析", span: 2, children: data.evolution?.last_reason || "等待首轮盘后分析" },
								]}
							/>
							<Paragraph>至少60轮完整成交、20个入场日期，新增20轮后才评估调整。按日期留出并剔除跨期持仓，胜率、净收益和尾部风险同时通过后，每次最多提高1分质量门槛。仓位与退出纪律不随胜率自动放大。</Paragraph>
							<Space wrap>
								<Button loading={acting} onClick={() => act(analyzeAdaptiveEvolution)}>重新分析样本</Button>
								<Button loading={acting} onClick={() => act(() => freezeAdaptiveEvolution(data.evolution?.status !== "frozen"))}>{data.evolution?.status === "frozen" ? "恢复自进化" : "冻结参数更新"}</Button>
								<Link to="/short-term-strategy/portfolio">查看模拟账户与成交</Link>
								<Link to="/short-term-strategy/review">查看每日复盘</Link>
							</Space>
						</Card>
					) },
				]}
				/>
			</Space>
		</BasicContent>
	);
}
