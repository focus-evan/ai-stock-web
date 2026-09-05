import type {
	OptimizationComparison as ComparisonData,
	CreateOptimizationBatch,
	OptimizationAccountPeriod,
	OptimizationAccountWindow,
	OptimizationBatch,
	OptimizationComparisonRow,
	OptimizationCycle,
	OptimizationMetrics,
	OptimizationSide,
} from "#src/api/portfolio/optimization";
import {
	createOptimizationBatch,
	fetchOptimizationBatches,
	fetchOptimizationComparison,
} from "#src/api/portfolio/optimization";
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Modal, Select, Space, Spin, Table, Tabs, Tag, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

const { Text, Paragraph } = Typography;
const qualityLabels: Record<string, string> = {
	invalid_trade_fields: "成交字段不完整或金额不一致",
	return_outlier_requires_review: "收益异常，待复核",
	unmatched_sell: "卖单缺少对应持仓",
	same_day_exit: "存在当日买入卖出记录",
	no_sessions: "暂无完整交易日",
	missing_baseline: "缺少期初基线",
	reconstructed_period: "期间包含历史重建数据",
	snapshot_gap: "期间快照不完整",
	invalid_asset: "资产值无效",
	complete_unverified: "快照完整，账务未验证",
	watch_only: "观察信号，不计交易推荐",
	non_execution_session: "非执行时段信号",
	future_signal: "推荐时间晚于统计截止",
	future_exit: "退出时间晚于统计截止",
	future_record: "记录晚于统计截止",
	cross_generation_outcome: "成熟结果跨优化版本",
	historical_reconstruction: "历史重建",
};

function qualityText(value: string): string {
	return qualityLabels[value] || value;
}

function numberText(value: number | null | undefined, suffix = "", signed = false): string {
	if (value == null || !Number.isFinite(value))
		return "未验证";
	return `${signed && value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
}

function percent(metrics: OptimizationMetrics, field: "win_rate_pct" | "avg_return_pct" = "win_rate_pct"): string {
	return numberText(metrics.sample_count > 0 ? metrics[field] : null, "%");
}

function deltaText(value: number | null, before: OptimizationMetrics, after: OptimizationMetrics): string {
	return numberText(before.sample_count > 0 && after.sample_count > 0 ? value : null, " 个百分点", true);
}

function windowText(side: OptimizationSide): string {
	return side.window.start && side.window.end
		? `${side.window.start} 至 ${side.window.end}（${side.window.session_count}个交易日）`
		: `尚无完整交易日（${side.window.session_count}日）`;
}

function recordText(metrics: OptimizationMetrics, unit = "轮次"): string {
	return `${metrics.win_count}胜 / ${metrics.loss_count}负 / ${metrics.flat_count}平 · ${metrics.sample_count}${unit}`;
}

function confidenceText(metrics: OptimizationMetrics): string {
	return metrics.sample_count > 0 && metrics.win_rate_ci95_pct
		? `${numberText(metrics.win_rate_ci95_pct[0], "%")} ～ ${numberText(metrics.win_rate_ci95_pct[1], "%")}`
		: "未验证";
}

function RatePair({ before, after, delta }: { before: OptimizationMetrics, after: OptimizationMetrics, delta: number | null }) {
	return (
		<Space direction="vertical" size={0}>
			<Text>
				前
				{percent(before)}
				{" "}
				→ 后
				{percent(after)}
			</Text>
			<Text type="secondary">
				差
				{deltaText(delta, before, after)}
			</Text>
		</Space>
	);
}

function exclusionText(values: Record<string, number>): string {
	const entries = Object.entries(values).filter(([, count]) => count > 0);
	return entries.length ? entries.map(([reason, count]) => `${qualityText(reason)}：${count}`).join("；") : "无排除记录";
}

function accountText(value: OptimizationAccountWindow, field: "return_pct" | "max_drawdown_pct"): string {
	return numberText(value.snapshot_count > 0 ? value[field] : null, "%");
}

function TradeDetails({ cycles }: { cycles: OptimizationCycle[] }) {
	return (
		<Table<OptimizationCycle & { key: string }>
			aria-label="完整交易轮次明细"
			size="small"
			dataSource={cycles.map((cycle, index) => ({ ...cycle, key: `${cycle.portfolio_id}-${cycle.stock_code}-${cycle.entry_at}-${index}` }))}
			scroll={{ x: 1700 }}
			pagination={{ pageSize: 10, showSizeChanger: true }}
			locale={{ emptyText: "本组暂无交易轮次，不能据此计算胜率" }}
			columns={[
				{ title: "入场版本归属", render: (_, row) => row.cohort === "before" ? "优化前版本" : row.cohort === "after" ? "优化后版本" : "未标记" },
				{ title: "组合 / 股票", width: 170, render: (_, row) => (
					<Space direction="vertical" size={0}>
						<Text>
							组合 #
							{row.portfolio_id}
						</Text>
						<Text>
							{row.stock_name}
							{" "}
							{row.stock_code}
						</Text>
					</Space>
				) },
				{ title: "入场 / 退出（北京）", width: 210, render: (_, row) => (
					<Space direction="vertical" size={0}>
						<Text>{row.entry_at}</Text>
						<Text>{row.exit_at || "尚未退出"}</Text>
					</Space>
				) },
				{ title: "状态", render: (_, row) => <Tag>{row.status === "closed" ? "已平仓" : "未平仓 · 不计胜率"}</Tag> },
				{ title: "买单 / 卖单", render: (_, row) => `${row.buy_count} / ${row.sell_count}` },
				{ title: "毛盈亏（元）", render: (_, row) => numberText(row.gross_profit) },
				{ title: "同成本盈亏（元）", render: (_, row) => numberText(row.normalized_profit) },
				{ title: "记录净盈亏（元）", render: (_, row) => numberText(row.net_profit) },
				{ title: "轮次毛收益率", render: (_, row) => numberText(row.return_pct, "%") },
				{ title: "证据状态", render: (_, row) => <Tag color={row.verified ? "green" : "orange"}>{row.verified ? "已核验" : "未验证"}</Tag> },
				{ title: "数据质量 / 排除原因", width: 260, render: (_, row) => row.issues.length ? row.issues.map(qualityText).join("；") : "未发现已列明异常" },
			]}
		/>
	);
}

function ComparisonDetails({ row }: { row: OptimizationComparisonRow }) {
	const metrics = [
		{ key: "recorded", label: "账面交易", before: row.before.trades.recorded, after: row.after.trades.recorded, delta: row.deltas.recorded_win_rate_pp },
		{ key: "normalized", label: "同成本交易", before: row.before.trades.normalized, after: row.after.trades.normalized, delta: row.deltas.normalized_win_rate_pp },
		{ key: "verified", label: "已核验交易", before: row.before.trades.verified, after: row.after.trades.verified, delta: row.deltas.verified_win_rate_pp },
		{ key: "signals", label: "成熟推荐信号（条）", before: row.before.signals.metrics, after: row.after.signals.metrics, delta: row.deltas.signal_win_rate_pp },
	];
	return (
		<Space direction="vertical" size={16} style={{ width: "100%" }}>
			<Alert
				type={row.comparison_status === "collecting" ? "warning" : "info"}
				showIcon
				message={row.comparison_status === "collecting" ? "样本仍在积累，暂不判断优化效果" : "仅作前后描述性对照"}
				description={(
					<>
						<div>
							优化前入场窗口：
							{windowText(row.before)}
							；优化后入场窗口：
							{windowText(row.after)}
							。
						</div>
						{[...new Set(row.notices)].map(notice => <div key={notice}>{notice}</div>)}
					</>
				)}
			/>
			<Table
				aria-label={`${row.strategy_name}前后口径对照`}
				size="small"
				pagination={false}
				dataSource={metrics}
				scroll={{ x: 1500 }}
				columns={[
					{ title: "统计口径", dataIndex: "label", width: 160 },
					{ title: "优化前 · 胜 / 负 / 平 / 样本", render: (_, item) => recordText(item.before, item.key === "signals" ? "条" : "轮次") },
					{ title: "优化后 · 胜 / 负 / 平 / 样本", render: (_, item) => recordText(item.after, item.key === "signals" ? "条" : "轮次") },
					{ title: "胜率 · 前 → 后 / 差值", render: (_, item) => <RatePair before={item.before} after={item.after} delta={item.delta} /> },
					{ title: "平均收益 · 前 → 后", render: (_, item) => `${percent(item.before, "avg_return_pct")} → ${percent(item.after, "avg_return_pct")}` },
					{ title: "盈亏金额（元）· 前 → 后", render: (_, item) => `${numberText(item.before.sample_count ? item.before.total_profit : null)} → ${numberText(item.after.sample_count ? item.after.total_profit : null)}` },
					{ title: "盈利因子 · 前 → 后", render: (_, item) => `${numberText(item.before.sample_count ? item.before.profit_factor : null)} → ${numberText(item.after.sample_count ? item.after.profit_factor : null)}` },
					{ title: "胜率95%区间", width: 210, render: (_, item) => (
						<Space direction="vertical" size={0}>
							<Text>
								前
								{confidenceText(item.before)}
							</Text>
							<Text>
								后
								{confidenceText(item.after)}
							</Text>
						</Space>
					) },
				]}
			/>
			<Descriptions title="样本与数据质量" bordered size="small" column={1}>
				{(["before", "after"] as const).map(side => (
					<Descriptions.Item key={side} label={side === "before" ? "优化前" : "优化后"}>
						完整平仓
						{" "}
						{row[side].trades.closed_cycles}
						{" "}
						轮 · 排除
						{row[side].trades.excluded_cycles}
						{" "}
						轮 · 过渡
						{row[side].trades.transition_cycles}
						{" "}
						轮 · 未平仓
						{row[side].trades.open_cycles}
						{" "}
						轮
						<br />
						推荐共
						{" "}
						{row[side].signals.total_count}
						{" "}
						条 · 成熟
						{row[side].signals.mature_count}
						{" "}
						条 · 前向留存
						{row[side].signals.forward_count}
						{" "}
						条
						<br />
						推荐排除：
						{exclusionText(row[side].signals.excluded_reasons)}
					</Descriptions.Item>
				))}
				<Descriptions.Item label="推荐信号差值">
					胜率：
					{deltaText(row.deltas.signal_win_rate_pp, row.before.signals.metrics, row.after.signals.metrics)}
					；平均收益：
					{deltaText(row.deltas.signal_avg_return_pp, row.before.signals.metrics, row.after.signals.metrics)}
				</Descriptions.Item>
			</Descriptions>
			<Paragraph type="secondary">每组最多展示100个交易轮次，汇总统计使用全部有效样本，不随明细展示数量截断。</Paragraph>
			<Tabs items={[
				{ key: "before", label: `优化前交易（${row.trade_details.before.length}）`, children: <TradeDetails cycles={row.trade_details.before} /> },
				{ key: "after", label: `优化后交易（${row.trade_details.after.length}）`, children: <TradeDetails cycles={row.trade_details.after} /> },
				{ key: "transition", label: `跨版本 / 过渡（${row.trade_details.transition.length}）`, children: (
					<Space direction="vertical" style={{ width: "100%" }}>
						<Alert type="info" showIcon message="跨版本持仓与优化当天的过渡交易单列" description="按入场版本保留归属，但不混入纯优化前后胜率；未平仓轮次不计胜率。" />
						<TradeDetails cycles={row.trade_details.transition} />
					</Space>
				) },
				{ key: "accounts", label: "账户期间表现", children: (
					<Space direction="vertical" style={{ width: "100%" }}>
						<Paragraph type="secondary">账户收益仅按表列完整交易日的资产快照计算；交易战绩按入场窗口分组，可能包含窗口之后的退出，两者使用不同期间和分母。样本不足时显示未验证；历史归档账户继续保留。</Paragraph>
						<Table<OptimizationAccountPeriod>
							rowKey="portfolio_id"
							dataSource={row.account_periods}
							size="small"
							scroll={{ x: 1000 }}
							pagination={{ pageSize: 10 }}
							columns={[
								{ title: "组合", render: (_, item) => (
									<>
										{item.name}
										{" "}
										<Tag>{item.status === "active" ? "现行" : "归档"}</Tag>
									</>
								) },
								{ title: "期间收益 · 前 → 后", render: (_, item) => `${accountText(item.before, "return_pct")} → ${accountText(item.after, "return_pct")}` },
								{ title: "最大回撤 · 前 → 后", render: (_, item) => `${accountText(item.before, "max_drawdown_pct")} → ${accountText(item.after, "max_drawdown_pct")}` },
								{ title: "快照数 · 前 / 后", render: (_, item) => `${item.before.snapshot_count} / ${item.after.snapshot_count}` },
								{ title: "质量状态 · 前 / 后", render: (_, item) => `${qualityText(item.before.status)} / ${qualityText(item.after.status)}` },
							]}
						/>
					</Space>
				) },
			]}
			/>
		</Space>
	);
}

async function registrationError(error: unknown): Promise<string> {
	const response = (error as { response?: Response })?.response;
	if (response?.status === 409)
		return "该批次标识已存在且内容不同，请核对原批次；历史记录不能覆盖。";
	if (response?.status === 401 || response?.status === 403)
		return "当前账号无权登记，请登录有权限的账号后重试。";
	return error instanceof Error && !(error as { response?: Response }).response
		? error.message
		: "批次登记未成功，请核对输入后重试；已填写内容会保留。";
}

export default function OptimizationComparison() {
	const [batches, setBatches] = useState<OptimizationBatch[]>([]);
	const [options, setOptions] = useState<{ value: string, label: string }[]>([]);
	const [batchId, setBatchId] = useState<number>();
	const [windowDays, setWindowDays] = useState(20);
	const [strategyType, setStrategyType] = useState<string>();
	const [schemaReady, setSchemaReady] = useState(true);
	const [listLoading, setListLoading] = useState(true);
	const [loading, setLoading] = useState(false);
	const [listError, setListError] = useState("");
	const [comparisonError, setComparisonError] = useState("");
	const [data, setData] = useState<ComparisonData>();
	const [reload, setReload] = useState(0);
	const [modalOpen, setModalOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [saveNotice, setSaveNotice] = useState("");
	const [form] = Form.useForm<CreateOptimizationBatch>();
	const listSequence = useRef(0);
	const loadBatches = useCallback(async (signal?: AbortSignal, preferredId?: number) => {
		const sequence = ++listSequence.current;
		setListLoading(true);
		try {
			const response = await fetchOptimizationBatches(signal);
			if (signal?.aborted || sequence !== listSequence.current)
				return;
			if (response.status !== "success")
				throw new Error(response.message || "批次列表暂不可用");
			setBatches(response.data.batches);
			setOptions(response.data.strategy_options);
			setSchemaReady(response.data.schema_ready);
			setBatchId((current) => {
				const target = preferredId ?? current;
				return response.data.batches.some(batch => batch.id === target) ? target : response.data.batches[0]?.id;
			});
			setListError("");
		}
		catch {
			if (!signal?.aborted && sequence === listSequence.current)
				setListError("优化批次加载失败，请刷新重试。");
		}
		finally {
			if (!signal?.aborted && sequence === listSequence.current)
				setListLoading(false);
		}
	}, []);
	useEffect(() => {
		const controller = new AbortController();
		void loadBatches(controller.signal);
		return () => controller.abort();
	}, [loadBatches]);
	const loadComparison = useCallback(async (signal: AbortSignal) => {
		setData(undefined);
		setComparisonError("");
		if (batchId == null) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const response = await fetchOptimizationComparison(batchId, windowDays, strategyType, signal);
			if (signal.aborted)
				return;
			if (response.status !== "success")
				throw new Error(response.message || "对比数据暂不可用");
			setData(response.data);
		}
		catch {
			if (!signal.aborted)
				setComparisonError("前后对比加载失败，请刷新重试；当前不展示上一次筛选的结果。");
		}
		finally {
			if (!signal.aborted)
				setLoading(false);
		}
	}, [batchId, windowDays, strategyType]);
	useEffect(() => {
		const controller = new AbortController();
		void loadComparison(controller.signal);
		return () => controller.abort();
	}, [loadComparison, reload]);
	const saveBatch = async (values: CreateOptimizationBatch) => {
		setSaving(true);
		setSaveError("");
		try {
			const payload = Object.fromEntries(Object.entries(values).filter(([, value]) => value != null && value !== "")) as CreateOptimizationBatch;
			const response = await createOptimizationBatch(payload);
			if (response.status !== "success")
				throw new Error(response.message || "批次登记失败");
			setModalOpen(false);
			form.resetFields();
			setSaveNotice(response.data.created ? "重大优化批次已登记，后续按此批次持续积累前向样本。" : "该批次已登记，已打开原有记录。");
			setStrategyType(undefined);
			setBatches(current => [response.data.batch, ...current.filter(batch => batch.id !== response.data.batch.id)]);
			setBatchId(response.data.batch.id);
			await loadBatches(undefined, response.data.batch.id);
			setReload(value => value + 1);
		}
		catch (error) {
			setSaveError(await registrationError(error));
		}
		finally {
			setSaving(false);
		}
	};
	const openRegistration = () => {
		setSaveError("");
		setModalOpen(true);
	};
	const refreshComparison = () => {
		void loadBatches();
		setReload(value => value + 1);
	};
	const currentBatch = data?.batch || batches.find(batch => batch.id === batchId);
	return (
		<Card title="重大优化前后对比" extra={<Button onClick={openRegistration}>登记重大优化</Button>}>
			<Space direction="vertical" size={16} style={{ width: "100%" }}>
				<Alert type="info" showIcon message="前后表现不等于优化造成的提升" description="按完整交易日的入场窗口尽量等长对照，退出跟踪至统计截止或下一次重大优化，以先到者为准。区分账面、同成本与已核验证据；行情和样本结构可能同时变化。日常参数进化与重大优化批次分别记录。" />
				{saveNotice && <Alert type="success" message={saveNotice} closable onClose={() => setSaveNotice("")} />}
				{listError && <Alert type="error" showIcon message={listError} />}
				{!schemaReady && <Alert type="info" showIcon message="尚未建立重大优化批次记录，请先登记需要跟踪的优化。" />}
				<Space wrap>
					<Select aria-label="优化批次" placeholder="选择优化批次" style={{ minWidth: 260 }} loading={listLoading} value={batchId} onChange={setBatchId} options={batches.map(batch => ({ value: batch.id, label: `${batch.name} · ${batch.effective_at}` }))} />
					<Select aria-label="对比交易日窗口" style={{ width: 160 }} value={windowDays} onChange={setWindowDays} options={[20, 40, 60].map(value => ({ value, label: `${value}个交易日窗口` }))} />
					<Select aria-label="筛选战法" allowClear placeholder="全部战法" style={{ minWidth: 200 }} value={strategyType} onChange={setStrategyType} options={options} />
					<Button loading={listLoading || loading} onClick={refreshComparison}>刷新对比</Button>
				</Space>
				{currentBatch && (
					<Descriptions size="small" bordered column={{ xs: 1, sm: 2, lg: 3 }}>
						<Descriptions.Item label="优化批次">{currentBatch.name}</Descriptions.Item>
						<Descriptions.Item label="生效时间（北京时间）">{currentBatch.effective_at}</Descriptions.Item>
						<Descriptions.Item label="冻结成本口径">{numberText(currentBatch.rule_snapshot.cost_pct, "%")}</Descriptions.Item>
						<Descriptions.Item label="批次标识"><Text copyable>{currentBatch.release_key}</Text></Descriptions.Item>
						<Descriptions.Item label="后端版本"><Text copyable={!!currentBatch.backend_revision}>{currentBatch.backend_revision || "未登记"}</Text></Descriptions.Item>
						<Descriptions.Item label="前端版本"><Text copyable={!!currentBatch.frontend_revision}>{currentBatch.frontend_revision || "未登记"}</Text></Descriptions.Item>
						<Descriptions.Item label="优化内容" span={3}>{currentBatch.description || "未填写"}</Descriptions.Item>
					</Descriptions>
				)}
				{comparisonError && <Alert type="error" showIcon message={comparisonError} />}
				<Spin spinning={loading || listLoading}>
					{data
						? (
							<Space direction="vertical" style={{ width: "100%" }}>
								<Text type="secondary">
									数据 / 退出跟踪截至
									{data.as_of}
									（北京时间）· 目标入场窗口
									{data.window_days}
									{" "}
									个交易日。展开战法可查看胜负平、置信区间、推荐、账户和逐轮交易。
								</Text>
								<Table<OptimizationComparisonRow>
									aria-label="战法优化前后总览"
									rowKey="strategy_type"
									dataSource={data.rows}
									size="small"
									scroll={{ x: 1500 }}
									pagination={{ pageSize: 14, showSizeChanger: true }}
									expandable={{ expandedRowRender: row => <ComparisonDetails row={row} /> }}
									locale={{ emptyText: "当前筛选暂无战法数据" }}
									columns={[
										{ title: "战法 / 样本状态", width: 200, render: (_, row) => (
											<Space direction="vertical" size={4}>
												<Text strong>{row.strategy_name}</Text>
												<Tag color={row.comparison_status === "collecting" ? "orange" : "blue"}>{row.comparison_status === "collecting" ? "样本积累中" : "描述性对照"}</Tag>
											</Space>
										) },
										{ title: "入场窗口交易日 · 前 / 后", render: (_, row) => `${row.before.window.session_count} / ${row.after.window.session_count}` },
										{ title: "同成本轮次 · 前 / 后", render: (_, row) => `${row.before.trades.normalized.sample_count} / ${row.after.trades.normalized.sample_count}` },
										{ title: "账面胜率", render: (_, row) => <RatePair before={row.before.trades.recorded} after={row.after.trades.recorded} delta={row.deltas.recorded_win_rate_pp} /> },
										{ title: "同成本胜率", render: (_, row) => <RatePair before={row.before.trades.normalized} after={row.after.trades.normalized} delta={row.deltas.normalized_win_rate_pp} /> },
										{ title: "已核验胜率", render: (_, row) => <RatePair before={row.before.trades.verified} after={row.after.trades.verified} delta={row.deltas.verified_win_rate_pp} /> },
										{ title: "同成本平均收益", render: (_, row) => (
											<Space direction="vertical" size={0}>
												<Text>
													前
													{percent(row.before.trades.normalized, "avg_return_pct")}
													{" "}
													→ 后
													{percent(row.after.trades.normalized, "avg_return_pct")}
												</Text>
												<Text type="secondary">
													差
													{deltaText(row.deltas.normalized_avg_return_pp, row.before.trades.normalized, row.after.trades.normalized)}
												</Text>
											</Space>
										) },
									]}
								/>
								{data.methodology.length > 0 && <Alert type="info" message="统计方法" description={[...new Set(data.methodology)].map(text => <div key={text}>{text}</div>)} />}
							</Space>
						)
						: !loading && !listLoading && !listError && !comparisonError && <Empty description="暂无重大优化批次。登记后可按同一批次查看持续积累的前后表现。" />}
				</Spin>
			</Space>
			<Modal
				title="登记重大优化批次"
				open={modalOpen}
				onCancel={() => {
					if (!saving)
						setModalOpen(false);
				}}
				onOk={() => form.submit()}
				confirmLoading={saving}
				okText="登记并开始跟踪"
				cancelText="取消"
				cancelButtonProps={{ disabled: saving }}
				closable={!saving}
				maskClosable={!saving}
				width={680}
			>
				<Alert style={{ marginBottom: 16 }} type="info" showIcon message="登记记录只追加，不能覆盖历史批次" description="请以实际生效时间作为分界。时间留空使用登记时刻；同成本口径固定为0.25%。日常参数更新无需逐次登记为重大优化。" />
				{saveError && <Alert style={{ marginBottom: 16 }} type="error" showIcon message={saveError} />}
				<Form form={form} layout="vertical" onFinish={saveBatch} disabled={saving}>
					<Form.Item name="name" label="批次名称" rules={[{ required: true, whitespace: true, message: "请填写批次名称" }]}><Input placeholder="例如：交易证据与胜率口径优化" maxLength={120} /></Form.Item>
					<Form.Item name="release_key" label="唯一批次标识" rules={[{ required: true, whitespace: true, message: "请填写唯一批次标识" }]} extra="重复提交相同内容会返回原记录；同标识内容冲突时不会覆盖。"><Input placeholder="例如：strategy-quality-20260905" maxLength={120} /></Form.Item>
					<Form.Item name="effective_at" label="实际生效时间（北京时间，可留空）"><Input type="datetime-local" step={1} /></Form.Item>
					<Form.Item name="strategies" label="涉及战法（留空表示全部）"><Select mode="multiple" allowClear options={options} placeholder="选择此次优化涉及的战法" /></Form.Item>
					<Form.Item name="description" label="优化内容与待验证假设"><Input.TextArea rows={3} maxLength={4000} showCount placeholder="记录具体改变和需要检验的效果，后续结果不改写原始假设。" /></Form.Item>
					<Form.Item name="backend_revision" label="后端发布版本（可选）"><Input placeholder="已实际部署的提交SHA" maxLength={120} /></Form.Item>
					<Form.Item name="frontend_revision" label="前端发布版本（可选）"><Input placeholder="已实际部署的提交SHA" maxLength={120} /></Form.Item>
				</Form>
			</Modal>
		</Card>
	);
}
