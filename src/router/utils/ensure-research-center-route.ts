import type { AppRouteRecordRaw } from "#src/router/types";

/** Keep the bundled library reachable in both frontend and backend menu modes. */
export function ensureResearchCenterRoute(routes: AppRouteRecordRaw[], libraryRoutes: AppRouteRecordRaw[]): AppRouteRecordRaw[] {
	const containsLibrary = (items: AppRouteRecordRaw[]): boolean => items.some(item => item.path === "/research-center" || ("children" in item && item.children ? containsLibrary(item.children) : false));
	return containsLibrary(routes) ? routes : [...routes, ...libraryRoutes];
}
