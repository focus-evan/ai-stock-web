import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { ipo } from "#src/router/extra-info";
import { lazy } from "react";

const IPO = lazy(() => import("#src/pages/ipo"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/ipo",
		Component: ContainerLayout,
		handle: {
			icon: "StockOutlined",
			title: "IPO数据",
			order: ipo,
			roles: ["admin", "user"],
		},
		children: [
			{
				path: "/ipo/list",
				Component: IPO,
				handle: {
					icon: "UnorderedListOutlined",
					title: "IPO列表",
					roles: ["admin", "user"],
				},
			},
		],
	},
];

export default routes;
