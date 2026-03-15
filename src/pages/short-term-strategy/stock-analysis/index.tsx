import type { StockAnalysisData, StrategySignal } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import { fetchStockAnalysis } from "#src/api/strategy";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CheckCircleOutlined,
	ExclamationCircleOutlined,
	InfoCircleOutlined,
	ReloadOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	Input,
	Row,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import React, { useCallback, useState } from "react";

const { Title, Text, Paragraph } = Typography;

/** 操作建议对应的颜色和图标 */
const actionConfig: Record<string, { color: string, bg: string, icon: React.ReactNode }> = {
	买入: { color: "#f5222d", bg: "linear-gradient(135deg, #ff4d4f 0%, #ff7a45 100%)", icon: <ArrowUpOutlined /> },
	持有: { color: "#1890ff", bg: "linear-gradient(135deg, #1890ff 0%, #36cfc9 100%)", icon: <InfoCircleOutlined /> },
	卖出: { color: "#52c41a", bg: "linear-gradient(135deg, #52c41a 0%, #73d13d 100%)", icon: <ArrowDownOutlined /> },
	观望: { color: "#faad14", bg: "linear-gradient(135deg, #faad14 0%, #ffc53d 100%)", icon: <ExclamationCircleOutlined /> },
};

const signalConfig: Record<string, { color: string, tag: string }> = {
	看多: { color: "#f5222d", tag: "red" },
	看空: { color: "#52c41a", tag: "green" },
	中性: { color: "#faad14", tag: "orange" },
	无数据: { color: "#8c8c8c", tag: "default" },
};

const StockAnalysisPage: React.FC = () => {
	const [stockInput, setStockInput] = useState("");
	const [data, setData] = useState<StockAnalysisData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAnalyze = useCallback(async () => {
		const input = stockInput.trim();
		if (!input)
			return;

		setLoading(true);
		setError(null);
		setData(null);

		try {
			const response = await fetchStockAnalysis(input);
			if (response.status === "success" && response.data) {
				setData(response.data);
			}
			else {
				setError(response.message || "分析失败，请稍后重试");
			}
		}
		catch (e: any) {
			// 尝试从 API 响应中提取错误信息
			let errorMsg = "网络请求失败，请稍后重试";
			try {
				if (e?.response) {
					const body = await e.response.json();
					if (body?.message) {
						errorMsg = body.message;
					}
					else if (body?.detail) {
						errorMsg = body.detail;
					}
				}
				else if (e?.message) {
					errorMsg = e.message;
				}
			}
			catch {
				// 解析失败，使用默认消息
			}
			setError(errorMsg);
		}
		finally {
			setLoading(false);
		}
	}, [stockInput]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter")
			handleAnalyze();
	};

	const strategyColumns: ColumnsType<StrategySignal> = [
		{
			title: "战法",
			dataIndex: "strategy",
			key: "strategy",
			width: 100,
			render: (name: string) => <Text strong>{name}</Text>,
		},
		{
			title: "信号",
			dataIndex: "signal",
			key: "signal",
			width: 80,
			align: "center",
			render: (signal: string) => {
				const cfg = signalConfig[signal] || signalConfig["无数据"];
				return (
					<Tag color={cfg.tag} style={{ fontWeight: "bold" }}>
						{signal === "看多" && <ArrowUpOutlined style={{ marginRight: 4 }} />}
						{signal === "看空" && <ArrowDownOutlined style={{ marginRight: 4 }} />}
						{signal}
					</Tag>
				);
			},
		},
		{
			title: "分析详情",
			dataIndex: "detail",
			key: "detail",
			render: (detail: string) => <Text style={{ fontSize: 13 }}>{detail}</Text>,
		},
	];

	return (
		<div style={{ padding: 24 }}>
			{/* Header */}
			<Card
				bordered={false}
				style={{
					marginBottom: 24,
					background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
					borderRadius: 12,
				}}
			>
				<Row gutter={[24, 16]} align="middle">
					<Col span={14}>
						<Space align="center">
							<SearchOutlined style={{ fontSize: 32, color: "#fff" }} />
							<div>
								<Title level={3} style={{ margin: 0, color: "#fff" }}>个股综合分析</Title>
								<Text style={{ color: "rgba(255,255,255,0.85)" }}>
									输入股票代码或公司名称，七大短线战法综合研判
								</Text>
							</div>
						</Space>
					</Col>
					<Col span={10}>
						<Space.Compact style={{ width: "100%" }}>
							<Input
								size="large"
								placeholder="输入股票代码(如600519)或公司名称(如贵州茅台)"
								value={stockInput}
								onChange={e => setStockInput(e.target.value)}
								onKeyDown={handleKeyDown}
								allowClear
								style={{
									borderRadius: "8px 0 0 8px",
									fontSize: 15,
								}}
							/>
							<Button
								type="primary"
								size="large"
								icon={<SearchOutlined />}
								loading={loading}
								onClick={handleAnalyze}
								style={{
									borderRadius: "0 8px 8px 0",
									background: "#ff4d4f",
									borderColor: "#ff4d4f",
									fontWeight: "bold",
								}}
							>
								分析
							</Button>
						</Space.Compact>
					</Col>
				</Row>
			</Card>

			{/* Loading */}
			{loading && (
				<Card bordered={false} style={{ borderRadius: 12, textAlign: "center", padding: 60 }}>
					<Spin size="large" />
					<div style={{ marginTop: 16 }}>
						<Text type="secondary">正在分析中，AI 正在综合七大战法数据...</Text>
					</div>
					<div style={{ marginTop: 8 }}>
						<Text type="secondary" style={{ fontSize: 12 }}>
							首次分析可能需要 10-30 秒
						</Text>
					</div>
				</Card>
			)}

			{/* Error */}
			{error && !loading && (
				<Alert
					message="提示"
					description={error}
					type="warning"
					showIcon
					action={<Button onClick={handleAnalyze} icon={<ReloadOutlined />}>重试</Button>}
					style={{ marginBottom: 24, borderRadius: 8 }}
				/>
			)}

			{/* Empty */}
			{!loading && !error && !data && (
				<Card bordered={false} style={{ borderRadius: 12 }}>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={(
							<span>
								请在上方输入股票代码或公司名称
								<br />
								<Text type="secondary" style={{ fontSize: 12 }}>
									支持6位数字代码 或 中文公司名称
								</Text>
							</span>
						)}
					/>
				</Card>
			)}

			{/* Results */}
			{data && !loading && (
				<>
					{/* Action Card */}
					<Card
						bordered={false}
						style={{
							marginBottom: 24,
							borderRadius: 12,
							background: actionConfig[data.action]?.bg || actionConfig["观望"].bg,
							overflow: "hidden",
						}}
					>
						<Row gutter={[24, 16]} align="middle">
							<Col xs={24} sm={8}>
								<div style={{ textAlign: "center" }}>
									<div style={{ fontSize: 48, color: "#fff", lineHeight: 1 }}>
										{actionConfig[data.action]?.icon}
									</div>
									<Title level={2} style={{ margin: "8px 0 0", color: "#fff" }}>
										{data.action}
									</Title>
									<Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16 }}>
										{data.stock_name}
										(
										{data.stock_code}
										)
									</Text>
								</div>
							</Col>
							<Col xs={24} sm={16}>
								<Row gutter={[16, 12]}>
									<Col span={6}>
										<Statistic
											title={<span style={{ color: "rgba(255,255,255,0.65)" }}>综合评分</span>}
											value={data.score}
											suffix="/100"
											valueStyle={{ color: "#fff", fontWeight: "bold", fontSize: 28 }}
										/>
									</Col>
									<Col span={6}>
										<Statistic
											title={<span style={{ color: "rgba(255,255,255,0.65)" }}>置信度</span>}
											value={data.confidence}
											suffix="%"
											valueStyle={{ color: "#fff", fontWeight: "bold", fontSize: 28 }}
										/>
									</Col>
									<Col span={6}>
										<Statistic
											title={<span style={{ color: "rgba(255,255,255,0.65)" }}>命中策略</span>}
											value={data.strategies_hit}
											suffix={`/${data.strategies_total}`}
											valueStyle={{ color: "#fff", fontWeight: "bold", fontSize: 28 }}
										/>
									</Col>
									<Col span={6}>
										<Statistic
											title={<span style={{ color: "rgba(255,255,255,0.65)" }}>风险等级</span>}
											value={data.risk_level}
											valueStyle={{
												color: "#fff",
												fontWeight: "bold",
												fontSize: 28,
											}}
										/>
									</Col>
								</Row>
							</Col>
						</Row>
					</Card>

					{/* Price Points */}
					<Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
						{/* Buy Point */}
						<Col xs={24} sm={8}>
							<Card
								bordered={false}
								style={{ borderRadius: 12, height: "100%" }}
								title={(
									<Space>
										<ArrowUpOutlined style={{ color: "#f5222d" }} />
										<Text strong>买入价位</Text>
									</Space>
								)}
							>
								{data.buy_point?.price_low || data.buy_point?.price_high
									? (
										<>
											<div style={{ textAlign: "center", margin: "12px 0" }}>
												<Text style={{ fontSize: 24, fontWeight: "bold", color: "#f5222d" }}>
													¥
													{data.buy_point.price_low.toFixed(2)}
													{" "}
													~ ¥
													{data.buy_point.price_high.toFixed(2)}
												</Text>
											</div>
											<Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0 }}>
												{data.buy_point.description}
											</Paragraph>
										</>
									)
									: (
										<Text type="secondary">暂无数据</Text>
									)}
							</Card>
						</Col>
						{/* Sell Point */}
						<Col xs={24} sm={8}>
							<Card
								bordered={false}
								style={{ borderRadius: 12, height: "100%" }}
								title={(
									<Space>
										<ArrowDownOutlined style={{ color: "#52c41a" }} />
										<Text strong>卖出价位</Text>
									</Space>
								)}
							>
								{data.sell_point?.price_low || data.sell_point?.price_high
									? (
										<>
											<div style={{ textAlign: "center", margin: "12px 0" }}>
												<Text style={{ fontSize: 24, fontWeight: "bold", color: "#52c41a" }}>
													¥
													{data.sell_point.price_low.toFixed(2)}
													{" "}
													~ ¥
													{data.sell_point.price_high.toFixed(2)}
												</Text>
											</div>
											<Paragraph type="secondary" style={{ textAlign: "center", marginBottom: 0 }}>
												{data.sell_point.description}
											</Paragraph>
										</>
									)
									: (
										<Text type="secondary">暂无数据</Text>
									)}
							</Card>
						</Col>
						{/* Stop Loss + Position */}
						<Col xs={24} sm={8}>
							<Card
								bordered={false}
								style={{ borderRadius: 12, height: "100%" }}
								title={(
									<Space>
										<ExclamationCircleOutlined style={{ color: "#faad14" }} />
										<Text strong>风控建议</Text>
									</Space>
								)}
							>
								{data.stop_loss?.price
									? (
										<div style={{ marginBottom: 12 }}>
											<Text type="secondary">止损价：</Text>
											<Text style={{ fontSize: 20, fontWeight: "bold", color: "#faad14" }}>
												¥
												{data.stop_loss.price.toFixed(2)}
											</Text>
											<br />
											<Text type="secondary" style={{ fontSize: 12 }}>
												{data.stop_loss.description}
											</Text>
										</div>
									)
									: null}
								{data.position_advice && (
									<div>
										<Text type="secondary">仓位建议：</Text>
										<Tag color="blue" style={{ fontWeight: "bold" }}>{data.position_advice}</Tag>
									</div>
								)}
								{!data.stop_loss?.price && !data.position_advice && (
									<Text type="secondary">暂无数据</Text>
								)}
							</Card>
						</Col>
					</Row>

					{/* Strategy Analysis Table */}
					{data.strategy_analysis && data.strategy_analysis.length > 0 && (
						<Card
							bordered={false}
							style={{ marginBottom: 24, borderRadius: 12 }}
							title={(
								<Space>
									<SearchOutlined style={{ color: "#722ed1" }} />
									<Text strong>七大战法逐一分析</Text>
									<Tag color="purple">
										{data.strategies_hit}
										/
										{data.strategies_total}
										{" "}
										命中
									</Tag>
								</Space>
							)}
						>
							<Table
								columns={strategyColumns}
								dataSource={data.strategy_analysis}
								rowKey="strategy"
								pagination={false}
								size="small"
								rowClassName={(record) => {
									if (record.signal === "看多")
										return "row-signal-bullish";
									if (record.signal === "看空")
										return "row-signal-bearish";
									return "";
								}}
							/>
						</Card>
					)}

					{/* Summary Report */}
					{data.summary && (
						<Card
							bordered={false}
							style={{ marginBottom: 24, borderRadius: 12, background: "#fafafa" }}
							title="📊 综合分析报告"
							extra={(
								<Space>
									{data.llm_enhanced
										? <Tag color="green" icon={<CheckCircleOutlined />}>AI增强</Tag>
										: <Tag color="orange">基础分析</Tag>}
									<Text type="secondary" style={{ fontSize: 12 }}>{data.analyzed_at}</Text>
								</Space>
							)}
						>
							<Paragraph style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8 }}>
								{data.summary}
							</Paragraph>
						</Card>
					)}

					{/* Fuzzy Match Warning */}
					{data.fuzzy_match && data.candidates && data.candidates.length > 1 && (
						<Alert
							type="info"
							showIcon
							message="模糊匹配提示"
							description={(
								<span>
									当前分析的是模糊匹配的第一个结果。其它候选股票：
									{data.candidates.slice(1, 5).map(c => (
										<Tag key={c.stock_code} style={{ marginLeft: 4 }}>
											{c.stock_name}
											(
											{c.stock_code}
											)
										</Tag>
									))}
								</span>
							)}
							style={{ marginBottom: 24, borderRadius: 8 }}
						/>
					)}
				</>
			)}

			<style>
				{`
				.row-signal-bullish {
					background-color: #fff1f0 !important;
				}
				.row-signal-bullish:hover > td {
					background-color: #ffccc7 !important;
				}
				.row-signal-bearish {
					background-color: #f6ffed !important;
				}
				.row-signal-bearish:hover > td {
					background-color: #d9f7be !important;
				}
				`}
			</style>
		</div>
	);
};

export default StockAnalysisPage;
