import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { stockData } from "#src/router/extra-info";
import { lazy } from "react";

const Stocks = lazy(() => import("#src/pages/stock-data/stocks"));
const IPO = lazy(() => import("#src/pages/ipo"));
const Shareholders = lazy(() => import("#src/pages/stock-data/shareholders"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/stock-data",
		Component: ContainerLayout,
		handle: {
			icon: "LineChartOutlined",
			title: "common.menu.stockData",
			order: stockData,
		},
		children: [
			{
				path: "/stock-data/stocks",
				Component: Stocks,
				handle: {
					icon: "StockOutlined",
					title: "common.menu.stocks",
				},
			},
			{
				path: "/stock-data/ipo",
				Component: IPO,
				handle: {
					icon: "RiseOutlined",
					title: "common.menu.ipo",
				},
			},
			{
				path: "/stock-data/shareholders",
				Component: Shareholders,
				handle: {
					icon: "TeamOutlined",
					title: "common.menu.shareholders",
				},
			},
		],
	},
];

export default routes;
