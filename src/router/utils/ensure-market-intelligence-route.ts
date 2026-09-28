import type { AppRouteRecordRaw } from "#src/router/types";

export function ensureMarketIntelligenceRoute(routes: AppRouteRecordRaw[], intelligence: AppRouteRecordRaw[]): AppRouteRecordRaw[] {
	const contains = (items: AppRouteRecordRaw[]): boolean => items.some(item => item.path === "/market-intelligence" || ("children" in item && item.children ? contains(item.children) : false));
	return contains(routes) ? routes : [...routes, ...intelligence];
}
