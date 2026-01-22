import type { FreeStyleParams, FreeStyleResponse } from "#src/api/rag";
import { freeStyle } from "#src/api/rag";
import { BasicContent } from "#src/components/basic-content";
import { MessageOutlined, RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, Empty, Input, message, Spin } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./styles.css";

const { TextArea } = Input;

interface Message {
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

export default function FreeStylePage() {
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
			return await freeStyle(params);
		},
		{
			manual: true,
			onSuccess: (data: FreeStyleResponse) => {
				// Update session ID
				if (data.session_id) {
					setSessionId(data.session_id);
				}

				// Add assistant message
				const assistantMessage: Message = {
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
								description={t("ai.startFreeStyleInput", { defaultValue: "请输入您的问题开始自由问答" })}
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
												<div className="qa-message-text qa-message-text-markdown">
													<ReactMarkdown
														remarkPlugins={[remarkGfm]}
													>
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
							placeholder={t("ai.freeStylePlaceholder", { defaultValue: "请输入您的问题..." })}
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
