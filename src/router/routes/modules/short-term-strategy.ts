import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";

import { shortTermStrategy } from "#src/router/extra-info";
import { lazy } from "react";

const DragonHead = lazy(() => import("#src/pages/short-term-strategy/dragon-head"));
const Auction = lazy(() => import("#src/pages/short-term-strategy/auction"));
const Sentiment = lazy(() => import("#src/pages/short-term-strategy/sentiment"));
const EventDriven = lazy(() => import("#src/pages/short-term-strategy/event-driven"));
const Breakthrough = lazy(() => import("#src/pages/short-term-strategy/breakthrough"));
const VolumePrice = lazy(() => import("#src/pages/short-term-strategy/volume-price"));
const Overnight = lazy(() => import("#src/pages/short-term-strategy/overnight"));
const MovingAverage = lazy(() => import("#src/pages/short-term-strategy/moving-average"));
const Combined = lazy(() => import("#src/pages/short-term-strategy/combined"));
const Northbound = lazy(() => import("#src/pages/short-term-strategy/northbound"));
const TrendMomentum = lazy(() => import("#src/pages/short-term-strategy/trend-momentum"));
const StockAnalysis = lazy(() => import("#src/pages/short-term-strategy/stock-analysis"));
const Portfolio = lazy(() => import("#src/pages/short-term-strategy/portfolio"));
const Review = lazy(() => import("#src/pages/short-term-strategy/review"));
const Relay = lazy(() => import("#src/pages/short-term-strategy/relay"));

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
				path: "/short-term-strategy/relay",
				Component: Relay,
				handle: {
					icon: "ThunderboltOutlined",
					title: "连板接力",
				},
			},
			{
				path: "/short-term-strategy/auction",
				Component: Auction,
				handle: {
					icon: "FieldTimeOutlined",
					title: "竞价战法",
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
				path: "/short-term-strategy/breakthrough",
				Component: Breakthrough,
				handle: {
					icon: "RocketOutlined",
					title: "突破战法",
				},
			},
			{
				path: "/short-term-strategy/volume-price",
				Component: VolumePrice,
				handle: {
					icon: "BarChartOutlined",
					title: "量价关系",
				},
			},
			{
				path: "/short-term-strategy/overnight",
				Component: Overnight,
				handle: {
					icon: "MoonOutlined",
					title: "隔夜施工法",
				},
			},
			{
				path: "/short-term-strategy/moving-average",
				Component: MovingAverage,
				handle: {
					icon: "LineChartOutlined",
					title: "均线战法",
				},
			},
			{
				path: "/short-term-strategy/northbound",
				Component: Northbound,
				handle: {
					icon: "BankOutlined",
					title: "北向资金",
				},
			},
			{
				path: "/short-term-strategy/trend-momentum",
				Component: TrendMomentum,
				handle: {
					icon: "StockOutlined",
					title: "趋势动量",
				},
			},
			{
				path: "/short-term-strategy/combined",
				Component: Combined,
				handle: {
					icon: "MergeCellsOutlined",
					title: "综合战法",
				},
			},
			{
				path: "/short-term-strategy/stock-analysis",
				Component: StockAnalysis,
				handle: {
					icon: "SearchOutlined",
					title: "个股分析",
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
