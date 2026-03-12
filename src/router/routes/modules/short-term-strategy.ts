import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { shortTermStrategy } from "#src/router/extra-info";
import { lazy } from "react";

const DragonHead = lazy(() => import("#src/pages/short-term-strategy/dragon-head"));
const Sentiment = lazy(() => import("#src/pages/short-term-strategy/sentiment"));
const EventDriven = lazy(() => import("#src/pages/short-term-strategy/event-driven"));
const Portfolio = lazy(() => import("#src/pages/short-term-strategy/portfolio"));
const Review = lazy(() => import("#src/pages/short-term-strategy/review"));

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
			{
				path: "/short-term-strategy/event-driven",
				Component: EventDriven,
				handle: {
					icon: "RadarChartOutlined",
					title: "事件驱动",
				},
			},
			{
				path: "/short-term-strategy/portfolio",
				Component: Portfolio,
				handle: {
					icon: "FundOutlined",
					title: "模拟交易",
				},
			},
			{
				path: "/short-term-strategy/review",
				Component: Review,
				handle: {
					icon: "BookOutlined",
					title: "每日复盘",
				},
			},
		],
	},
];

export default routes;
