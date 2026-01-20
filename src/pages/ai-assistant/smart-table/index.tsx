import type { TableInputParams, TableInputResponse } from "#src/api/rag";
import { tableInput } from "#src/api/rag";
import { BasicContent } from "#src/components/basic-content";
import { RobotOutlined, SendOutlined, TableOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, Col, Empty, Input, message, Row, Spin, Statistic } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./styles.css";

const { TextArea } = Input;

interface Message {
	id: string
	role: "user" | "assistant"
	content: string
	tableData?: {
		collected: any
		next_question?: string
		step?: number
		table?: string
	}
	metadata?: {
		prompt_tokens: number
		completion_tokens: number
		response_time_ms: number
		model_name: string
	}
	timestamp: Date
}

export default function SmartTablePage() {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	// 为了兼容第三方接口要求，session_id 需要始终有值，首次请求也带上
	const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}`);
	const [userId] = useState<string>(() => `user_${Date.now()}`);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { loading, run: sendQuery } = useRequest(
		async (question: string) => {
			const params: TableInputParams = {
				question,
				// 第三方接口期望始终存在 session_id 字段，这里强制携带
				session_id: sessionId,
				user_id: userId,
				similarity_top_k: 3,
			};
			return await tableInput(params);
		},
		{
			manual: true,
			onSuccess: (data: TableInputResponse) => {
				// Update session ID
				if (data.session_id) {
					setSessionId(data.session_id);
				}

				// Parse hidden_json from answer if exists
				let tableData: any;
				let cleanAnswer = data.answer;

				const jsonMatch = data.answer.match(/<hidden_json>([\s\S]*?)<\/hidden_json>/);
				if (jsonMatch) {
					try {
						const jsonContent = jsonMatch[1].trim();
						tableData = JSON.parse(jsonContent);
						// Remove hidden_json from display
						cleanAnswer = data.answer.replace(/<hidden_json>[\s\S]*?<\/hidden_json>/g, "").trim();
					}
					catch (error) {
						console.error("Failed to parse hidden_json:", error);
					}
				}

				// Add assistant message
				const assistantMessage: Message = {
					id: data.request_id || Date.now().toString(),
					role: "assistant",
					content: cleanAnswer,
					tableData,
					metadata: {
						prompt_tokens: data.prompt_tokens,
						completion_tokens: data.completion_tokens,
						response_time_ms: data.response_time_ms,
						model_name: data.model_name,
					},
					timestamp: new Date(),
				};
				setMessages(prev => [...prev, assistantMessage]);
			},
			onError: (error) => {
				message.error(t("ai.queryFailed", { defaultValue: "查询失败" }));
				console.error("Query error:", error);
			},
		},
	);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSend = () => {
		if (!inputValue.trim()) {
			return;
		}

		// Add user message
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: inputValue,
			timestamp: new Date(),
		};
		setMessages(prev => [...prev, userMessage]);

		// Send query
		sendQuery(inputValue);
		setInputValue("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleClearSession = () => {
		setMessages([]);
		setSessionId("");
		message.success(t("ai.sessionCleared", { defaultValue: "会话已清空" }));
	};

	const renderTableData = (tableData: any) => {
		if (!tableData || !tableData.collected) {
			return null;
		}

		const { collected } = tableData;

		return (
			<div className="table-data-container">
				<div className="table-header">
					<TableOutlined style={{ marginRight: 8 }} />
					<strong>{tableData.table || "本金盘点表"}</strong>
					{tableData.step && (
						<span style={{ marginLeft: 8, color: "#999" }}>
							步骤
							{tableData.step}
						</span>
					)}
				</div>

				<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
					{/* 房产信息 */}
					{collected.real_estate && (
						<Col span={24}>
							<Card size="small" title="房产信息" type="inner">
								<Statistic
									title="房产数量"
									value={collected.real_estate.count || 0}
									suffix="套"
								/>
								{collected.real_estate.mortgage !== undefined && (
									<Statistic
										title="房贷"
										value={collected.real_estate.mortgage}
										prefix="¥"
									/>
								)}
							</Card>
						</Col>
					)}

					{/* 现金资产 */}
					{collected.cash_available_cny !== undefined && (
						<Col xs={24} sm={12}>
							<Card size="small" type="inner">
								<Statistic
									title="可动用现金"
									value={collected.cash_available_cny / 10000}
									precision={2}
									suffix="万元"
									valueStyle={{ color: "#3f8600" }}
								/>
							</Card>
						</Col>
					)}

					{/* 投资资产 */}
					{collected.investment_assets && collected.investment_assets.length > 0 && (
						<Col xs={24} sm={12}>
							<Card size="small" title="投资资产" type="inner">
								{collected.investment_assets.map((asset: any, idx: number) => (
									<Statistic
										key={`${asset.type}-${idx}`}
										title={asset.type === "stock" ? "股票" : asset.type}
										value={asset.amount_cny / 10000}
										precision={2}
										suffix="万元"
										valueStyle={{ color: "#1890ff" }}
									/>
								))}
							</Card>
						</Col>
					)}

					{/* 月收入 */}
					{collected.monthly_income_cny !== null && collected.monthly_income_cny !== undefined && (
						<Col xs={24} sm={12}>
							<Card size="small" type="inner">
								<Statistic
									title="月收入"
									value={collected.monthly_income_cny}
									prefix="¥"
									valueStyle={{ color: "#52c41a" }}
								/>
							</Card>
						</Col>
					)}

					{/* 月支出 */}
					{collected.monthly_expense_cny !== null && collected.monthly_expense_cny !== undefined && (
						<Col xs={24} sm={12}>
							<Card size="small" type="inner">
								<Statistic
									title="月支出"
									value={collected.monthly_expense_cny}
									prefix="¥"
									valueStyle={{ color: "#cf1322" }}
								/>
							</Card>
						</Col>
					)}

					{/* 支出明细 */}
					{collected.monthly_expense_breakdown && Object.keys(collected.monthly_expense_breakdown).some((key: string) => collected.monthly_expense_breakdown[key] !== null) && (
						<Col span={24}>
							<Card size="small" title="支出明细" type="inner">
								<Row gutter={[8, 8]}>
									{collected.monthly_expense_breakdown.elder_support !== null && (
										<Col xs={12} sm={6}>
											<Statistic
												title="赡养"
												value={collected.monthly_expense_breakdown.elder_support}
												prefix="¥"
												valueStyle={{ fontSize: 14 }}
											/>
										</Col>
									)}
									{collected.monthly_expense_breakdown.children !== null && (
										<Col xs={12} sm={6}>
											<Statistic
												title="孩子"
												value={collected.monthly_expense_breakdown.children}
												prefix="¥"
												valueStyle={{ fontSize: 14 }}
											/>
										</Col>
									)}
									{collected.monthly_expense_breakdown.food_housing_transport !== null && (
										<Col xs={12} sm={6}>
											<Statistic
												title="吃住行"
												value={collected.monthly_expense_breakdown.food_housing_transport}
												prefix="¥"
												valueStyle={{ fontSize: 14 }}
											/>
										</Col>
									)}
									{collected.monthly_expense_breakdown.other !== null && (
										<Col xs={12} sm={6}>
											<Statistic
												title="其他"
												value={collected.monthly_expense_breakdown.other}
												prefix="¥"
												valueStyle={{ fontSize: 14 }}
											/>
										</Col>
									)}
								</Row>
							</Card>
						</Col>
					)}
				</Row>

				{/* 下一步问题 */}
				{tableData.next_question && (
					<div className="next-question">
						<strong>下一步：</strong>
						{" "}
						{tableData.next_question}
					</div>
				)}
			</div>
		);
	};

	return (
		<BasicContent>
			<Card
				title={(
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<TableOutlined />
						{t("ai.smartTable", { defaultValue: "财富三张表互动Demo-大脑能力" })}
					</div>
				)}
				extra={(
					<Button onClick={handleClearSession} disabled={messages.length === 0}>
						{t("ai.clearSession", { defaultValue: "清空会话" })}
					</Button>
				)}
				style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}
				bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}
			>
				<div className="qa-messages-container" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
					{messages.length === 0
						? (
							<Empty
								description={t("ai.startTableInput", { defaultValue: "开始填写财务规划表格" })}
								style={{ marginTop: "20%" }}
							/>
						)
						: (
							messages.map(msg => (
								<div key={msg.id} className={`qa-message qa-message-${msg.role}`}>
									<div className="qa-message-avatar">
										{msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
									</div>
									<div className="qa-message-content">
										<div className="qa-message-text" style={{ whiteSpace: "pre-wrap" }}>
											{msg.content}
										</div>
										{msg.tableData && renderTableData(msg.tableData)}
										{msg.metadata && (
											<div className="qa-message-metadata">
												<span>
													模型:
													{msg.metadata.model_name}
												</span>
												<span>
													耗时:
													{msg.metadata.response_time_ms}
													ms
												</span>
												<span>
													Tokens:
													{msg.metadata.prompt_tokens + msg.metadata.completion_tokens}
												</span>
											</div>
										)}
										<div className="qa-message-time">
											{msg.timestamp.toLocaleTimeString()}
										</div>
									</div>
								</div>
							))
						)}
					{loading && (
						<div className="qa-message qa-message-assistant">
							<div className="qa-message-avatar">
								<RobotOutlined />
							</div>
							<div className="qa-message-content">
								<Spin size="small" />
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<div style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}>
					<div style={{ display: "flex", gap: 8 }}>
						<TextArea
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							// 默认不展示具体提示词，由上方交互引导
							placeholder={t("ai.tableInputPlaceholder", { defaultValue: "" })}
							autoSize={{ minRows: 1, maxRows: 4 }}
							disabled={loading}
							style={{ flex: 1 }}
						/>
						<Button
							type="primary"
							icon={<SendOutlined />}
							onClick={handleSend}
							loading={loading}
							disabled={!inputValue.trim()}
						>
							{t("ai.send", { defaultValue: "发送" })}
						</Button>
					</div>
				</div>
			</Card>
		</BasicContent>
	);
}
