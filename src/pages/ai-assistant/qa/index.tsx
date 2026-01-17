import type { RAGQuery, RAGResponse } from "#src/api/rag";
import { ragQuery } from "#src/api/rag";
import { BasicContent } from "#src/components/basic-content";
import { CloudOutlined, CloudServerOutlined, RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, Empty, Input, message, Space, Spin, Switch, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./styles.css";

const { TextArea } = Input;

interface Message {
	id: string
	role: "user" | "assistant"
	content: string
	sources?: Array<{
		content: string
		metadata: {
			file_name: string
			page?: number
		}
		score: number
	}>
	timestamp: Date
}

export default function QAPage() {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [sessionId, setSessionId] = useState<string>("");
	const [isOnlineMode, setIsOnlineMode] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { loading, run: sendQuery } = useRequest(
		async (query: string) => {
			const params: RAGQuery = {
				query,
				session_id: sessionId || undefined,
				use_online: isOnlineMode,
			};
			return await ragQuery(params);
		},
		{
			manual: true,
			onSuccess: (data: RAGResponse) => {
				// Update session ID
				if (data.session_id && !sessionId) {
					setSessionId(data.session_id);
				}

				// Add assistant message
				const assistantMessage: Message = {
					id: data.request_id || Date.now().toString(),
					role: "assistant",
					content: data.answer,
					sources: data.sources,
					timestamp: new Date(),
				};
				setMessages(prev => [...prev, assistantMessage]);
			},
			onError: (error) => {
				message.error(t("ai.queryFailed", { defaultValue: "Query failed" }));
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
		message.success(t("ai.sessionCleared", { defaultValue: "Session cleared" }));
	};

	return (
		<BasicContent>
			<Card
				title={(
					<Space>
						<RobotOutlined />
						{t("ai.intelligentQA", { defaultValue: "Intelligent Q&A" })}
					</Space>
				)}
				extra={(
					<Space>
						<Switch
							checked={isOnlineMode}
							onChange={setIsOnlineMode}
							checkedChildren={<CloudOutlined />}
							unCheckedChildren={<CloudServerOutlined />}
						/>
						<span>{isOnlineMode ? t("ai.onlineMode", { defaultValue: "Online" }) : t("ai.offlineMode", { defaultValue: "Offline" })}</span>
						<Button onClick={handleClearSession} disabled={messages.length === 0}>
							{t("ai.clearSession", { defaultValue: "Clear Session" })}
						</Button>
					</Space>
				)}
				style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}
				bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}
			>
				<div className="qa-messages-container" style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
					{messages.length === 0
						? (
							<Empty
								description={t("ai.startConversation", { defaultValue: "Start a conversation" })}
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
										<div className="qa-message-text">{msg.content}</div>
										{msg.sources && msg.sources.length > 0 && (
											<div className="qa-message-sources">
												<div style={{ marginBottom: 8, fontWeight: 500 }}>
													{t("ai.sources", { defaultValue: "Sources" })}
													:
												</div>
												{msg.sources.map((source, idx) => (
													<Tag key={`${msg.id}-source-${idx}`} color="blue" style={{ marginBottom: 4 }}>
														{source.metadata.file_name}
														{source.metadata.page && ` (Page ${source.metadata.page})`}
														{" - "}
														{(source.score * 100).toFixed(1)}
														%
													</Tag>
												))}
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
					<Space.Compact style={{ width: "100%" }}>
						<TextArea
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder={t("ai.inputPlaceholder", { defaultValue: "Type your question..." })}
							autoSize={{ minRows: 1, maxRows: 4 }}
							disabled={loading}
						/>
						<Button
							type="primary"
							icon={<SendOutlined />}
							onClick={handleSend}
							loading={loading}
							disabled={!inputValue.trim()}
						>
							{t("ai.send", { defaultValue: "Send" })}
						</Button>
					</Space.Compact>
				</div>
			</Card>
		</BasicContent>
	);
}
