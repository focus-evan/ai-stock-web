import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { valueInvesting } from "#src/router/extra-info";
import { lazy } from "react";

const MoatValue = lazy(() => import("#src/pages/value-investing/moat-value"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/value-investing",
		Component: ContainerLayout,
		handle: {
			icon: "SafetyOutlined",
			title: "价值投资",
			order: valueInvesting,
		},
		children: [
			{
				path: "/value-investing/moat-value",
				Component: MoatValue,
				handle: {
					icon: "CrownOutlined",
					title: "护城河优选",
				},
			},
		],
	},
];

export default routes;
