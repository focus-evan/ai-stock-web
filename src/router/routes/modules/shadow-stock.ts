import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { shadowStock } from "#src/router/extra-info";
import { lazy } from "react";

const ShadowStock = lazy(() => import("#src/pages/shadow-stock"));
const ShadowStockAggregate = lazy(() => import("#src/pages/shadow-stock/aggregate"));
const ShadowStockRecommend = lazy(() => import("#src/pages/shadow-stock/recommend"));

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
			{
				path: "/shadow-stock/recommend",
				Component: ShadowStockRecommend,
				handle: {
					icon: "StarOutlined",
					title: "每日推荐",
				},
			},
			{
				path: "/shadow-stock/aggregate",
				Component: ShadowStockAggregate,
				handle: {
					icon: "DatabaseOutlined",
					title: "历史聚合",
				},
			},
		],
	},
];

export default routes;
