import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { shadowStock } from "#src/router/extra-info";
import { lazy } from "react";

const ShadowStock = lazy(() => import("#src/pages/shadow-stock"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/shadow-stock",
		Component: ContainerLayout,
		handle: {
			icon: "RocketOutlined",
			title: "影子股套利",
			order: shadowStock,
		},
		children: [
			{
				path: "/shadow-stock/dashboard",
				Component: ShadowStock,
				handle: {
					icon: "FundOutlined",
					title: "影子股仪表盘",
				},
			},
		],
	},
];

export default routes;
