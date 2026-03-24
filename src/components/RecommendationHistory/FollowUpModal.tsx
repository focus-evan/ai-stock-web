/**
 * 跟投分析 Modal（v2）
 * - 输入：个股股价 + 股数
 * - 落库 + 历史列表 Tab 展示
 */
import type {
	FollowUpAnalysis,
	FollowUpHistoryRecord,
	FollowUpPnlInfo,
	OperationPlanItem,
} from "#src/api/strategy";
import { fetchFollowUpAnalysis, fetchFollowUpHistory } from "#src/api/strategy";
import {
	AlertOutlined,
	BulbOutlined,
	ClockCircleOutlined,
	DollarOutlined,
	HistoryOutlined,
	LoadingOutlined,
	RiseOutlined,
	SafetyOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Col,
	Divider,
	Form,
	InputNumber,
	List,
	Modal,
	Row,
	Spin,
	Steps,
	Tabs,
	Tag,
	Timeline,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";

const { Text, Paragraph } = Typography;

interface Props {
	open: boolean
	onClose: () => void
	stockCode: string
	stockName: string
	originalBuyPrice?: number
	originalTargetPrice?: number
	originalStopLoss?: number
	originalAdvice?: string
}

// =================== 颜色/样式工具 ===================

function pnlColor(pct: number) {
	if (pct >= 3)
		return "#cf1322";
	if (pct > 0)
		return "#d46b08";
	if (pct <= -3)
		return "#389e0d";
	return "#595959";
}

function decisionColor(decision: string) {
	if (decision.includes("止损"))
		return "red";
	if (decision.includes("止盈"))
		return "green";
	if (decision.includes("加仓"))
		return "blue";
	if (decision.includes("减仓"))
		return "orange";
	return "purple";
}

// =================== 子组件 ===================

function OperationTimeline({ plan }: { plan: OperationPlanItem[] }) {
	const items = plan.map((p, i) => ({
		key: i,
		color: p.action.includes("止损") ? "red" : p.action.includes("止盈") ? "green" : p.action.includes("加仓") ? "blue" : "orange",
		dot: p.action.includes("止损")
			? <AlertOutlined style={{ fontSize: 13, color: "#ff4d4f" }} />
			: p.action.includes("止盈")
				? <RiseOutlined style={{ fontSize: 13, color: "#52c41a" }} />
				: <ThunderboltOutlined style={{ fontSize: 13, color: "#fa8c16" }} />,
		label: <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{p.timing}</Text>,
		children: (
			<div style={{ paddingBottom: 6 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
					<Tag color={decisionColor(p.action)} style={{ margin: 0, fontWeight: 600 }}>{p.action}</Tag>
					{p.trigger_price > 0 && (
						<Text style={{ fontSize: 13, fontWeight: 600, color: "#262626" }}>
							{p.trigger_price.toFixed(2)}
							{" "}
							元
						</Text>
					)}
					{p.quantity_pct && p.quantity_pct !== "-" && (
						<Tag style={{ margin: 0, fontSize: 11 }}>{p.quantity_pct}</Tag>
					)}
				</div>
				<Text type="secondary" style={{ fontSize: 12 }}>{p.detail}</Text>
			</div>
		),
	}));
	return <Timeline mode="left" items={items} />;
}

function PnlCard({ info }: { info: FollowUpPnlInfo }) {
	const isProfit = info.pnl_pct >= 0;
	const border = isProfit ? "#ffa39e" : "#91d5ff";
	const bg = isProfit ? "linear-gradient(135deg,#fff1f0 0%,#fff7e6 100%)" : "linear-gradient(135deg,#e6f7ff 0%,#f0fff4 100%)";
	return (
		<div style={{ background: bg, borderRadius: 12, padding: 14, border: `1px solid ${border}`, marginBottom: 14 }}>
			<Row gutter={8}>
				<Col span={8} style={{ textAlign: "center" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>买入股价</Text>
					<div style={{ fontSize: 19, fontWeight: 700, color: "#262626" }}>
						¥
						{info.buy_price_per_share.toFixed(2)}
					</div>
					<Text type="secondary" style={{ fontSize: 11 }}>
						×
						{info.shares.toFixed(0)}
						股
					</Text>
				</Col>
				<Col span={8} style={{ textAlign: "center", borderLeft: "1px solid rgba(0,0,0,0.06)", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>当前价格</Text>
					<div style={{ fontSize: 19, fontWeight: 700, color: info.current_price > 0 ? "#262626" : "#bfbfbf" }}>
						{info.current_price > 0 ? `¥${info.current_price.toFixed(2)}` : "获取中..."}
					</div>
					<Text type="secondary" style={{ fontSize: 11 }}>
						市值¥
						{info.current_value.toFixed(0)}
					</Text>
				</Col>
				<Col span={8} style={{ textAlign: "center" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>浮动盈亏</Text>
					<div style={{ fontSize: 19, fontWeight: 700, color: pnlColor(info.pnl_pct) }}>
						{info.pnl_pct >= 0 ? "+" : ""}
						{info.pnl_pct.toFixed(2)}
						%
					</div>
					<Text style={{ fontSize: 11, color: pnlColor(info.pnl_pct) }}>
						{info.pnl_amount >= 0 ? "+" : ""}
						{info.pnl_amount.toFixed(2)}
						元
					</Text>
				</Col>
			</Row>
		</div>
	);
}

function AnalysisResult({ analysis, pnl }: { analysis: FollowUpAnalysis, pnl: FollowUpPnlInfo }) {
	return (
		<div>
			<div style={{ background: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, border: "1px solid #d3adf7" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
					<ThunderboltOutlined style={{ color: "#722ed1" }} />
					<Text strong style={{ color: "#722ed1" }}>核心决策</Text>
					<Tag color={decisionColor(analysis.core_decision)} style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
						{analysis.core_decision}
					</Tag>
				</div>
				<Text style={{ fontSize: 13, color: "#434343" }}>{analysis.decision_reason}</Text>
			</div>
			<Alert type="info" showIcon icon={<BulbOutlined />} message={analysis.summary} style={{ marginBottom: 14, borderRadius: 8 }} />
			<PnlCard info={pnl} />
			<Divider orientation="left" style={{ fontSize: 13 }}>📋 分步操作方案</Divider>
			<OperationTimeline plan={analysis.operation_plan} />
			<Row gutter={10} style={{ marginTop: 8 }}>
				<Col span={12}>
					<div style={{ background: "#fff2e8", borderRadius: 8, padding: "10px 12px", border: "1px solid #ffbb96" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
							<AlertOutlined style={{ color: "#d46b08", fontSize: 12 }} />
							<Text strong style={{ fontSize: 12, color: "#d46b08" }}>风险提示</Text>
						</div>
						{analysis.risk_points.map((r, i) => (
							<div key={i} style={{ fontSize: 12, color: "#434343", marginBottom: 3 }}>
								•
								{" "}
								{r}
							</div>
						))}
					</div>
				</Col>
				<Col span={12}>
					<div style={{ background: "#f6ffed", borderRadius: 8, padding: "10px 12px", border: "1px solid #b7eb8f" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
							<SafetyOutlined style={{ color: "#389e0d", fontSize: 12 }} />
							<Text strong style={{ fontSize: 12, color: "#389e0d" }}>机会点</Text>
						</div>
						{analysis.opportunity_points.map((r, i) => (
							<div key={i} style={{ fontSize: 12, color: "#434343", marginBottom: 3 }}>
								•
								{" "}
								{r}
							</div>
						))}
					</div>
				</Col>
			</Row>
		</div>
	);
}

// =================== 历史记录列表 ===================

function HistoryPanel({ stockCode }: { stockCode: string }) {
	const [records, setRecords] = useState<FollowUpHistoryRecord[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const resp = await fetchFollowUpHistory(stockCode, 20);
				if (resp.status === "success")
					setRecords(resp.data.records || []);
			}
			catch {
				// silent
			}
			finally {
				setLoading(false);
			}
		})();
	}, [stockCode]);

	if (loading) {
		return (
			<div style={{ textAlign: "center", paddingTop: 40 }}>
				<Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: "#722ed1" }} spin />} />
			</div>
		);
	}

	if (records.length === 0) {
		return (
			<div style={{ textAlign: "center", padding: "40px 0", color: "#bfbfbf" }}>
				<HistoryOutlined style={{ fontSize: 32, marginBottom: 8 }} />
				<div>暂无该股分析记录</div>
			</div>
		);
	}

	return (
		<div style={{ maxHeight: 420, overflowY: "auto" }}>
			<List
				dataSource={records}
				renderItem={rec => (
					<List.Item style={{ padding: "10px 0" }}>
						<div style={{ width: "100%", background: "#fafafa", borderRadius: 8, padding: "10px 14px", border: "1px solid #f0f0f0" }}>
							{/* 头部行 */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
								<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
									<Tag color={decisionColor(rec.core_decision)} style={{ margin: 0, fontWeight: 600 }}>
										{rec.core_decision || "持有观察"}
									</Tag>
									<Text style={{ fontSize: 12, color: pnlColor(rec.pnl_pct) }}>
										{rec.pnl_pct >= 0 ? "+" : ""}
										{rec.pnl_pct?.toFixed(2) ?? "0.00"}
										%
									</Text>
									{rec.pnl_amount != null && (
										<Text style={{ fontSize: 11, color: pnlColor(rec.pnl_pct) }}>
											(
											{rec.pnl_amount >= 0 ? "+" : ""}
											{rec.pnl_amount.toFixed(1)}
											元)
										</Text>
									)}
								</div>
								<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
									<ClockCircleOutlined style={{ fontSize: 11, color: "#8c8c8c" }} />
									<Text type="secondary" style={{ fontSize: 11 }}>{rec.analyzed_at?.slice(0, 16)}</Text>
								</div>
							</div>
							{/* 买入信息行 */}
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
								<Text type="secondary" style={{ fontSize: 12 }}>
									买入:
									{" "}
									<b>
										¥
										{rec.buy_price?.toFixed(2) ?? "-"}
									</b>
									{" "}
									×
									{rec.shares}
									股
								</Text>
								<Text type="secondary" style={{ fontSize: 12 }}>
									现价:
									{" "}
									<b>
										{rec.current_price > 0 ? `¥${rec.current_price?.toFixed(2)}` : "N/A"}
									</b>
								</Text>
								<Text type="secondary" style={{ fontSize: 12 }}>
									总成本:
									{" "}
									<b>
										¥
										{rec.buy_amount?.toFixed(0)}
									</b>
								</Text>
							</div>
							{/* 仓位评估 */}
							{rec.position_assessment && (
								<Text type="secondary" style={{ fontSize: 11, color: "#8c8c8c" }}>
									📊
									{" "}
									{rec.position_assessment}
								</Text>
							)}
							{/* 操作摘要 */}
							{rec.analysis_result?.summary && (
								<div style={{ marginTop: 4, padding: "4px 8px", background: "#f5f3ff", borderRadius: 4, fontSize: 12, color: "#722ed1" }}>
									💡
									{" "}
									{rec.analysis_result.summary}
								</div>
							)}
						</div>
					</List.Item>
				)}
			/>
		</div>
	);
}

// =================== 主 Modal ===================

const FollowUpModal: React.FC<Props> = ({
	open,
	onClose,
	stockCode,
	stockName,
	originalBuyPrice,
	originalTargetPrice,
	originalStopLoss,
	originalAdvice,
}) => {
	const [form] = Form.useForm();
	const [result, setResult] = useState<{ analysis: FollowUpAnalysis, pnl: FollowUpPnlInfo } | null>(null);
	const [step, setStep] = useState(0); // 0=输入 1=分析中 2=结果
	const [activeTab, setActiveTab] = useState<"analyze" | "history">("analyze");

	// 实时计算总金额显示
	const [previewAmount, setPreviewAmount] = useState<number>(0);

	const handleAnalyze = async () => {
		try {
			const values = await form.validateFields();
			setStep(1);
			setResult(null);
			const resp = await fetchFollowUpAnalysis({
				stock_code: stockCode,
				stock_name: stockName,
				shares: values.shares,
				buy_price: values.buy_price,
				original_advice: originalAdvice,
				original_buy_price: originalBuyPrice,
				original_target_price: originalTargetPrice,
				original_stop_loss: originalStopLoss,
			});
			if (resp.status === "success" && resp.data) {
				setResult({ analysis: resp.data.analysis, pnl: resp.data.pnl_info });
				setStep(2);
			}
		}
		catch (e) {
			console.error("follow up analysis failed", e);
			setStep(0);
		}
	};

	const handleReset = () => {
		setStep(0);
		setResult(null);
		form.resetFields();
		setPreviewAmount(0);
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

	// 计算并刷新预估总金额
	const recalcAmount = () => {
		const values = form.getFieldsValue();
		const p = Number(values.buy_price || 0);
		const s = Number(values.shares || 0);
		setPreviewAmount(p > 0 && s > 0 ? Math.round(p * s * 100) / 100 : 0);
	};

	const tabItems = [
		{
			key: "analyze",
			label: (
				<span>
					<ThunderboltOutlined />
					{" "}
					深度分析
				</span>
			),
			children: (
				<>
					{/* Step 0: 输入 */}
					{step === 0 && (
						<>
							{/* 原始推荐参考 */}
							{(originalBuyPrice || originalTargetPrice || originalStopLoss) && (
								<div style={{ background: "#f5f3ff", borderRadius: 8, padding: "8px 14px", marginBottom: 14, border: "1px solid #d3adf7" }}>
									<Text type="secondary" style={{ fontSize: 11 }}>原始推荐参考价格</Text>
									<div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
										{originalBuyPrice && (
											<Tag color="green" style={{ margin: 0 }}>
												推荐买入 ¥
												{originalBuyPrice}
											</Tag>
										)}
										{originalTargetPrice && (
											<Tag color="red" style={{ margin: 0 }}>
												目标价 ¥
												{originalTargetPrice}
											</Tag>
										)}
										{originalStopLoss && (
											<Tag style={{ margin: 0, color: "#8c8c8c" }}>
												止损价 ¥
												{originalStopLoss}
											</Tag>
										)}
									</div>
								</div>
							)}

							<Form form={form} layout="vertical" onFinish={handleAnalyze}>
								<Row gutter={14}>
									<Col span={12}>
										<Form.Item
											name="buy_price"
											label="买入股价（元/股）"
											rules={[{ required: true, message: "请输入买入时的股价" }]}
										>
											<InputNumber
												id="follow-up-buy-price"
												min={0.01}
												precision={3}
												step={0.01}
												style={{ width: "100%" }}
												placeholder={originalBuyPrice ? `如：${originalBuyPrice}` : "如：15.28"}
												addonAfter="元"
												onChange={recalcAmount}
											/>
										</Form.Item>
									</Col>
									<Col span={12}>
										<Form.Item
											name="shares"
											label="买入股数（股）"
											rules={[{ required: true, message: "请输入买入股数" }]}
										>
											<InputNumber
												id="follow-up-shares"
												min={100}
												step={100}
												style={{ width: "100%" }}
												placeholder="如：1000"
												addonAfter="股"
												onChange={recalcAmount}
											/>
										</Form.Item>
									</Col>
								</Row>

								{/* 预估总成本提示 */}
								{previewAmount > 0 && (
									<div style={{ marginBottom: 12, padding: "6px 10px", background: "#f0f5ff", borderRadius: 6, border: "1px solid #adc6ff", fontSize: 12 }}>
										💰 预估总成本：
										<b style={{ color: "#2f54eb" }}>
											{" "}
											¥
											{previewAmount.toFixed(2)}
											元
										</b>
									</div>
								)}

								<Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 14 }}>
									💡 系统将自动获取
									{" "}
									<b>{stockName || stockCode}</b>
									{" "}
									实时行情，结合您的买入成本，由 AI 给出后续操作指南（分析将自动保存到历史记录）。
								</Paragraph>

								<Button
									type="primary"
									htmlType="submit"
									block
									size="large"
									icon={<ThunderboltOutlined />}
									style={{ background: "#722ed1", borderColor: "#722ed1", borderRadius: 8 }}
								>
									开始深度分析
								</Button>
							</Form>
						</>
					)}

					{/* Step 1: 加载中 */}
					{step === 1 && (
						<div style={{ textAlign: "center", padding: "40px 0" }}>
							<Spin indicator={<LoadingOutlined style={{ fontSize: 36, color: "#722ed1" }} spin />} />
							<div style={{ marginTop: 14, color: "#722ed1", fontWeight: 600 }}>AI 正在深度分析持仓状况...</div>
							<Text type="secondary" style={{ fontSize: 12 }}>获取实时行情 · 计算盈亏 · 生成操作方案（约10-30秒）</Text>
						</div>
					)}

					{/* Step 2: 结果 */}
					{step === 2 && result && (
						<>
							<AnalysisResult analysis={result.analysis} pnl={result.pnl} />
							<div style={{ display: "flex", gap: 8, marginTop: 16 }}>
								<Button onClick={handleReset} style={{ flex: 1 }}>重新分析</Button>
								<Button
									type="primary"
									onClick={handleClose}
									style={{ flex: 1, background: "#722ed1", borderColor: "#722ed1" }}
								>
									好的，知道了
								</Button>
							</div>
						</>
					)}
				</>
			),
		},
		{
			key: "history",
			label: (
				<span>
					<HistoryOutlined />
					{" "}
					历史分析
				</span>
			),
			children: <HistoryPanel stockCode={stockCode} />,
		},
	];

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			title={(
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<DollarOutlined style={{ color: "#722ed1" }} />
					<span>
						跟投分析 —
						{" "}
						<span style={{ color: "#722ed1" }}>{stockName || stockCode}</span>
					</span>
				</div>
			)}
			width={660}
			footer={null}
			destroyOnClose
			style={{ top: 40 }}
		>
			<Tabs
				activeKey={activeTab}
				onChange={v => setActiveTab(v as any)}
				size="small"
				style={{ marginBottom: 0 }}
				items={tabItems}
			/>

			{/* 只在"深度分析"Tab 且 Step 0 时显示步骤进度 */}
			{activeTab === "analyze" && step > 0 && (
				<Steps
					size="small"
					current={step}
					style={{ marginBottom: 16, marginTop: 4 }}
					items={[
						{ title: "输入持仓" },
						{ title: "AI分析中" },
						{ title: "操作指南" },
					]}
				/>
			)}
		</Modal>
	);
};

export default FollowUpModal;
