import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { home } from "#src/router/extra-info";
import { lazy } from "react";

const Home = lazy(() => import("#src/pages/home"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/home",
		Component: ContainerLayout,
		handle: {
			order: home,
			title: "首页",
			icon: "HomeOutlined",
		},
		children: [
			{
				index: true,
				Component: Home,
				handle: {
					title: "首页",
					icon: "HomeOutlined",
				},
			},
		],
	},
];

export default routes;
