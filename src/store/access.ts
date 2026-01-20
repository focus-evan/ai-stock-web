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
 * 菜单白名单配置：控制最终在侧边菜单中展示哪些一级菜单
 * 当前默认只展示 AI 助手和其下的「财富三张表互动Demo-大脑能力」
 */
const MENU_WHITELIST: string[] = ["/ai-assistant"];

function filterMenusByWhitelist(menus: MenuItemType[]): MenuItemType[] {
	// 只保留在白名单中的一级菜单，其子菜单结构保持不变
	return menus.filter(menu => MENU_WHITELIST.includes(menu.key));
}

const initialState: AccessState = {
	wholeMenus: filterMenusByWhitelist(generateMenuItemsFromRoutes(baseRoutes)),
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
		const wholeMenus = filterMenusByWhitelist(generateMenuItemsFromRoutes(newRoutes));
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
