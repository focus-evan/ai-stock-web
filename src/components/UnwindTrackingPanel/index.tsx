import type {
	RecordUnwindTradePayload,
	UnwindAnalysis,
	UnwindMethod,
	UnwindPlan,
} from "#src/api/strategy";
import {
	fetchUnwindPlans,
	recordUnwindTrade,
	refreshUnwindPlans,
} from "#src/api/strategy";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	ClockCircleOutlined,
	ReloadOutlined,
	SafetyOutlined,
	SwapOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Collapse,
	Empty,
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";

const { Text } = Typography;

interface TradeFormValues {
	shares: number
	price: number
	fees: number
	trade_date: string
	note?: string
}

const decisionColors: Record<string, string> = {
	SELL_SLICE: "orange",
	BUY_BACK: "red",
	WAIT_BUYBACK: "blue",
	HOLD_TREND: "green",
	WAIT_SUPPORT: "cyan",
	WAIT_REBOUND: "gold",
	TARGET_REACHED: "purple",
	HOLD_TOO_SMALL: "default",
};

function money(value?: number | null) {
	return `¥${Number(value || 0).toFixed(2)}`;
}

function signed(value?: number | null) {
	const number = Number(value || 0);
	return `${number > 0 ? "+" : ""}${number.toFixed(2)}`;
}

async function getErrorMessage(error: any, fallback: string) {
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

function AnalysisDetails({ analysis }: { analysis: UnwindAnalysis }) {
	const technical = analysis.technical;
	return (
		<Row gutter={[8, 8]}>
			<Col xs={24} md={12}>
				<div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 12px", height: "100%" }}>
					<Text strong>技术结构</Text>
					<div style={{ marginTop: 6 }}><Text type="secondary">{analysis.deep_analysis.trend}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.location}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.momentum}</Text></div>
				</div>
			</Col>
			<Col xs={24} md={12}>
				<div style={{ background: "#fafafa", borderRadius: 8, padding: "10px 12px", height: "100%" }}>
					<Text strong>量价与仓位</Text>
					<div style={{ marginTop: 6 }}><Text type="secondary">{analysis.deep_analysis.volume}</Text></div>
					<div><Text type="secondary">{analysis.deep_analysis.position}</Text></div>
					<div>
						<Text type="secondary">
							数据截止：
							{technical.as_of}
						</Text>
					</div>
				</div>
			</Col>
		</Row>
	);
}

export default function UnwindTrackingPanel() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState<number | "all" | null>(null);
	const [plans, setPlans] = useState<UnwindPlan[]>([]);
	const [method, setMethod] = useState<UnwindMethod | null>(null);
	const [tradeTarget, setTradeTarget] = useState<{ plan: UnwindPlan, side: "sell" | "buy" } | null>(null);
	const [savingTrade, setSavingTrade] = useState(false);
	const [form] = Form.useForm<TradeFormValues>();
	const autoRefreshAttempted = useRef(false);

	const loadData = useCallback(async (allowInitialRefresh = true) => {
		setLoading(true);
		try {
			const response = await fetchUnwindPlans(10);
			const items = response.data?.items || [];
			setPlans(items);
			setMethod(response.data?.method || null);
			const needsInitialAnalysis = items.length > 0 && items.every(item => !item.latest_analysis);
			if (allowInitialRefresh && needsInitialAnalysis && !autoRefreshAttempted.current) {
				autoRefreshAttempted.current = true;
				const refreshed = await refreshUnwindPlans();
				if (refreshed.data.total > 0)
					await loadData(false);
			}
		}
		catch (error: any) {
			message.error(await getErrorMessage(error, "加载解套跟踪失败"));
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleRefresh = async (watchlistId?: number) => {
		setRefreshing(watchlistId || "all");
		try {
			const response = await refreshUnwindPlans(watchlistId);
			if (response.data.errors?.length)
				message.warning(`已更新${response.data.total}只，${response.data.errors.length}只行情暂不可用`);
			else
				message.success(response.message || "今日分析已更新");
			await loadData(false);
		}
		catch (error: any) {
			message.error(await getErrorMessage(error, "刷新失败"));
		}
		finally {
			setRefreshing(null);
		}
	};

	const openTrade = (plan: UnwindPlan, side: "sell" | "buy") => {
		const analysis = plan.latest_analysis;
		form.setFieldsValue({
			shares: side === "sell" ? (analysis?.sell_shares || 100) : plan.open_sold_shares,
			price: side === "sell"
				? (analysis?.sell_zone_low || analysis?.technical?.current_price || 0)
				: (analysis?.buyback_price || analysis?.technical?.current_price || 0),
			fees: 0,
			trade_date: dayjs().format("YYYY-MM-DD"),
			note: "",
		});
		setTradeTarget({ plan, side });
	};

	const handleTradeSubmit = async () => {
		if (!tradeTarget)
			return;
		try {
			const values = await form.validateFields();
			setSavingTrade(true);
			const payload: RecordUnwindTradePayload = {
				side: tradeTarget.side,
				shares: values.shares,
				price: values.price,
				fees: values.fees || 0,
				trade_date: values.trade_date,
				note: values.note,
			};
			const response = await recordUnwindTrade(tradeTarget.plan.watchlist_id, payload);
			message.success(response.message || "成交已记录");
			setTradeTarget(null);
			form.resetFields();
			await loadData(false);
		}
		catch (error: any) {
			if (error?.errorFields)
				return;
			message.error(await getErrorMessage(error, "记录成交失败"));
		}
		finally {
			setSavingTrade(false);
		}
	};

	const cumulativeReduction = plans.reduce((sum, item) => sum + Number(item.cumulative_cost_reduction || 0), 0);
	const cashPool = plans.reduce((sum, item) => sum + Number(item.cash_pool || 0), 0);
	const losingCount = plans.filter(item => (item.latest_analysis?.pnl_pct ?? 0) < 0).length;

	if (loading && !plans.length) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
					<Spin tip="正在同步持仓并生成滚动降本计划..." />
				</div>
			</Card>
		);
	}

	return (
		<div style={{ marginTop: 20 }}>
			<Alert
				showIcon
				type="warning"
				icon={<SafetyOutlined />}
				message={method?.name || "底仓保护反T（先卖后买）"}
				description={(
					<div>
						<div>{method?.capital_rule || "先卖已有可用仓位，再用卖出资金低价买回，不追加资金。"}</div>
						<Text type="secondary">
							{method?.position_rule}
							；
							{method?.trend_rule}
						</Text>
						<div style={{ marginTop: 4 }}><Text type="danger">{method?.risk_notice}</Text></div>
					</div>
				)}
				action={(
					<Button
						icon={<ReloadOutlined />}
						loading={refreshing === "all"}
						onClick={() => handleRefresh()}
					>
						刷新全部
					</Button>
				)}
				style={{ borderRadius: 10, marginBottom: 16 }}
			/>

			<Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
				<Col xs={12} md={6}><Card size="small"><Statistic title="自动跟踪持仓" value={plans.length} suffix="只" /></Card></Col>
				<Col xs={12} md={6}><Card size="small"><Statistic title="仍低于有效成本" value={losingCount} suffix="只" valueStyle={{ color: "#389e0d" }} /></Card></Col>
				<Col xs={12} md={6}><Card size="small"><Statistic title="已实现降本" value={cumulativeReduction} precision={2} prefix="¥" valueStyle={{ color: cumulativeReduction >= 0 ? "#cf1322" : "#389e0d" }} /></Card></Col>
				<Col xs={12} md={6}><Card size="small"><Statistic title="滚动资金池" value={cashPool} precision={2} prefix="¥" /></Card></Col>
			</Row>

			{!plans.length
				? (
					<Card bordered={false} style={{ borderRadius: 12 }}>
						<Empty
							description="暂无持仓。请先在“自选盯盘”加入股票并填写成本价、股数，本页会自动同步。"
						/>
					</Card>
				)
				: (
					<Space direction="vertical" size={16} style={{ width: "100%" }}>
						{plans.map((plan) => {
							const analysis = plan.latest_analysis;
							const pnl = analysis?.pnl_pct ?? 0;
							const pnlColor = pnl >= 0 ? "#cf1322" : "#389e0d";
							return (
								<Card
									key={plan.watchlist_id}
									bordered={false}
									style={{ borderRadius: 12, overflow: "hidden" }}
									styles={{ body: { padding: 18 } }}
									title={(
										<Space wrap>
											<SwapOutlined style={{ color: "#722ed1" }} />
											<Text strong style={{ fontSize: 16 }}>{plan.stock_name}</Text>
											<Text type="secondary">{plan.stock_code}</Text>
											{analysis && <Tag color={decisionColors[analysis.decision] || "blue"}>{analysis.decision_label}</Tag>}
											{plan.open_sold_shares > 0 && (
												<Tag color="geekblue">
													已卖待回
													{plan.open_sold_shares}
													股
												</Tag>
											)}
										</Space>
									)}
									extra={(
										<Button
											size="small"
											icon={<ReloadOutlined />}
											loading={refreshing === plan.watchlist_id}
											onClick={() => handleRefresh(plan.watchlist_id)}
										>
											更新
										</Button>
									)}
								>
									<Row gutter={[12, 12]}>
										<Col xs={12} sm={8} md={4}><Statistic title="原始成本" value={plan.baseline_cost_price} precision={2} prefix="¥" /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="有效成本" value={plan.effective_cost} precision={2} prefix="¥" valueStyle={{ color: "#722ed1" }} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="最新价" value={analysis?.technical.current_price || 0} precision={2} prefix="¥" /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="距有效成本" value={pnl} precision={2} suffix="%" valueStyle={{ color: pnlColor }} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="当前/原始股数" value={`${plan.current_shares}/${plan.baseline_shares}`} /></Col>
										<Col xs={12} sm={8} md={4}><Statistic title="滚动资金" value={plan.cash_pool} precision={2} prefix="¥" /></Col>
									</Row>

									{analysis
										? (
											<>
												<div style={{
													marginTop: 14,
													padding: "12px 14px",
													borderRadius: 9,
													background: analysis.decision === "BUY_BACK" ? "#fff1f0" : analysis.decision === "SELL_SLICE" ? "#fff7e6" : "#f5f5f5",
												}}
												>
													<Row gutter={[16, 10]} align="middle">
														<Col xs={24} md={15}>
															<Space direction="vertical" size={3}>
																<Space>
																	{analysis.decision === "BUY_BACK"
																		? <ArrowUpOutlined style={{ color: "#cf1322" }} />
																		: <ArrowDownOutlined style={{ color: "#d46b08" }} />}
																	<Text strong>{analysis.decision_label}</Text>
																</Space>
																<Text>{analysis.reason}</Text>
																<Text type="danger">
																	<WarningOutlined />
																	{" "}
																	{analysis.invalid_condition}
																</Text>
															</Space>
														</Col>
														<Col xs={24} md={9}>
															<Space wrap>
																{analysis.sell_zone_low != null && (
																	<Tag color="orange">
																		候选卖区
																		{" "}
																		{money(analysis.sell_zone_low)}
																		-
																		{money(analysis.sell_zone_high)}
																	</Tag>
																)}
																{analysis.sell_shares > 0 && (
																	<Tag>
																		建议滚动
																		{" "}
																		{analysis.sell_shares}
																		股
																	</Tag>
																)}
																{analysis.buyback_price != null && (
																	<Tag color="red">
																		买回不高于
																		{" "}
																		{money(analysis.buyback_price)}
																	</Tag>
																)}
																<Tag>
																	最小价差
																	{" "}
																	{analysis.min_spread_pct}
																	%
																</Tag>
															</Space>
														</Col>
													</Row>
												</div>

												<div style={{ marginTop: 12 }}><AnalysisDetails analysis={analysis} /></div>

												<Space wrap style={{ marginTop: 14 }}>
													<Button
														icon={<ArrowDownOutlined />}
														disabled={plan.open_sold_shares > 0 || analysis.sell_shares < 100}
														onClick={() => openTrade(plan, "sell")}
													>
														记录已卖出
													</Button>
													<Button
														type="primary"
														danger
														icon={<ArrowUpOutlined />}
														disabled={plan.open_sold_shares < 100}
														onClick={() => openTrade(plan, "buy")}
													>
														记录已买回
													</Button>
													<Text type="secondary">
														<ClockCircleOutlined />
														{" "}
														{analysis.next_check}
													</Text>
												</Space>
											</>
										)
										: (
											<Alert
												type="info"
												showIcon
												message="暂无日线分析"
												description="点击“更新”拉取至少16个交易日行情并生成首份计划。"
												style={{ marginTop: 12 }}
											/>
										)}

									{(plan.analysis_history.length > 0 || plan.trades.length > 0) && (
										<Collapse
											ghost
											style={{ marginTop: 10 }}
											items={[
												{
													key: "history",
													label: `每日跟踪记录（${plan.analysis_history.length}）`,
													children: (
														<Table
															size="small"
															rowKey="id"
															pagination={false}
															dataSource={plan.analysis_history.slice(0, 10)}
															columns={[
																{ title: "日期", dataIndex: "trading_date", width: 110 },
																{ title: "收盘价", dataIndex: "current_price", width: 100, render: value => money(value) },
																{ title: "距有效成本", dataIndex: "pnl_pct", width: 120, render: value => `${signed(value)}%` },
																{ title: "判断", dataIndex: "decision", render: (_, row) => <Tag color={decisionColors[row.decision] || "blue"}>{row.analysis_data?.decision_label || row.decision}</Tag> },
															]}
														/>
													),
												},
												{
													key: "trades",
													label: `实际成交记录（${plan.trades.length}）`,
													children: plan.trades.length
														? (
															<Table
																size="small"
																rowKey="id"
																pagination={false}
																dataSource={plan.trades}
																columns={[
																	{ title: "日期", dataIndex: "trade_date", width: 110 },
																	{ title: "方向", dataIndex: "side", width: 90, render: value => <Tag color={value === "sell" ? "green" : "red"}>{value === "sell" ? "卖出" : "买回"}</Tag> },
																	{ title: "股数", dataIndex: "shares", width: 90 },
																	{ title: "价格", dataIndex: "price", width: 100, render: value => money(value) },
																	{ title: "费用", dataIndex: "fees", width: 90, render: value => money(value) },
																	{ title: "本次降本", dataIndex: "cost_reduction", render: value => <Text style={{ color: Number(value) >= 0 ? "#cf1322" : "#389e0d" }}>{money(value)}</Text> },
																]}
															/>
														)
														: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未记录实际成交" />,
												},
											]}
										/>
									)}
								</Card>
							);
						})}
					</Space>
				)}

			<Modal
				open={Boolean(tradeTarget)}
				title={tradeTarget
					? `${tradeTarget.plan.stock_name} · 记录${tradeTarget.side === "sell" ? "卖出" : "买回"}成交`
					: ""}
				okText="确认记录"
				cancelText="取消"
				confirmLoading={savingTrade}
				onOk={handleTradeSubmit}
				onCancel={() => {
					setTradeTarget(null);
					form.resetFields();
				}}
				destroyOnClose
			>
				{tradeTarget && (
					<>
						<Alert
							type={tradeTarget.side === "sell" ? "warning" : "info"}
							showIcon
							message={tradeTarget.side === "sell"
								? "只记录已经实际成交的卖单，系统会保留至少70%底仓。"
								: `只能使用滚动资金池${money(tradeTarget.plan.cash_pool)}，最多买回${tradeTarget.plan.open_sold_shares}股。`}
							style={{ marginBottom: 16 }}
						/>
						<Form form={form} layout="vertical">
							<Row gutter={12}>
								<Col span={12}>
									<Form.Item
										name="shares"
										label="实际成交股数"
										rules={[
											{ required: true, message: "请输入股数" },
											{
												validator: (_, value) => value > 0 && value % 100 === 0
													? Promise.resolve()
													: Promise.reject(new Error("必须为100股的整数倍")),
											},
										]}
									>
										<InputNumber min={100} step={100} precision={0} style={{ width: "100%" }} />
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item name="price" label="实际成交价" rules={[{ required: true, message: "请输入成交价" }]}>
										<InputNumber min={0.01} step={0.01} precision={3} prefix="¥" style={{ width: "100%" }} />
									</Form.Item>
								</Col>
							</Row>
							<Row gutter={12}>
								<Col span={12}>
									<Form.Item name="fees" label="实际佣金及税费">
										<InputNumber min={0} step={0.01} precision={2} prefix="¥" style={{ width: "100%" }} />
									</Form.Item>
								</Col>
								<Col span={12}>
									<Form.Item
										name="trade_date"
										label="成交日期"
										rules={[
											{ required: true, message: "请输入日期" },
											{ pattern: /^\d{4}-\d{2}-\d{2}$/, message: "格式为 YYYY-MM-DD" },
										]}
									>
										<Input placeholder="YYYY-MM-DD" />
									</Form.Item>
								</Col>
							</Row>
							<Form.Item name="note" label="备注（可选）">
								<Input.TextArea rows={2} maxLength={500} />
							</Form.Item>
						</Form>
					</>
				)}
			</Modal>
		</div>
	);
}
