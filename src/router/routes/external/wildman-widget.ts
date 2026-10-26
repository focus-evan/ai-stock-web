import type { AppRouteRecordRaw } from "#src/router/types";
import { lazy } from "react";

const WildmanWidget = lazy(() => import("#src/pages/wildman-widget"));
// No application shell or route-driven user-info fetch. The component guards its own data.
const routes: AppRouteRecordRaw[] = [{ path: "/wildman-widget", Component: WildmanWidget, handle: { hideInMenu: true, title: "野人每日实战" } }];
export default routes;
