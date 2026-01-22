import type { FreeStyleCard, FreeStyleCardsResponse, FreeStyleParams, FreeStyleResponse } from "#src/api/rag";
import { freeStyle, freeStyleCards } from "#src/api/rag";
import { BasicContent } from "#src/components/basic-content";
import { BulbOutlined, CheckCircleOutlined, CreditCardOutlined, ExclamationCircleOutlined, MessageOutlined, QuestionCircleOutlined, RobotOutlined, RocketOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, Col, Empty, Input, message, Row, Spin, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./styles.css";

const { TextArea } = Input;

// 普通问答消息类型
interface TextMessage {
	id: string
	role: "user" | "assistant"
	content: string
	metadata?: {
		prompt_tokens: number
		completion_tokens: number
		response_time_ms: number
		model_name: string
	}
	timestamp: Date
}

// 卡片问答消息类型
interface CardsMessage {
	id: string
	role: "user" | "assistant"
	content: string
	cards?: FreeStyleCard[]
	metadata?: {
		prompt_tokens: number
		completion_tokens: number
		response_time_ms: number
		model_name: string
	}
	timestamp: Date
}

// 卡片类型配置
const cardTypeConfig: Record<string, { icon: React.ReactNode, color: string, bgColor: string, title: string }> = {
	ConclusionCard: {
		icon: <CheckCircleOutlined />,
		color: "#52c41a",
		bgColor: "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)",
		title: "结论",
	},
	ReasonCard: {
		icon: <BulbOutlined />,
		color: "#1890ff",
		bgColor: "linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)",
		title: "理由",
	},
	NextStepCard: {
		icon: <RocketOutlined />,
		color: "#722ed1",
		bgColor: "linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%)",
		title: "下一步",
	},
	QuestionCard: {
		icon: <QuestionCircleOutlined />,
		color: "#faad14",
		bgColor: "linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)",
		title: "问题",
	},
};

// 置信度标签配置
const confidenceConfig: Record<string, { color: string, text: string }> = {
	HIGH: { color: "#52c41a", text: "高置信度" },
	MEDIUM: { color: "#faad14", text: "中置信度" },
	LOW: { color: "#ff4d4f", text: "低置信度" },
};

export default function FreeStylePage() {
	const { t } = useTranslation();
	const [textMessages, setTextMessages] = useState<TextMessage[]>([]);
	const [cardsMessages, setCardsMessages] = useState<CardsMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	// 为了兼容第三方接口要求，session_id 需要始终有值
	const [textSessionId, setTextSessionId] = useState<string>(() => `session_text_${Date.now()}`);
	const [cardsSessionId, setCardsSessionId] = useState<string>(() => `session_cards_${Date.now()}`);
	const [userId] = useState<string>(() => `user_${Date.now()}`);
	const textMessagesEndRef = useRef<HTMLDivElement>(null);
	const cardsMessagesEndRef = useRef<HTMLDivElement>(null);

	// 自由问答请求
	const { loading: textLoading, run: sendTextQuery } = useRequest(
		async (question: string) => {
			const params: FreeStyleParams = {
				question,
				session_id: textSessionId,
				user_id: userId,
				similarity_top_k: 3,
			};
			return await freeStyle(params);
		},
		{
			manual: true,
			onSuccess: (data: FreeStyleResponse) => {
				if (data.session_id) {
					setTextSessionId(data.session_id);
				}
				const assistantMessage: TextMessage = {
					id: data.request_id || Date.now().toString(),
					role: "assistant",
					content: data.answer,
					metadata: {
						prompt_tokens: data.prompt_tokens,
						completion_tokens: data.completion_tokens,
						response_time_ms: data.response_time_ms,
						model_name: data.model_name,
					},
					timestamp: new Date(),
				};
				setTextMessages(prev => [...prev, assistantMessage]);
			},
			onError: (error) => {
				message.error(t("ai.queryFailed", { defaultValue: "自由问答查询失败" }));
				console.error("Text query error:", error);
			},
		},
	);

	// 卡片问答请求
	const { loading: cardsLoading, run: sendCardsQuery } = useRequest(
		async (question: string) => {
			const params: FreeStyleParams = {
				question,
				session_id: cardsSessionId,
				user_id: userId,
				similarity_top_k: 3,
			};
			return await freeStyleCards(params);
		},
		{
			manual: true,
			onSuccess: (data: FreeStyleCardsResponse) => {
				if (data.session_id) {
					setCardsSessionId(data.session_id);
				}
				const assistantMessage: CardsMessage = {
					id: data.request_id || Date.now().toString(),
					role: "assistant",
					content: "",
					cards: data.cards,
					metadata: {
						prompt_tokens: data.prompt_tokens,
						completion_tokens: data.completion_tokens,
						response_time_ms: data.response_time_ms,
						model_name: data.model_name,
					},
					timestamp: new Date(),
				};
				setCardsMessages(prev => [...prev, assistantMessage]);
			},
			onError: (error) => {
				message.error(t("ai.queryFailed", { defaultValue: "卡片问答查询失败" }));
				console.error("Cards query error:", error);
			},
		},
	);

	const loading = textLoading || cardsLoading;

	const scrollToBottom = () => {
		textMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		cardsMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [textMessages, cardsMessages]);

	const handleSend = () => {
		if (!inputValue.trim()) {
			return;
		}

		const timestamp = new Date();
		const msgId = Date.now().toString();

		// 添加用户消息到两个历史记录
		const userTextMessage: TextMessage = {
			id: `text-${msgId}`,
			role: "user",
			content: inputValue,
			timestamp,
		};
		const userCardsMessage: CardsMessage = {
			id: `cards-${msgId}`,
			role: "user",
			content: inputValue,
			timestamp,
		};

		setTextMessages(prev => [...prev, userTextMessage]);
		setCardsMessages(prev => [...prev, userCardsMessage]);

		// 同时发送两个请求
		sendTextQuery(inputValue);
		sendCardsQuery(inputValue);
		setInputValue("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleClearSession = () => {
		setTextMessages([]);
		setCardsMessages([]);
		setTextSessionId(`session_text_${Date.now()}`);
		setCardsSessionId(`session_cards_${Date.now()}`);
		message.success(t("ai.sessionCleared", { defaultValue: "会话已清空" }));
	};

	// 渲染卡片内容
	const renderCardContent = (card: FreeStyleCard, cardIndex: number) => {
		const config = cardTypeConfig[card.type] || {
			icon: <CreditCardOutlined />,
			color: "#999",
			bgColor: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
			title: card.type,
		};

		return (
			<div
				key={`card-${cardIndex}-${card.type}`}
				className="styled-card"
				style={{
					background: config.bgColor,
					borderLeft: `4px solid ${config.color}`,
				}}
			>
				<div className="styled-card-header">
					<Tag color={config.color} icon={config.icon} className="styled-card-tag">
						{config.title}
					</Tag>
					{card.confidence_tag && confidenceConfig[card.confidence_tag] && (
						<Tag
							color={confidenceConfig[card.confidence_tag].color}
							icon={<ExclamationCircleOutlined />}
							className="confidence-tag"
						>
							{confidenceConfig[card.confidence_tag].text}
						</Tag>
					)}
				</div>

				<div className="styled-card-body">
					{card.type === "ConclusionCard" && card.title && (
						<div className="card-title-text">{card.title}</div>
					)}

					{card.type === "ReasonCard" && card.reasons && card.reasons.length > 0 && (
						<ul className="reasons-list">
							{card.reasons.map((reason, idx) => (
								<li key={`reason-${idx}`} className="reason-item">
									<span className="reason-number">{idx + 1}</span>
									<span className="reason-text">{reason}</span>
								</li>
							))}
						</ul>
					)}

					{card.type === "NextStepCard" && (
						<div className="next-step-content">
							{card.action && (
								<div className="action-section">
									<div className="section-label">
										<RocketOutlined />
										{" "}
										行动建议
									</div>
									<div className="section-content">{card.action}</div>
								</div>
							)}
							{card.what_to_check && (
								<div className="check-section">
									<div className="section-label">
										<CheckCircleOutlined />
										{" "}
										核对要点
									</div>
									<div className="section-content">{card.what_to_check}</div>
								</div>
							)}
						</div>
					)}

					{card.type === "QuestionCard" && card.question && (
						<div className="question-content">
							<QuestionCircleOutlined className="question-icon" />
							<span className="question-text">{card.question}</span>
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderCards = (cards: FreeStyleCard[]) => {
		if (!cards || cards.length === 0) {
			return null;
		}
		return (
			<div className="cards-wrapper">
				{cards.map((card, index) => renderCardContent(card, index))}
			</div>
		);
	};

	return (
		<BasicContent>
			<Card
				title={(
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<MessageOutlined />
						{t("ai.freeStyle", { defaultValue: "自由问答" })}
					</div>
				)}
				extra={(
					<Button onClick={handleClearSession} disabled={textMessages.length === 0 && cardsMessages.length === 0}>
						{t("ai.clearSession", { defaultValue: "清空会话" })}
					</Button>
				)}
				style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}
				bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}
			>
				{/* 分栏展示区域 */}
				<div className="split-container">
					<Row gutter={16} style={{ flex: 1, margin: 0, height: "100%" }}>
						{/* 左侧：自由问答历史 */}
						<Col span={12} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
							<div className="panel-header">
								<MessageOutlined />
								{" "}
								自由问答
							</div>
							<div className="qa-messages-container panel-content">
								{textMessages.length === 0
									? (
										<Empty
											description="暂无对话记录"
											style={{ marginTop: "30%" }}
										/>
									)
									: (
										textMessages.map(msg => (
											<div key={msg.id} className={`qa-message qa-message-${msg.role}`}>
												<div className="qa-message-avatar">
													{msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
												</div>
												<div className="qa-message-content">
													{msg.role === "assistant"
														? (
															<div className="qa-message-text qa-message-text-markdown">
																<ReactMarkdown remarkPlugins={[remarkGfm]}>
																	{msg.content}
																</ReactMarkdown>
															</div>
														)
														: (
															<div className="qa-message-text" style={{ whiteSpace: "pre-wrap" }}>
																{msg.content}
															</div>
														)}
													{msg.metadata && (
														<div className="qa-message-metadata">
															<span>
																{msg.metadata.model_name}
															</span>
															<span>
																{msg.metadata.response_time_ms}
																ms
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
								{textLoading && (
									<div className="qa-message qa-message-assistant">
										<div className="qa-message-avatar">
											<RobotOutlined />
										</div>
										<div className="qa-message-content">
											<Spin size="small" />
										</div>
									</div>
								)}
								<div ref={textMessagesEndRef} />
							</div>
						</Col>

						{/* 右侧：卡片问答历史 */}
						<Col span={12} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
							<div className="panel-header panel-header-cards">
								<CreditCardOutlined />
								{" "}
								卡片问答
							</div>
							<div className="qa-messages-container panel-content">
								{cardsMessages.length === 0
									? (
										<Empty
											description="暂无对话记录"
											style={{ marginTop: "30%" }}
										/>
									)
									: (
										cardsMessages.map(msg => (
											<div key={msg.id} className={`qa-message qa-message-${msg.role}`}>
												<div className="qa-message-avatar">
													{msg.role === "user" ? <UserOutlined /> : <RobotOutlined />}
												</div>
												<div className="qa-message-content">
													{msg.role === "assistant"
														? (
															<>
																{msg.cards && renderCards(msg.cards)}
															</>
														)
														: (
															<div className="qa-message-text" style={{ whiteSpace: "pre-wrap" }}>
																{msg.content}
															</div>
														)}
													{msg.metadata && (
														<div className="qa-message-metadata">
															<span>
																{msg.metadata.model_name}
															</span>
															<span>
																{msg.metadata.response_time_ms}
																ms
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
								{cardsLoading && (
									<div className="qa-message qa-message-assistant">
										<div className="qa-message-avatar">
											<RobotOutlined />
										</div>
										<div className="qa-message-content">
											<Spin size="small" />
										</div>
									</div>
								)}
								<div ref={cardsMessagesEndRef} />
							</div>
						</Col>
					</Row>
				</div>

				{/* 统一输入区域 */}
				<div style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}>
					<div style={{ display: "flex", gap: 8 }}>
						<TextArea
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder={t("ai.freeStylePlaceholder", { defaultValue: "请输入您的问题，将同时获取两种回答..." })}
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
