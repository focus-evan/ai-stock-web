import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { about } from "#src/router/extra-info";

import { CopyrightOutlined } from "@ant-design/icons";
import { createElement, lazy } from "react";

const About = lazy(() => import("#src/pages/about"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/about",
		Component: ContainerLayout,
		handle: {
			order: about,
			title: "关于",
			icon: createElement(CopyrightOutlined),
		},
		children: [
			{
				index: true,
				Component: About,
				// lazy: async () => {
				// 	const About = await import("#src/pages/about");
				// 	return { Component: About.default };
				// },
				handle: {
					// roles: ["common"],
					title: "关于",
					icon: createElement(CopyrightOutlined),
				},
			},
		],
	},
];

export default routes;
