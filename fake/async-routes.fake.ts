import { about, aiAssistant, home, personalCenter, stockData, system } from "#/src/router/extra-info";
import { defineFakeRoute } from "vite-plugin-fake-server/client";
import { resultSuccess } from "./utils";

/**
 * roles：页面级别权限，这里模拟二种 "admin"、"common"
 * admin：管理员角色
 * common：普通角色
 */

const systemManagementRouter = {
	path: "/system",
	handle: {
		icon: "SettingOutlined",
		title: "common.menu.system",
		order: system,
		roles: ["admin"],
	},
	children: [
		{
			path: "/system/user",
			component: "/system/user/index.tsx",
			handle: {
				icon: "UserOutlined",
				title: "common.menu.user",
				roles: ["admin"],
				permissions: [
					"permission:button:add",
					"permission:button:update",
					"permission:button:delete",
				],
			},
		},
		{
			path: "/system/role",
			component: "/system/role/index.tsx",
			handle: {
				icon: "TeamOutlined",
				title: "common.menu.role",
				roles: ["admin"],
				permissions: [
					"permission:button:add",
					"permission:button:update",
					"permission:button:delete",
				],
			},
		},
		{
			path: "/system/menu",
			component: "/system/menu/index.tsx",
			handle: {
				icon: "MenuOutlined",
				title: "common.menu.menu",
				roles: ["admin"],
				permissions: [
					"permission:button:add",
					"permission:button:update",
					"permission:button:delete",
				],
			},
		},
		{
			path: "/system/dept",
			component: "/system/dept/index.tsx",
			handle: {
				keepAlive: false,
				icon: "ApartmentOutlined",
				title: "common.menu.dept",
				roles: ["admin"],
				permissions: [
					"permission:button:add",
					"permission:button:update",
					"permission:button:delete",
				],
			},
		},
	],
};

const homeRouter = {
	path: "/home",
	component: "/home/index.tsx",
	handle: {
		icon: "HomeOutlined",
		title: "common.menu.home",
		order: home,
	},
};

const aiAssistantRouter = {
	path: "/ai-assistant",
	handle: {
		icon: "RobotOutlined",
		title: "common.menu.aiAssistant",
		order: aiAssistant,
	},
	children: [
		{
			path: "/ai-assistant/qa",
			component: "/ai-assistant/qa/index.tsx",
			handle: {
				icon: "CommentOutlined",
				title: "common.menu.qa",
			},
		},
		{
			path: "/ai-assistant/documents",
			component: "/ai-assistant/documents/index.tsx",
			handle: {
				icon: "FileTextOutlined",
				title: "common.menu.documents",
			},
		},
		{
			path: "/ai-assistant/sessions",
			component: "/ai-assistant/sessions/index.tsx",
			handle: {
				icon: "HistoryOutlined",
				title: "common.menu.sessions",
			},
		},
	],
};

const stockDataRouter = {
	path: "/stock-data",
	handle: {
		icon: "LineChartOutlined",
		title: "common.menu.stockData",
		order: stockData,
	},
	children: [
		{
			path: "/stock-data/stocks",
			component: "/stock-data/stocks/index.tsx",
			handle: {
				icon: "StockOutlined",
				title: "common.menu.stocks",
			},
		},
		{
			path: "/stock-data/ipo",
			component: "/ipo/index.tsx",
			handle: {
				icon: "RiseOutlined",
				title: "common.menu.ipo",
			},
		},
		{
			path: "/stock-data/shareholders",
			component: "/stock-data/shareholders/index.tsx",
			handle: {
				icon: "TeamOutlined",
				title: "common.menu.shareholders",
			},
		},
	],
};

const aboutRouter = {
	path: "/about",
	component: "/about/index.tsx",
	handle: {
		icon: "CopyrightOutlined",
		title: "common.menu.about",
		order: about,
	},
};

const personalCenterRouter = {
	path: "/personal-center",
	handle: {
		order: personalCenter,
		title: "common.menu.personalCenter",
		icon: "RiAccountCircleLine",
	},
	children: [
		{
			path: "/personal-center/my-profile",
			handle: {
				title: "common.menu.profile",
				icon: "ProfileCardIcon",
			},
		},
		{
			path: "/personal-center/settings",
			handle: {
				title: "common.menu.settings",
				icon: "RiUserSettingsLine",
			},
		},
	],
};

export default defineFakeRoute([
	{
		url: "/get-async-routes",
		timeout: 1000,
		method: "get",
		response: () => {
			return resultSuccess(
				[
					homeRouter,
					aiAssistantRouter,
					stockDataRouter,
					aboutRouter,
					systemManagementRouter,
					personalCenterRouter,
				],
			);
		},
	},
]);
