import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { aiAssistant } from "#src/router/extra-info";
import { lazy } from "react";

const QA = lazy(() => import("#src/pages/ai-assistant/qa"));
const SmartTable = lazy(() => import("#src/pages/ai-assistant/smart-table"));
const Documents = lazy(() => import("#src/pages/ai-assistant/documents"));
const Sessions = lazy(() => import("#src/pages/ai-assistant/sessions"));
const FreeStyle = lazy(() => import("#src/pages/ai-assistant/free-style"));
const FreeStyleCards = lazy(() => import("#src/pages/ai-assistant/free-style-cards"));

// 菜单显示配置：通过该配置控制是否展示 AI 助手各子菜单
// 当前默认只展示「财富三张表互动Demo-大脑能力」（智能表格）、「自由问答」（已合并卡片问答功能）
const aiAssistantMenuConfig = {
	showQA: false,
	showSmartTable: true,
	showFreeStyle: true,
	showFreeStyleCards: false, // 已合并到自由问答页面
	showDocuments: false,
	showSessions: false,
} satisfies Record<string, boolean>;

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
			// 智能问答
			...(aiAssistantMenuConfig.showQA
				? [{
					path: "/ai-assistant/qa",
					Component: QA,
					handle: {
						icon: "CommentOutlined",
						title: "智能问答",
					},
				}] as AppRouteRecordRaw[]
				: []),

			// 财富三张表互动Demo-大脑能力（原智能表格）
			...(aiAssistantMenuConfig.showSmartTable
				? [{
					path: "/ai-assistant/smart-table",
					Component: SmartTable,
					handle: {
						icon: "TableOutlined",
						title: "财富三张表互动Demo-大脑能力",
					},
				}] as AppRouteRecordRaw[]
				: []),

			// 自由问答
			...(aiAssistantMenuConfig.showFreeStyle
				? [{
					path: "/ai-assistant/free-style",
					Component: FreeStyle,
					handle: {
						icon: "MessageOutlined",
						title: "自由问答",
					},
				}] as AppRouteRecordRaw[]
				: []),

			// 自由卡片问答
			...(aiAssistantMenuConfig.showFreeStyleCards
				? [{
					path: "/ai-assistant/free-style-cards",
					Component: FreeStyleCards,
					handle: {
						icon: "CreditCardOutlined",
						title: "自由卡片问答",
					},
				}] as AppRouteRecordRaw[]
				: []),

			// 文档管理
			...(aiAssistantMenuConfig.showDocuments
				? [{
					path: "/ai-assistant/documents",
					Component: Documents,
					handle: {
						icon: "FileTextOutlined",
						title: "文档管理",
					},
				}] as AppRouteRecordRaw[]
				: []),

			// 会话管理
			...(aiAssistantMenuConfig.showSessions
				? [{
					path: "/ai-assistant/sessions",
					Component: Sessions,
					handle: {
						icon: "HistoryOutlined",
						title: "会话管理",
					},
				}] as AppRouteRecordRaw[]
				: []),
		],
	},
];

export default routes;
