import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { mobileStrategy } from "#src/router/extra-info";
import { lazy } from "react";

const MobileDragonHead = lazy(() => import("#src/pages/mobile-strategy/dragon-head"));
const MobileSentiment = lazy(() => import("#src/pages/mobile-strategy/sentiment"));
const MobileEventDriven = lazy(() => import("#src/pages/mobile-strategy/event-driven"));
const MobileBreakthrough = lazy(() => import("#src/pages/mobile-strategy/breakthrough"));
const MobileVolumePrice = lazy(() => import("#src/pages/mobile-strategy/volume-price"));
const MobileAuction = lazy(() => import("#src/pages/mobile-strategy/auction"));
const MobileMovingAverage = lazy(() => import("#src/pages/mobile-strategy/moving-average"));
const MobileNorthbound = lazy(() => import("#src/pages/mobile-strategy/northbound"));
const MobileTrendMomentum = lazy(() => import("#src/pages/mobile-strategy/trend-momentum"));
const MobileCombined = lazy(() => import("#src/pages/mobile-strategy/combined"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/mobile-strategy",
		Component: ContainerLayout,
		handle: {
			icon: "MobileOutlined",
			title: "短线战法(移动版)",
			order: mobileStrategy,
		},
		children: [
			{
				path: "/mobile-strategy/dragon-head",
				Component: MobileDragonHead,
				handle: {
					icon: "CrownOutlined",
					title: "龙头战法",
				},
			},
			{
				path: "/mobile-strategy/sentiment",
				Component: MobileSentiment,
				handle: {
					icon: "HeartOutlined",
					title: "情绪战法",
				},
			},
			{
				path: "/mobile-strategy/event-driven",
				Component: MobileEventDriven,
				handle: {
					icon: "RadarChartOutlined",
					title: "事件驱动",
				},
			},
			{
				path: "/mobile-strategy/breakthrough",
				Component: MobileBreakthrough,
				handle: {
					icon: "RocketOutlined",
					title: "突破战法",
				},
			},
			{
				path: "/mobile-strategy/volume-price",
				Component: MobileVolumePrice,
				handle: {
					icon: "BarChartOutlined",
					title: "量价关系",
				},
			},
			{
				path: "/mobile-strategy/auction",
				Component: MobileAuction,
				handle: {
					icon: "FieldTimeOutlined",
					title: "竞价/尾盘",
				},
			},
			{
				path: "/mobile-strategy/moving-average",
				Component: MobileMovingAverage,
				handle: {
					icon: "LineChartOutlined",
					title: "均线战法",
				},
			},
			{
				path: "/mobile-strategy/northbound",
				Component: MobileNorthbound,
				handle: {
					icon: "BankOutlined",
					title: "北向资金",
				},
			},
			{
				path: "/mobile-strategy/trend-momentum",
				Component: MobileTrendMomentum,
				handle: {
					icon: "StockOutlined",
					title: "趋势动量",
				},
			},
			{
				path: "/mobile-strategy/combined",
				Component: MobileCombined,
				handle: {
					icon: "MergeCellsOutlined",
					title: "综合战法",
				},
			},
		],
	},
];

export default routes;
