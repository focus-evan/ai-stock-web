/**
 * 跟投分析 Modal
 * 用户输入持仓信息 → 调后端 LLM 深度分析 → 展示盈亏 + 操作指南
 */
import type {
	FollowUpAnalysis,
	FollowUpPnlInfo,
	OperationPlanItem,
} from "#src/api/strategy";
import { fetchFollowUpAnalysis } from "#src/api/strategy";
import {
	AlertOutlined,
	BulbOutlined,
	DollarOutlined,
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
	Modal,
	Row,
	Spin,
	Steps,
	Tag,
	Timeline,
	Typography,
} from "antd";
import React, { useState } from "react";

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

/** 盈亏颜色 */
function pnlColor(pct: number) {
	if (pct >= 3)
		return "#cf1322";
	if (pct > 0)
		return "#d46b08";
	if (pct <= -3)
		return "#389e0d";
	return "#595959";
}

/** 决策颜色 */
function decisionColor(decision: string) {
	if (decision.includes("止损"))
		return "#ff4d4f";
	if (decision.includes("止盈"))
		return "#52c41a";
	if (decision.includes("加仓"))
		return "#1677ff";
	if (decision.includes("减仓"))
		return "#fa8c16";
	return "#722ed1";
}

/** 渲染操作计划时间线 */
function OperationTimeline({ plan }: { plan: OperationPlanItem[] }) {
	const items = plan.map((p, i) => ({
		key: i,
		color: p.action.includes("止损")
			? "red"
			: p.action.includes("止盈")
				? "green"
				: p.action.includes("加仓")
					? "blue"
					: "orange",
		dot: p.action.includes("止损")
			? <AlertOutlined style={{ fontSize: 14, color: "#ff4d4f" }} />
			: p.action.includes("止盈")
				? <RiseOutlined style={{ fontSize: 14, color: "#52c41a" }} />
				: <ThunderboltOutlined style={{ fontSize: 14, color: "#fa8c16" }} />,
		label: (
			<Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
				{p.timing}
			</Text>
		),
		children: (
			<div style={{ paddingBottom: 8 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
					<Tag
						color={p.action.includes("止损") ? "red" : p.action.includes("止盈") ? "green" : p.action.includes("加仓") ? "blue" : "orange"}
						style={{ margin: 0, fontWeight: 600 }}
					>
						{p.action}
					</Tag>
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

/** 盈亏展示卡片 */
function PnlCard({ info }: { info: FollowUpPnlInfo }) {
	const isProfit = info.pnl_pct >= 0;
	return (
		<div style={{
			background: isProfit ? "linear-gradient(135deg, #fff1f0 0%, #fff7e6 100%)" : "linear-gradient(135deg, #e6f7ff 0%, #f0fff4 100%)",
			borderRadius: 12,
			padding: 16,
			border: `1px solid ${isProfit ? "#ffa39e" : "#91d5ff"}`,
			marginBottom: 16,
		}}
		>
			<Row gutter={12}>
				<Col span={8} style={{ textAlign: "center" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>买入均价</Text>
					<div style={{ fontSize: 20, fontWeight: 700, color: "#262626" }}>
						¥
						{info.buy_price_avg.toFixed(2)}
					</div>
					<Text type="secondary" style={{ fontSize: 11 }}>
						{info.shares.toFixed(0)}
						{" "}
						股
					</Text>
				</Col>
				<Col span={8} style={{ textAlign: "center", borderLeft: "1px solid rgba(0,0,0,0.06)", borderRight: "1px solid rgba(0,0,0,0.06)" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>当前价格</Text>
					<div style={{ fontSize: 20, fontWeight: 700, color: info.current_price > 0 ? "#262626" : "#bfbfbf" }}>
						{info.current_price > 0 ? `¥${info.current_price.toFixed(2)}` : "获取中..."}
					</div>
					<Text type="secondary" style={{ fontSize: 11 }}>
						市值 ¥
						{info.current_value.toFixed(0)}
					</Text>
				</Col>
				<Col span={8} style={{ textAlign: "center" }}>
					<Text type="secondary" style={{ fontSize: 11 }}>浮动盈亏</Text>
					<div style={{
						fontSize: 20,
						fontWeight: 700,
						color: pnlColor(info.pnl_pct),
					}}
					>
						{info.pnl_pct >= 0 ? "+" : ""}
						{info.pnl_pct.toFixed(2)}
						%
					</div>
					<Text style={{ fontSize: 11, color: pnlColor(info.pnl_pct) }}>
						{info.pnl_amount >= 0 ? "+" : ""}
						{info.pnl_amount.toFixed(2)}
						{" "}
						元
					</Text>
				</Col>
			</Row>
		</div>
	);
}

/** 分析结果展示 */
function AnalysisResult({ analysis, pnl }: { analysis: FollowUpAnalysis, pnl: FollowUpPnlInfo }) {
	return (
		<div>
			{/* 核心决策 */}
			<div style={{
				background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
				borderRadius: 10,
				padding: "12px 16px",
				marginBottom: 16,
				border: "1px solid #d3adf7",
			}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
					<ThunderboltOutlined style={{ color: "#722ed1" }} />
					<Text strong style={{ color: "#722ed1" }}>核心决策</Text>
					<Tag color={decisionColor(analysis.core_decision)} style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
						{analysis.core_decision}
					</Tag>
				</div>
				<Text style={{ fontSize: 13, color: "#434343" }}>{analysis.decision_reason}</Text>
			</div>

			{/* 总结一句话 */}
			<Alert
				type="info"
				showIcon
				icon={<BulbOutlined />}
				message={analysis.summary}
				style={{ marginBottom: 16, borderRadius: 8 }}
			/>

			<PnlCard info={pnl} />

			{/* 操作方案 */}
			<Divider orientation="left" style={{ fontSize: 13 }}>
				📋 分步操作方案
			</Divider>
			<OperationTimeline plan={analysis.operation_plan} />

			{/* 风险 / 机会 */}
			<Row gutter={12} style={{ marginTop: 8 }}>
				<Col span={12}>
					<div style={{
						background: "#fff2e8",
						borderRadius: 8,
						padding: "10px 12px",
						border: "1px solid #ffbb96",
					}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
							<AlertOutlined style={{ color: "#d46b08", fontSize: 13 }} />
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
					<div style={{
						background: "#f6ffed",
						borderRadius: 8,
						padding: "10px 12px",
						border: "1px solid #b7eb8f",
					}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
							<SafetyOutlined style={{ color: "#389e0d", fontSize: 13 }} />
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

// ===================== 主 Modal 组件 =====================

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
	const [result, setResult] = useState<{
		analysis: FollowUpAnalysis
		pnl: FollowUpPnlInfo
	} | null>(null);
	const [step, setStep] = useState(0); // 0=输入 1=分析中 2=结果

	const handleAnalyze = async () => {
		try {
			const values = await form.validateFields();
			setStep(1);
			setResult(null);

			const resp = await fetchFollowUpAnalysis({
				stock_code: stockCode,
				stock_name: stockName,
				shares: values.shares,
				buy_amount: values.buy_amount,
				original_advice: originalAdvice,
				original_buy_price: originalBuyPrice,
				original_target_price: originalTargetPrice,
				original_stop_loss: originalStopLoss,
			});

			if (resp.status === "success" && resp.data) {
				setResult({
					analysis: resp.data.analysis,
					pnl: resp.data.pnl_info,
				});
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
	};

	const handleClose = () => {
		handleReset();
		onClose();
	};

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
			width={640}
			footer={null}
			destroyOnClose
			style={{ top: 40 }}
		>
			<Steps
				size="small"
				current={step}
				style={{ marginBottom: 20 }}
				items={[
					{ title: "输入持仓" },
					{ title: "AI分析中" },
					{ title: "操作指南" },
				]}
			/>

			{/* Step 0: 输入表单 */}
			{step === 0 && (
				<>
					{/* 原始推荐信息摘要 */}
					{(originalBuyPrice || originalTargetPrice || originalStopLoss) && (
						<div style={{
							background: "#f5f3ff",
							borderRadius: 8,
							padding: "10px 14px",
							marginBottom: 16,
							border: "1px solid #d3adf7",
						}}
						>
							<Text type="secondary" style={{ fontSize: 12 }}>原始推荐参考</Text>
							<div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
								{originalBuyPrice && (
									<Tag color="green" style={{ margin: 0 }}>
										买入价 ¥
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

					<Form
						form={form}
						layout="vertical"
						onFinish={handleAnalyze}
					>
						<Row gutter={16}>
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
									/>
								</Form.Item>
							</Col>
							<Col span={12}>
								<Form.Item
									name="buy_amount"
									label="买入总金额（元）"
									rules={[{ required: true, message: "请输入买入金额" }]}
								>
									<InputNumber
										id="follow-up-amount"
										min={1}
										style={{ width: "100%" }}
										placeholder="如：10000"
										addonAfter="元"
										formatter={v => `${v}`.replace(/\B(?=(?:\d{3})+(?!\d))/g, ",")}
										parser={v => (Number(v?.replace(/,/g, "") ?? 0) as 1)}
									/>
								</Form.Item>
							</Col>
						</Row>

						<Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
							💡 系统将自动获取
							{" "}
							<b>{stockName || stockCode}</b>
							{" "}
							的实时行情，结合您的持仓成本，由 AI 给出详细的后续操作指南。
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
					<Spin
						indicator={<LoadingOutlined style={{ fontSize: 36, color: "#722ed1" }} spin />}
					/>
					<div style={{ marginTop: 16, color: "#722ed1", fontWeight: 600 }}>
						AI 正在深度分析持仓状况...
					</div>
					<Text type="secondary" style={{ fontSize: 12 }}>
						获取实时行情 · 计算盈亏 · 生成操作方案（约10-30秒）
					</Text>
				</div>
			)}

			{/* Step 2: 分析结果 */}
			{step === 2 && result && (
				<>
					<AnalysisResult analysis={result.analysis} pnl={result.pnl} />
					<div style={{ display: "flex", gap: 8, marginTop: 16 }}>
						<Button onClick={handleReset} style={{ flex: 1 }}>
							重新分析
						</Button>
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
		</Modal>
	);
};

export default FollowUpModal;
