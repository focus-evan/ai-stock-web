import type { AppRouteRecordRaw } from "#src/router/types";

export function removeDuplicateRoutes(routes: AppRouteRecordRaw[]) {
	const routeMap = new Map<string, AppRouteRecordRaw>();

	for (const route of routes) {
		const path = route.path;
		if (!path)
			continue;

		if (routeMap.has(path)) {
			const existingRoute = routeMap.get(path)!;
			if (route.children && route.children.length > 0) {
				existingRoute.children = existingRoute.children || [];
				existingRoute.children.push(...route.children);
				// 递归去重子路由
				existingRoute.children = removeDuplicateRoutes(existingRoute.children);
			}
		}
		else {
			routeMap.set(path, route);
		}
	}

	return [...routeMap.values()];
}
