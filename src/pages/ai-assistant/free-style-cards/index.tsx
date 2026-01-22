import type { FreeStyleCard, FreeStyleCardsResponse, FreeStyleParams } from "#src/api/rag";
import { freeStyleCards } from "#src/api/rag";
import { BasicContent } from "#src/components/basic-content";
import { BulbOutlined, CheckCircleOutlined, CreditCardOutlined, ExclamationCircleOutlined, QuestionCircleOutlined, RobotOutlined, RocketOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, Empty, Input, message, Spin, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./styles.css";

const { TextArea } = Input;

interface Message {
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

export default function FreeStyleCardsPage() {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	// 为了兼容第三方接口要求，session_id 需要始终有值，首次请求也带上
	const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}`);
	const [userId] = useState<string>(() => `user_${Date.now()}`);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { loading, run: sendQuery } = useRequest(
		async (question: string) => {
			const params: FreeStyleParams = {
				question,
				// 第三方接口期望始终存在 session_id 字段，这里强制携带
				session_id: sessionId,
				user_id: userId,
				similarity_top_k: 3,
			};
			return await freeStyleCards(params);
		},
		{
			manual: true,
			onSuccess: (data: FreeStyleCardsResponse) => {
				// Update session ID
				if (data.session_id) {
					setSessionId(data.session_id);
				}

				// Add assistant message
				const assistantMessage: Message = {
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
		setSessionId(`session_${Date.now()}`);
		message.success(t("ai.sessionCleared", { defaultValue: "会话已清空" }));
	};

	// 渲染单个卡片内容
	const renderCardContent = (card: FreeStyleCard) => {
		const config = cardTypeConfig[card.type] || {
			icon: <CreditCardOutlined />,
			color: "#999",
			bgColor: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
			title: card.type,
		};

		return (
			<div
				key={`${card.type}-${Math.random()}`}
				className="styled-card"
				style={{
					background: config.bgColor,
					borderLeft: `4px solid ${config.color}`,
				}}
			>
				{/* 卡片头部 */}
				<div className="styled-card-header">
					<Tag
						color={config.color}
						icon={config.icon}
						className="styled-card-tag"
					>
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

				{/* 卡片主体内容 */}
				<div className="styled-card-body">
					{/* ConclusionCard: 显示标题 */}
					{card.type === "ConclusionCard" && card.title && (
						<div className="card-title-text">
							{card.title}
						</div>
					)}

					{/* ReasonCard: 显示理由列表 */}
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

					{/* NextStepCard: 显示行动和检查要点 */}
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

					{/* QuestionCard: 显示问题 */}
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
				{cards.map(card => renderCardContent(card))}
			</div>
		);
	};

	return (
		<BasicContent>
			<Card
				title={(
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<CreditCardOutlined />
						{t("ai.freeStyleCards", { defaultValue: "自由卡片问答" })}
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
								description={t("ai.startFreeStyleCardsInput", { defaultValue: "请输入您的问题，AI 将以卡片形式回复" })}
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
							placeholder={t("ai.freeStyleCardsPlaceholder", { defaultValue: "请输入您的问题..." })}
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
