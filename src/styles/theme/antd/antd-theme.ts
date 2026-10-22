import type { ThemeConfig } from "antd";
import { BRAND_PRIMARY } from "../brand";

const sharedComponents: ThemeConfig["components"] = {
	Button: { fontWeight: 600, controlHeight: 36, controlHeightLG: 44, primaryShadow: "0 4px 12px rgba(37,99,235,.18)" },
	Card: { headerFontSize: 16, headerHeight: 54, paddingLG: 20 },
	Table: { cellPaddingBlock: 13, cellPaddingInline: 16, headerBorderRadius: 12, fontSize: 13 },
	Tabs: { titleFontSize: 14, titleFontSizeLG: 16, horizontalItemGutter: 28 },
	Statistic: { titleFontSize: 13, contentFontSize: 28 },
	Input: { controlHeight: 36, activeShadow: "0 0 0 3px rgba(37,99,235,.10)" },
	Select: { controlHeight: 36 },
	Modal: { borderRadiusLG: 16, titleFontSize: 18 },
	Menu: {
		itemHeight: 42,
		itemMarginBlock: 5,
		itemBorderRadius: 9,
		darkItemBg: "#0d1c31",
		darkSubMenuItemBg: "#0b1729",
		darkItemColor: "#b8c9df",
		darkItemSelectedBg: "#183e66",
		darkItemHoverBg: "#162d49",
		darkItemSelectedColor: "#fff",
	},
};

export const customAntdLightTheme: ThemeConfig = {
	token: {
		colorPrimary: BRAND_PRIMARY,
		colorLink: "#1d4ed8",
		colorLinkHover: BRAND_PRIMARY,
		colorText: "#172b45",
		colorTextSecondary: "#61738b",
		colorTextTertiary: "#72839a",
		colorBgLayout: "#f0f4f9",
		colorBgContainer: "#ffffff",
		colorBorder: "#d0dce9",
		colorBorderSecondary: "#dfe7f1",
		fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
		fontSize: 14,
		lineHeight: 1.65,
		boxShadowSecondary: "0 8px 28px rgba(20,44,78,.08)",
	},
	components: {
		...sharedComponents,
		Table: { ...sharedComponents.Table, headerBg: "#f5f8fc", headerColor: "#526982", rowHoverBg: "#f1f6ff" },
		Segmented: { trackBg: "#e8eef6", itemSelectedBg: "#fff", itemSelectedColor: "#1d4ed8" },
	},
};

export const customAntdDarkTheme: ThemeConfig = {
	token: {
		colorPrimary: BRAND_PRIMARY,
		colorLink: "#79a7ff",
		colorLinkHover: "#a8c8ff",
		colorPrimaryText: "#8db5ff",
		colorPrimaryTextHover: "#bed6ff",
		colorPrimaryTextActive: "#79a7ff",
		colorText: "#e6edf7",
		colorTextSecondary: "#9badc6",
		colorTextTertiary: "#8297b2",
		colorBgLayout: "#0a1322",
		colorBgContainer: "#101e32",
		colorBgElevated: "#16263d",
		colorBorder: "#334a67",
		colorBorderSecondary: "#25374f",
		fontSize: 14,
		lineHeight: 1.65,
		boxShadowSecondary: "0 8px 28px rgba(0,0,0,.25)",
	},
	components: {
		...sharedComponents,
		Table: { ...sharedComponents.Table, headerBg: "#16263d", headerColor: "#c0d1e7", rowHoverBg: "#173252" },
		Tabs: { ...sharedComponents.Tabs, itemSelectedColor: "#8db5ff", itemHoverColor: "#bed6ff", itemActiveColor: "#79a7ff" },
		Segmented: { trackBg: "#0c1728", itemSelectedBg: "#1d3d63", itemSelectedColor: "#a8c8ff" },
	},
};
