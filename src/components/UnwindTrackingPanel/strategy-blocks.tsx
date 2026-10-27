import type { UnwindAnalysisExt, UnwindBacktestResult, UnwindPlanExt } from "#src/api/strategy/unwind-extra";
import { fetchUnwindBacktest, saveUnwindSettings } from "#src/api/strategy/unwind-extra";
import { SafetyOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Col, Empty, Form, Input, InputNumber, message, Modal, Row, Space, Spin, Statistic, Switch, Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

const { Text } = Typography;

const classColors: Record<string, string> = { A: "red", B: "orange", C: "blue", D: "green", E: "gold" };
const verdictColors: Record<string, string> = { HEALTHY: "green", CAUTION: "gold", DETERIORATED: "red", UNKNOWN: "default", REVIEW_REQUIRED: "orange" };
const layerColors: Record<string, string> = { 有利: "green", 中性: "blue", 承压: "red", 数据不足: "default" };

function money(value?: number | null, symbol = "¥") {
	const amount = Number(value || 0);
	return `${symbol}${amount.toFixed(Math.abs(amount) < 1 ? 3 : 2)}`;
}

async function errorText(error: any, fallback: string) {
	if (error?.response) {
		try {
			const body = await error.response.clone().json();
			return body?.detail || body?.message || fallback;
		}
		catch {
			return fallback;
		}
	}
	return error?.message || fallback;
}

/** 诊断分类、三维基本面、复盘线与补仓计划的概览。 */
export function StrategyOverview({ plan, analysis }: { plan: UnwindPlanExt, analysis: UnwindAnalysisExt }) {
	const symbol = analysis.currency_symbol || "¥";
	const { diagnosis, fundamentals, add_plan: addPlan, review, rotation_gate: gate, market_emotion: marketEmotion, automatic_fundamental_review: automaticReview } = analysis;
	const recovery = plan.recovery || analysis.recovery;
	if (!diagnosis && !fundamentals)
		return null;
	return (
		<div style={{ marginTop: 12, border: "1px solid #f0f0f0", borderRadius: 10, padding: "10px 14px" }}>
			{recovery && (recovery.available
				? (
					<>
						<Row gutter={[12, 8]} style={{ marginBottom: 12 }}>
							<Col xs={12} md={8}><Statistic title="累计总损益（含减仓和费用）" value={recovery.total_pnl} precision={2} prefix={symbol} /></Col>
							<Col xs={12} md={8}><Statistic title="累计追加资金" value={recovery.additional_capital} precision={2} prefix={symbol} /></Col>
							<Col xs={24} md={8}>
								<Tag color={recovery.total_recovered ? "green" : "orange"}>{recovery.total_recovered ? "已登记账本整体回本" : "整体尚未回本"}</Tag>
								<div><Text type="secondary">降低持仓均价不会消除已经发生的亏损。</Text></div>
							</Col>
						</Row>
						<Text type="secondary">{recovery.scope}</Text>
					</>
				)
				: <Alert type="warning" showIcon message={recovery.reason || "账本需核对"} />)}
			<Alert type="info" showIcon message="新策略处于验证阶段，以下是复核与研究候选；正式盘中指令仍以执行状态为准。" style={{ marginBottom: 8 }} />
			<Space wrap size={[6, 6]}>
				<SafetyOutlined style={{ color: "#722ed1" }} />
				{diagnosis && (
					<Tag color={classColors[diagnosis.class]}>
						{`类${diagnosis.class} · ${diagnosis.label}`}
					</Tag>
				)}
				{fundamentals && <Tag color={verdictColors[fundamentals.verdict]}>{fundamentals.verdict_label}</Tag>}
				{marketEmotion && <Tag color={marketEmotion.allowed ? "green" : "gold"}>{marketEmotion.label}</Tag>}
				{fundamentals?.layers.map(layer => (
					<Tag key={layer.key} color={layerColors[layer.status]} title={layer.conclusion}>
						{`${layer.label}·${layer.status}`}
					</Tag>
				))}
				{plan.settings?.logic_broken && <Tag color="red">你已标记：买入逻辑被破坏</Tag>}
				{analysis.at_limit_up && <Tag color="red">涨停附近</Tag>}
				{analysis.at_limit_down && <Tag color="green">跌停附近</Tag>}
			</Space>
			{diagnosis && (
				<div style={{ marginTop: 6 }}>
					<Text type="secondary">{diagnosis.why}</Text>
				</div>
			)}
			{fundamentals && (
				<div style={{ marginTop: 2 }}>
					<Text type="secondary">
						{fundamentals.reasons.join("；")}
						{fundamentals.analyzed_at ? `（分析时间 ${fundamentals.analyzed_at}）` : ""}
					</Text>
				</div>
			)}
			{marketEmotion && (
				<div style={{ marginTop: 2 }}>
					<Text type="secondary">{marketEmotion.reason}</Text>
				</div>
			)}
			{review?.triggered && (
				<Alert
					style={{ marginTop: 8 }}
					showIcon
					type={review.pending ? "warning" : "success"}
					message={review.pending ? "系统已自动复核，当前尚未通过" : "系统已自动复核基本面，结果健康"}
					description={[automaticReview?.message, review.reasons.join("；")].filter(Boolean).join(" ")}
				/>
			)}
			{addPlan && (
				<div style={{ marginTop: 8 }}>
					<Space wrap size={[8, 4]}>
						<Text strong>右侧补仓</Text>
						<Tag color={addPlan.status === "READY" ? "red" : "default"}>{addPlan.status_label}</Tag>
						{addPlan.trigger_price != null && addPlan.max_tiers >= addPlan.tier && (
							<Text type="secondary">
								{`第${Math.min(addPlan.tier, addPlan.max_tiers)}/${addPlan.max_tiers}档触发价 ${money(addPlan.trigger_price, symbol)}`}
							</Text>
						)}
						<Text type="secondary">
							{`预算剩余 ${money(addPlan.remaining, "¥")} / ${money(addPlan.budget, "¥")}`}
						</Text>
					</Space>
					{addPlan.status === "READY" && (
						<div style={{ marginTop: 4 }}>
							<Text>
								{`建议买入${addPlan.shares}股，约${money(addPlan.amount, symbol)}；补仓后成本约${money(addPlan.projected_cost, symbol)}，回本所需涨幅 ${addPlan.current_breakeven_rise_pct}% → ${addPlan.breakeven_rise_pct}%`}
							</Text>
						</div>
					)}
				</div>
			)}
			{analysis.capital_capacity && (
				<div>
					<Text type="secondary">
						本轮组合可分配上限
						{money(analysis.capital_capacity.allowed_amount)}
						，约束：
						{analysis.capital_capacity.reason}
					</Text>
				</div>
			)}
			{analysis.trailing_protection?.active && <Alert style={{ marginTop: 8 }} type="info" message={`移动保护：跟踪高点 ${money(analysis.trailing_protection.peak, symbol)}，保护价 ${money(analysis.trailing_protection.price, symbol)}；触发后仍需人工决定成交。`} />}
			{gate && gate.status !== "off" && (
				<div style={{ marginTop: 6 }}>
					<Text type={gate.allowed ? "secondary" : "warning"}>
						{!gate.allowed && <WarningOutlined />}
						{` 反T回测：${gate.reason}`}
					</Text>
				</div>
			)}
		</div>
	);
}

interface SettingsFormValues {
	add_thesis: string
	add_max_price: number
	risk_group: string
	risk_event_note: string
	logic_broken: boolean
	review_line_pct: number
	max_wait_days: number
	add_budget: number
	wait_start_date?: string
}

export function SettingsModal({ plan, onClose, onSaved }: { plan: UnwindPlanExt | null, onClose: () => void, onSaved: () => void }) {
	const [form] = Form.useForm<SettingsFormValues>();
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!plan)
			return;
		form.setFieldsValue({
			add_thesis: plan.settings?.add_thesis || "",
			add_max_price: plan.settings?.add_max_price || 0,
			risk_group: plan.settings?.risk_group || "",
			risk_event_note: plan.settings?.risk_event_note || "",
			logic_broken: plan.settings?.logic_broken ?? false,
			review_line_pct: plan.settings?.review_line_pct ?? -25,
			max_wait_days: plan.settings?.max_wait_days ?? 90,
			add_budget: plan.settings?.add_budget ?? 0,
			wait_start_date: plan.settings?.wait_start_date || "",
		});
	}, [plan, form]);

	const submit = async () => {
		if (!plan)
			return;
		try {
			const values = await form.validateFields();
			setSaving(true);
			await saveUnwindSettings(plan.watchlist_id, {
				add_thesis: values.add_thesis,
				add_max_price: values.add_max_price,
				risk_group: values.risk_group,
				risk_event_note: values.risk_event_note,
				logic_broken: values.logic_broken,
				review_line_pct: values.review_line_pct,
				max_wait_days: values.max_wait_days,
				add_budget: values.add_budget,
				wait_start_date: values.wait_start_date || null,
			});
			message.success("设置已保存，分析已按新设置重算");
			onClose();
			onSaved();
		}
		catch (error: any) {
			if (error?.errorFields)
				return;
			message.error(await errorText(error, "保存设置失败"));
		}
		finally {
			setSaving(false);
		}
	};

	return (
		<Modal
			open={Boolean(plan)}
			title={plan ? `${plan.stock_name} · 解套策略设置` : ""}
			okText="保存并重算"
			cancelText="取消"
			confirmLoading={saving}
			onOk={submit}
			onCancel={onClose}
			destroyOnClose
		>
			{plan && (
				<>
					<Alert
						type="info"
						showIcon
						style={{ marginBottom: 16 }}
						message={`补仓预算已用 ¥${(plan.add_summary?.add_spent ?? 0).toFixed(2)}，剩余 ¥${(plan.add_summary?.add_remaining ?? plan.settings?.add_budget ?? 0).toFixed(2)}`}
						description="复盘线会触发系统自动更新公司基本面评估；评估健康且当天情绪允许时，系统直接重算解套策略。你标记“逻辑已破坏”后，系统会停止补仓和降本。"
					/>
					<Form form={form} layout="vertical">
						<Form.Item name="risk_group" label="同产业链风险分组"><Input maxLength={100} placeholder="例如：光通信。同一产业链使用同一名称" /></Form.Item>
						<Form.Item name="add_thesis" label="新增资金的投资理由"><Input.TextArea maxLength={500} placeholder="为何现在仍值得投入，而不只是摊低原来的成本" /></Form.Item>
						<Form.Item name="add_max_price" label="基于当前判断的最高买入价"><InputNumber min={0} max={1000000} precision={3} style={{ width: "100%" }} /></Form.Item>
						<Form.Item name="risk_event_note" label="新的重大风险事件"><Input.TextArea maxLength={500} placeholder="填写或修改事件后，系统会自动重新评估公司基本面" /></Form.Item>
						<Form.Item name="logic_broken" label="买入逻辑已被破坏" valuePropName="checked">
							<Switch />
						</Form.Item>
						<Row gutter={12}>
							<Col span={12}>
								<Form.Item name="review_line_pct" label="复盘线（距原始成本）" rules={[{ required: true, message: "请输入复盘线" }]}>
									<InputNumber min={-90} max={-1} step={1} precision={0} addonAfter="%" style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item name="max_wait_days" label="最长等待（交易日）" rules={[{ required: true, message: "请输入天数" }]}>
									<InputNumber min={5} max={720} step={5} precision={0} style={{ width: "100%" }} />
								</Form.Item>
							</Col>
						</Row>
						<Row gutter={12}>
							<Col span={12}>
								<Form.Item name="add_budget" label="该股补仓预算" rules={[{ required: true, message: "请输入预算" }]}>
									<InputNumber min={0} step={1000} precision={0} prefix="¥" style={{ width: "100%" }} />
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									name="wait_start_date"
									label="等待起算日"
									rules={[{ pattern: /^$|^\d{4}-\d{2}-\d{2}$/, message: "格式为 YYYY-MM-DD" }]}
								>
									<Input placeholder="留空=从开始跟踪日算起" />
								</Form.Item>
							</Col>
						</Row>
					</Form>
				</>
			)}
		</Modal>
	);
}

export function BacktestModal({ plan, onClose }: { plan: UnwindPlanExt | null, onClose: () => void }) {
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<UnwindBacktestResult | null>(null);
	const [error, setError] = useState("");

	useEffect(() => {
		if (!plan) {
			setResult(null);
			setError("");
			return;
		}
		let cancelled = false;
		setLoading(true);
		setError("");
		fetchUnwindBacktest(plan.watchlist_id)
			.then((response) => {
				if (!cancelled)
					setResult(response.data);
			})
			.catch(async (err) => {
				if (!cancelled)
					setError(await errorText(err, "回测失败"));
			})
			.finally(() => {
				if (!cancelled)
					setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [plan]);

	const summary = result?.summary;
	return (
		<Modal
			open={Boolean(plan)}
			title={plan ? `${plan.stock_name} · 反T历史回测` : ""}
			footer={null}
			onCancel={onClose}
			width={760}
			destroyOnClose
		>
			{loading && <div style={{ textAlign: "center", padding: 40 }}><Spin tip="正在回测约一年的日K..." /></div>}
			{error && <Alert type="error" showIcon message={error} />}
			{!loading && result && (
				<>
					<Alert
						showIcon
						style={{ marginBottom: 12 }}
						type={result.gate.allowed ? "success" : "warning"}
						message={result.gate.allowed ? "反T子策略通过历史初筛，仍不代表完整策略有效" : "反T子策略未通过初筛"}
						description={result.gate.reason}
					/>
					{!summary
						? <Empty description="历史行情不足，无法回测" />
						: (
							<>
								<Alert type="info" showIcon message={summary.scope || "历史回放"} description={`验证起点：${summary.test_start || "未知"}；相对持有增量 ${money(summary.incremental_equity)}；最大回撤 ${summary.max_drawdown_pct ?? "—"}%；期末待买回 ${summary.open_sold_shares ?? 0} 股。`} />
								{summary.comparisons?.map(item => (
									<div key={item.name}>
										<Text>
											{item.name}
											：
											{item.available === false ? item.reason : `期末资产 ${money(item.final_equity)}`}
										</Text>
									</div>
								))}
								<Row gutter={[12, 12]}>
									<Col xs={12} md={6}><Statistic title="回转次数" value={summary.cycles} /></Col>
									<Col xs={12} md={6}><Statistic title="成功率" value={summary.win_rate * 100} precision={0} suffix="%" /></Col>
									<Col xs={12} md={6}><Statistic title="强制买回占比" value={summary.forced_ratio * 100} precision={0} suffix="%" /></Col>
									<Col xs={12} md={6}><Statistic title="平均持有" value={summary.avg_days} precision={1} suffix="天" /></Col>
									<Col xs={12} md={6}><Statistic title="已完成回转净价差" value={summary.total_net} precision={2} valueStyle={{ color: summary.total_net > 0 ? "#cf1322" : "#389e0d" }} /></Col>
									<Col xs={12} md={6}><Statistic title="平均每次" value={summary.avg_net} precision={2} /></Col>
									<Col xs={12} md={6}><Statistic title="最好一次" value={summary.best_net} precision={2} /></Col>
									<Col xs={12} md={6}><Statistic title="最差一次" value={summary.worst_net} precision={2} /></Col>
								</Row>
								<Table
									size="small"
									style={{ marginTop: 16 }}
									rowKey={row => `${row.sell_date}-${row.buy_date}`}
									pagination={false}
									dataSource={[...summary.recent_cycles].reverse()}
									columns={[
										{ title: "卖出日", dataIndex: "sell_date", width: 100 },
										{ title: "买回日", dataIndex: "buy_date", width: 100 },
										{ title: "卖出价", dataIndex: "sell_price", width: 80 },
										{ title: "买回价", dataIndex: "buy_price", width: 80 },
										{ title: "费用", dataIndex: "fees", width: 70 },
										{ title: "净降本", dataIndex: "net", width: 90, render: (value: number) => <Text style={{ color: value >= 0 ? "#cf1322" : "#389e0d" }}>{value.toFixed(2)}</Text> },
										{ title: "备注", dataIndex: "forced", render: (_: boolean, row) => row.unfinished ? <Tag>期末强平</Tag> : row.forced ? <Tag color="orange">超时强买</Tag> : <Tag color="green">限价买回</Tag> },
									]}
								/>
								<div style={{ marginTop: 12 }}>
									{summary.assumptions.map(item => (
										<div key={item}><Text type="secondary">{`· ${item}`}</Text></div>
									))}
								</div>
							</>
						)}
				</>
			)}
		</Modal>
	);
}
