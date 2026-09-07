import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { lazy } from "react";

const ResearchCenter = lazy(() => import("#src/pages/research-center"));
const routes: AppRouteRecordRaw[] = [{
	path: "/research-center",
	Component: ContainerLayout,
	handle: { title: "研究与知识库", icon: "BookOutlined", order: 2 },
	children: [{ index: true, Component: ResearchCenter, handle: { title: "研究与知识库", icon: "BookOutlined" } }],
}];
export default routes;
