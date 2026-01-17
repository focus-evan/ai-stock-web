import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { aiAssistant } from "#src/router/extra-info";
import { lazy } from "react";

const QA = lazy(() => import("#src/pages/ai-assistant/qa"));
const Documents = lazy(() => import("#src/pages/ai-assistant/documents"));
const Sessions = lazy(() => import("#src/pages/ai-assistant/sessions"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/ai-assistant",
		Component: ContainerLayout,
		handle: {
			icon: "RobotOutlined",
			title: "common.menu.aiAssistant",
			order: aiAssistant,
		},
		children: [
			{
				path: "/ai-assistant/qa",
				Component: QA,
				handle: {
					icon: "CommentOutlined",
					title: "common.menu.qa",
				},
			},
			{
				path: "/ai-assistant/documents",
				Component: Documents,
				handle: {
					icon: "FileTextOutlined",
					title: "common.menu.documents",
				},
			},
			{
				path: "/ai-assistant/sessions",
				Component: Sessions,
				handle: {
					icon: "HistoryOutlined",
					title: "common.menu.sessions",
				},
			},
		],
	},
];

export default routes;
