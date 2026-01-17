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
			title: "股票数据",
			order: stockData,
		},
		children: [
			{
				path: "/stock-data/stocks",
				Component: Stocks,
				handle: {
					icon: "StockOutlined",
					title: "股票查询",
				},
			},
			{
				path: "/stock-data/ipo",
				Component: IPO,
				handle: {
					icon: "RiseOutlined",
					title: "IPO数据",
				},
			},
			{
				path: "/stock-data/shareholders",
				Component: Shareholders,
				handle: {
					icon: "TeamOutlined",
					title: "股东信息",
				},
			},
		],
	},
];

export default routes;
