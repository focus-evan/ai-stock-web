import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { industry } from "#src/router/extra-info";
import { lazy } from "react";

const IndustryAnalysis = lazy(() => import("#src/pages/industry"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/industry",
		Component: ContainerLayout,
		handle: {
			order: industry,
			title: "产业分析",
			icon: "AppstoreOutlined",
		},
		children: [
			{
				index: true,
				Component: IndustryAnalysis,
				handle: {
					title: "产业分析",
					icon: "AppstoreOutlined",
				},
			},
		],
	},
];

export default routes;
