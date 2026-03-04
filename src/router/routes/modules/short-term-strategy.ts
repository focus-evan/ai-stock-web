import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { shortTermStrategy } from "#src/router/extra-info";
import { lazy } from "react";

const DragonHead = lazy(() => import("#src/pages/short-term-strategy/dragon-head"));
const Sentiment = lazy(() => import("#src/pages/short-term-strategy/sentiment"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/short-term-strategy",
		Component: ContainerLayout,
		handle: {
			icon: "ThunderboltOutlined",
			title: "短线战法",
			order: shortTermStrategy,
		},
		children: [
			{
				path: "/short-term-strategy/dragon-head",
				Component: DragonHead,
				handle: {
					icon: "CrownOutlined",
					title: "龙头战法",
				},
			},
			{
				path: "/short-term-strategy/sentiment",
				Component: Sentiment,
				handle: {
					icon: "HeartOutlined",
					title: "情绪战法",
				},
			},
		],
	},
];

export default routes;
