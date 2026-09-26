import type { ThemeConfig } from "antd";
import { BRAND_PRIMARY } from "../brand";

const sharedComponents: ThemeConfig["components"] = {
	Button: { fontWeight: 600, controlHeight: 36, controlHeightLG: 44, primaryShadow: "0 4px 12px rgba(207,35,62,.18)" },
	Card: { headerFontSize: 16, headerHeight: 54, paddingLG: 20 },
	Table: { cellPaddingBlock: 13, cellPaddingInline: 16, headerBorderRadius: 12, fontSize: 13 },
	Tabs: { titleFontSize: 14, titleFontSizeLG: 16, horizontalItemGutter: 28 },
	Statistic: { titleFontSize: 13, contentFontSize: 28 },
	Input: { controlHeight: 36, activeShadow: "0 0 0 3px rgba(207,35,62,.10)" },
	Select: { controlHeight: 36 },
	Modal: { borderRadiusLG: 16, titleFontSize: 18 },
	Menu: {
		itemHeight: 42,
		itemMarginBlock: 5,
		itemBorderRadius: 9,
		darkItemBg: "#1c1920",
		darkSubMenuItemBg: "#17151b",
		darkItemColor: "#c7c1cb",
		darkItemSelectedBg: "#cf233e",
		darkItemHoverBg: "#32222c",
		darkItemSelectedColor: "#fff",
	},
};

export const customAntdLightTheme: ThemeConfig = {
	token: {
		colorPrimary: BRAND_PRIMARY,
		colorLink: "#b31d35",
		colorLinkHover: BRAND_PRIMARY,
		colorText: "#20232b",
		colorTextSecondary: "#656874",
		colorTextTertiary: "#777b87",
		colorBgLayout: "#f4f5f8",
		colorBgContainer: "#ffffff",
		colorBorder: "#dce0e7",
		colorBorderSecondary: "#eaecf1",
		fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif",
		fontSize: 14,
		lineHeight: 1.65,
		boxShadowSecondary: "0 8px 28px rgba(28,25,32,.08)",
	},
	components: {
		...sharedComponents,
		Table: { ...sharedComponents.Table, headerBg: "#f7f8fa", headerColor: "#525662", rowHoverBg: "#fff7f8" },
		Segmented: { trackBg: "#edeff3", itemSelectedBg: "#fff", itemSelectedColor: "#b31d35" },
	},
};

export const customAntdDarkTheme: ThemeConfig = {
	token: {
		colorPrimary: BRAND_PRIMARY,
		colorLink: "#ff8797",
		colorLinkHover: "#ffadba",
		colorPrimaryText: "#ff9bac",
		colorPrimaryTextHover: "#ffc3ce",
		colorPrimaryTextActive: "#ff8797",
		colorText: "#f0eef3",
		colorTextSecondary: "#b1adba",
		colorTextTertiary: "#9691a2",
		colorBgLayout: "#111216",
		colorBgContainer: "#1c1d24",
		colorBgElevated: "#24252e",
		colorBorder: "#41404c",
		colorBorderSecondary: "#34343f",
		fontSize: 14,
		lineHeight: 1.65,
		boxShadowSecondary: "0 8px 28px rgba(0,0,0,.25)",
	},
	components: {
		...sharedComponents,
		Table: { ...sharedComponents.Table, headerBg: "#25252f", headerColor: "#d0cbd8", rowHoverBg: "#34242e" },
		Tabs: { ...sharedComponents.Tabs, itemSelectedColor: "#ff9bac", itemHoverColor: "#ffc3ce", itemActiveColor: "#ff8797" },
		Segmented: { trackBg: "#15151b", itemSelectedBg: "#3e2732", itemSelectedColor: "#ffadba" },
	},
};
