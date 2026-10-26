/** URLs used outside React Router (static manuals, iframe src and top-level links). */
export function appRouteHref(route: string) {
	return import.meta.env.VITE_ROUTER_MODE === "hash" ? `/#${route}` : route;
}
