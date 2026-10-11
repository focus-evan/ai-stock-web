import type { AppRouteRecordRaw } from "#src/router/types";

/** Authenticated shared research; preserve explicitly configured route restrictions. */
export function ensureInstitutionalResearchRoute(routes: AppRouteRecordRaw[], research: AppRouteRecordRaw[]): AppRouteRecordRaw[] {
	const contains = (items: AppRouteRecordRaw[]): boolean => items.some(item => item.path === "/institutional-research" || ("children" in item && item.children ? contains(item.children) : false));
	return contains(routes) ? routes : [...routes, ...research];
}
