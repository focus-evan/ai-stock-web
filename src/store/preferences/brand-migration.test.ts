import { describe, expect, it } from "vitest";
import { migrateBrandPreferences } from "./index";

describe("existing preference migration", () => {
	it("updates the previous brand without resetting language or workspace", () => {
		const migrated = migrateBrandPreferences({ language: "en-US", theme: "dark", themeRadius: 6, themeColorPrimary: "#cf233e", sidebarCollapsed: true, tabbarEnable: false });
		expect(migrated).toMatchObject({ language: "en-US", theme: "dark", themeRadius: 12, themeColorPrimary: "#2563eb", builtinTheme: "blue", sidebarCollapsed: true, tabbarEnable: false });
	});
	it("handles missing storage and preserves a custom radius", () => {
		expect(migrateBrandPreferences(null).themeColorPrimary).toBe("#2563eb");
		expect(migrateBrandPreferences({ themeRadius: 8 }).themeRadius).toBe(8);
	});
	it("keeps a custom accent and light navigation", () => {
		expect(migrateBrandPreferences({ themeColorPrimary: "#722ed1", builtinTheme: "purple", sidebarTheme: "light" })).toMatchObject({ themeColorPrimary: "#722ed1", builtinTheme: "purple", sidebarTheme: "light" });
	});
});
