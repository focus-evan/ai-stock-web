import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { lazy } from "react";

const Page = lazy(() => import("#src/pages/institutional-research"));
const routes: AppRouteRecordRaw[] = [{
	path: "/institutional-research",
	Component: ContainerLayout,
	handle: { title: "机构观点与消息", icon: "ReadOutlined", order: 2.2 },
	children: [{ index: true, Component: Page, handle: { title: "机构观点与消息", icon: "ReadOutlined" } }],
}];
export default routes;
