import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { lazy } from "react";

const Page = lazy(() => import("#src/pages/market-intelligence"));
const routes: AppRouteRecordRaw[] = [{
	path: "/market-intelligence",
	Component: ContainerLayout,
	handle: { title: "每日重点情报", icon: "ReadOutlined", order: 2.1 },
	children: [{ index: true, Component: Page, handle: { title: "每日重点情报", icon: "ReadOutlined" } }],
}];
export default routes;
