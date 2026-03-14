import type { AppRouteRecordRaw } from "#src/router/types";
import ContainerLayout from "#src/layout/container-layout";
import { system } from "#src/router/extra-info";

import { lazy } from "react";

const User = lazy(() => import("#src/pages/system/user"));
const Role = lazy(() => import("#src/pages/system/role"));
const Menu = lazy(() => import("#src/pages/system/menu"));
const DataSync = lazy(() => import("#src/pages/system/sync"));
const Cache = lazy(() => import("#src/pages/system/cache"));
const Monitor = lazy(() => import("#src/pages/system/monitor"));

const routes: AppRouteRecordRaw[] = [
	{
		path: "/system",
		Component: ContainerLayout,
		handle: {
			icon: "SettingOutlined",
			title: "系统管理",
			order: system,
		},
		children: [
			{
				path: "/system/user",
				Component: User,
				handle: {
					icon: "UserOutlined",
					title: "用户管理",
					permissions: [
						"permission:button:add",
						"permission:button:update",
						"permission:button:delete",
					],
				},
			},
			{
				path: "/system/role",
				Component: Role,
				handle: {
					icon: "TeamOutlined",
					title: "角色管理",
					permissions: [
						"permission:button:add",
						"permission:button:update",
						"permission:button:delete",
					],
				},
			},
			{
				path: "/system/menu",
				Component: Menu,
				handle: {
					icon: "MenuOutlined",
					title: "菜单管理",
					permissions: [
						"permission:button:add",
						"permission:button:update",
						"permission:button:delete",
					],
				},
			},
			{
				path: "/system/data-sync",
				Component: DataSync,
				handle: {
					icon: "SyncOutlined",
					title: "数据同步",
				},
			},
			{
				path: "/system/cache",
				Component: Cache,
				handle: {
					icon: "DatabaseOutlined",
					title: "缓存管理",
				},
			},
			{
				path: "/system/monitor",
				Component: Monitor,
				handle: {
					icon: "DashboardOutlined",
					title: "系统监控",
				},
			},
		],
	},
];

export default routes;
