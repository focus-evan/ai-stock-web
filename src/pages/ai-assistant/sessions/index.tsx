import type { SessionInfo } from "#src/api/rag";
import { clearSessionMemory } from "#src/api/rag";
import { deleteSession, getAllSessions } from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	ClearOutlined,
	DeleteOutlined,
	MessageOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Button, Card, message, Popconfirm, Space, Table, Tag } from "antd";
import { useTranslation } from "react-i18next";

export default function SessionsPage() {
	const { t } = useTranslation();

	// Fetch sessions
	const {
		data: sessionsResponse,
		loading: sessionsLoading,
		refresh: refreshSessions,
	} = useRequest(getAllSessions);

	const sessions = sessionsResponse?.sessions || [];

	// Delete session
	const { run: handleDelete } = useRequest(
		async (sessionId: string) => {
			return await deleteSession(sessionId);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("ai.sessionDeleted", { defaultValue: "Session deleted" }));
				refreshSessions();
			},
			onError: (error) => {
				message.error(t("ai.sessionDeleteFailed", { defaultValue: "Failed to delete session" }));
				console.error("Delete session error:", error);
			},
		},
	);

	// Clear session
	const { run: handleClear } = useRequest(
		async (sessionId: string) => {
			return await clearSessionMemory(sessionId);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("ai.sessionCleared", { defaultValue: "Session cleared" }));
				refreshSessions();
			},
			onError: (error) => {
				message.error(t("ai.sessionClearFailed", { defaultValue: "Failed to clear session" }));
				console.error("Clear session error:", error);
			},
		},
	);

	const columns = [
		{
			title: t("ai.sessionId", { defaultValue: "Session ID" }),
			dataIndex: "session_id",
			key: "session_id",
			render: (text: string) => (
				<Space>
					<MessageOutlined />
					<code>
						{text.substring(0, 8)}
						...
					</code>
				</Space>
			),
		},
		{
			title: t("ai.messageCount", { defaultValue: "Messages" }),
			dataIndex: "message_count",
			key: "message_count",
			render: (count: number) => <Tag color="blue">{count}</Tag>,
		},
		{
			title: t("ai.createdAt", { defaultValue: "Created At" }),
			dataIndex: "created_at",
			key: "created_at",
			render: (text: string) => new Date(text).toLocaleString(),
		},
		{
			title: t("ai.lastActivity", { defaultValue: "Last Activity" }),
			dataIndex: "last_activity",
			key: "last_activity",
			render: (text: string) => {
				const date = new Date(text);
				const now = new Date();
				const diffMs = now.getTime() - date.getTime();
				const diffMins = Math.floor(diffMs / 60000);
				const diffHours = Math.floor(diffMins / 60);
				const diffDays = Math.floor(diffHours / 24);

				if (diffMins < 1)
					return t("ai.justNow", { defaultValue: "Just now" });
				if (diffMins < 60)
					return t("ai.minutesAgo", { defaultValue: `${diffMins} minutes ago`, count: diffMins });
				if (diffHours < 24)
					return t("ai.hoursAgo", { defaultValue: `${diffHours} hours ago`, count: diffHours });
				return t("ai.daysAgo", { defaultValue: `${diffDays} days ago`, count: diffDays });
			},
		},
		{
			title: t("ai.status", { defaultValue: "Status" }),
			dataIndex: "status",
			key: "status",
			render: (status: string) => {
				const colorMap: { [key: string]: string } = {
					active: "success",
					inactive: "default",
				};
				return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
			},
		},
		{
			title: t("common.action", { defaultValue: "Action" }),
			key: "action",
			render: (_: any, record: SessionInfo) => (
				<Space>
					<Popconfirm
						title={t("ai.confirmClearSession", { defaultValue: "Clear session memory?" })}
						description={t("ai.clearSessionDesc", { defaultValue: "This will clear all messages in this session" })}
						onConfirm={() => handleClear(record.session_id)}
					>
						<Button type="link" icon={<ClearOutlined />}>
							{t("ai.clear", { defaultValue: "Clear" })}
						</Button>
					</Popconfirm>
					<Popconfirm
						title={t("ai.confirmDeleteSession", { defaultValue: "Delete this session?" })}
						description={t("ai.deleteSessionDesc", { defaultValue: "This action cannot be undone" })}
						onConfirm={() => handleDelete(record.session_id)}
					>
						<Button type="link" danger icon={<DeleteOutlined />}>
							{t("common.delete", { defaultValue: "Delete" })}
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<BasicContent>
			<Card
				title={(
					<Space>
						<MessageOutlined />
						{t("ai.sessionManagement", { defaultValue: "Session Management" })}
					</Space>
				)}
				extra={(
					<Button icon={<ReloadOutlined />} onClick={refreshSessions}>
						{t("common.refresh", { defaultValue: "Refresh" })}
					</Button>
				)}
			>
				<Table
					columns={columns}
					dataSource={sessions}
					loading={sessionsLoading}
					rowKey="session_id"
					pagination={{
						total: sessionsResponse?.total || 0,
						pageSize: 10,
						showSizeChanger: true,
						showTotal: total => t("common.total", { defaultValue: `Total ${total} items`, total }),
					}}
				/>
			</Card>
		</BasicContent>
	);
}
