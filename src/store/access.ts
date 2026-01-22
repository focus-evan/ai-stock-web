import type { MenuItemType } from "#src/layout/layout-menu/types";
import type { AppRouteRecordRaw } from "#src/router/types";

import { rootRoute, router } from "#src/router";
import { ROOT_ROUTE_ID } from "#src/router/constants";
import { baseRoutes } from "#src/router/routes";
import { ascending } from "#src/router/utils/ascending";
import { flattenRoutes } from "#src/router/utils/flatten-routes";
import { generateMenuItemsFromRoutes } from "#src/router/utils/generate-menu-items-from-routes";

import { create } from "zustand";

interface AccessState {
	// 路由菜单
	wholeMenus: MenuItemType[]
	// 有权限的 React Router 路由
	routeList: AppRouteRecordRaw[]
	// 扁平化后的路由，路由 id 作为索引 key
	flatRouteList: Record<string, AppRouteRecordRaw>
	// 是否获取到权限
	isAccessChecked: boolean
}

/**
 * 菜单显示配置（允许列表）：控制最终在侧边菜单中展示哪些菜单
 * - 一级菜单：只展示 AI 助手
 * - AI 助手下：展示「财富三张表互动Demo-大脑能力」、「自由问答」、「自由卡片问答」
 *
 * 说明：即使后端动态菜单返回了「智能问答/文档管理/会话管理」，这里也会统一过滤掉。
 */
const MENU_ALLOWLIST: Record<string, true | Record<string, true>> = {
	"/ai-assistant": {
		"/ai-assistant/smart-table": true,
		"/ai-assistant/free-style": true,
		"/ai-assistant/free-style-cards": true,
	},
};

function filterMenusByAllowlist(menus: MenuItemType[], allowlist: Record<string, true | Record<string, true>>): MenuItemType[] {
	return menus
		.filter(menu => Object.prototype.hasOwnProperty.call(allowlist, menu.key))
		.map((menu) => {
			const rule = allowlist[menu.key];
			// 一级菜单允许但不限制子菜单
			if (rule === true) {
				return menu;
			}
			// 限制子菜单（递归过滤）
			const childAllowlist = rule ?? {};
			return {
				...menu,
				children: Array.isArray(menu.children) ? filterMenusByAllowlist(menu.children, childAllowlist) : menu.children,
			};
		});
}

const initialState: AccessState = {
	wholeMenus: filterMenusByAllowlist(generateMenuItemsFromRoutes(baseRoutes), MENU_ALLOWLIST),
	routeList: baseRoutes,
	flatRouteList: flattenRoutes(baseRoutes),
	isAccessChecked: false,
};

interface AccessAction {
	setAccessStore: (routes: AppRouteRecordRaw[]) => AccessState
	reset: () => void
};

export const useAccessStore = create<AccessState & AccessAction>(set => ({
	...initialState,

	setAccessStore: (routes) => {
		const newRoutes = ascending([...baseRoutes, ...routes]);
		/* 添加新的路由到根路由 */
		router.patchRoutes(ROOT_ROUTE_ID, routes);
		const flatRouteList = flattenRoutes(newRoutes);
		const wholeMenus = filterMenusByAllowlist(generateMenuItemsFromRoutes(newRoutes), MENU_ALLOWLIST);
		const newState = {
			wholeMenus,
			routeList: newRoutes,
			flatRouteList,
			isAccessChecked: true,
		};
		set(() => newState);
		return newState;
	},

	reset: () => {
		/* 移除动态路由 */
		router._internalSetRoutes(rootRoute);
		set(initialState);
	},
}));
