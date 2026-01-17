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
		title: "系统管理",
		order: system,
		roles: ["admin"],
	},
	children: [
		{
			path: "/system/user",
			component: "/system/user/index.tsx",
			handle: {
				icon: "UserOutlined",
				title: "用户管理",
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
				title: "角色管理",
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
				title: "菜单管理",
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
				title: "部门管理",
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
		title: "首页",
		order: home,
	},
};

const aiAssistantRouter = {
	path: "/ai-assistant",
	handle: {
		icon: "RobotOutlined",
		title: "AI助手",
		order: aiAssistant,
	},
	children: [
		{
			path: "/ai-assistant/qa",
			component: "/ai-assistant/qa/index.tsx",
			handle: {
				icon: "CommentOutlined",
				title: "智能问答",
			},
		},
		{
			path: "/ai-assistant/documents",
			component: "/ai-assistant/documents/index.tsx",
			handle: {
				icon: "FileTextOutlined",
				title: "文档管理",
			},
		},
		{
			path: "/ai-assistant/sessions",
			component: "/ai-assistant/sessions/index.tsx",
			handle: {
				icon: "HistoryOutlined",
				title: "会话管理",
			},
		},
	],
};

const stockDataRouter = {
	path: "/stock-data",
	handle: {
		icon: "LineChartOutlined",
		title: "股票数据",
		order: stockData,
	},
	children: [
		{
			path: "/stock-data/stocks",
			component: "/stock-data/stocks/index.tsx",
			handle: {
				icon: "StockOutlined",
				title: "股票查询",
			},
		},
		{
			path: "/stock-data/ipo",
			component: "/ipo/index.tsx",
			handle: {
				icon: "RiseOutlined",
				title: "IPO数据",
			},
		},
		{
			path: "/stock-data/shareholders",
			component: "/stock-data/shareholders/index.tsx",
			handle: {
				icon: "TeamOutlined",
				title: "股东信息",
			},
		},
	],
};

const aboutRouter = {
	path: "/about",
	component: "/about/index.tsx",
	handle: {
		icon: "CopyrightOutlined",
		title: "关于",
		order: about,
	},
};

const personalCenterRouter = {
	path: "/personal-center",
	handle: {
		order: personalCenter,
		title: "个人中心",
		icon: "RiAccountCircleLine",
	},
	children: [
		{
			path: "/personal-center/my-profile",
			handle: {
				title: "我的资料",
				icon: "ProfileCardIcon",
			},
		},
		{
			path: "/personal-center/settings",
			handle: {
				title: "设置",
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
