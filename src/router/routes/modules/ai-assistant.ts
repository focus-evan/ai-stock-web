import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { aiAssistant } from "#src/router/extra-info";
import { lazy } from "react";

const QA = lazy(() => import("#src/pages/ai-assistant/qa"));
const SmartTable = lazy(() => import("#src/pages/ai-assistant/smart-table"));
const Documents = lazy(() => import("#src/pages/ai-assistant/documents"));
const Sessions = lazy(() => import("#src/pages/ai-assistant/sessions"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/ai-assistant",
		Component: ContainerLayout,
		handle: {
			icon: "RobotOutlined",
			title: "AI助手",
			order: aiAssistant,
		},
		children: [
			{
				path: "/ai-assistant/qa",
				Component: QA,
				handle: {
					icon: "CommentOutlined",
					title: "智能问答",
				},
			},
			{
				path: "/ai-assistant/smart-table",
				Component: SmartTable,
				handle: {
					icon: "TableOutlined",
					title: "智能表格",
				},
			},
			{
				path: "/ai-assistant/documents",
				Component: Documents,
				handle: {
					icon: "FileTextOutlined",
					title: "文档管理",
				},
			},
			{
				path: "/ai-assistant/sessions",
				Component: Sessions,
				handle: {
					icon: "HistoryOutlined",
					title: "会话管理",
				},
			},
		],
	},
];

export default routes;
