import { describe, expect, it } from "vitest";
import { migrateBrandPreferences } from "./index";

describe("existing preference migration", () => {
	it("moves old blue clients to red without resetting their language or workspace", () => {
		const migrated = migrateBrandPreferences({ language: "en-US", theme: "dark", themeRadius: 6, themeColorPrimary: "#1677ff", sidebarCollapsed: true, tabbarEnable: false });
		expect(migrated).toMatchObject({ language: "en-US", theme: "dark", themeRadius: 12, themeColorPrimary: "#cf233e", builtinTheme: "red", sidebarCollapsed: true, tabbarEnable: false });
	});
	it("handles missing storage and preserves a custom radius", () => {
		expect(migrateBrandPreferences(null).themeColorPrimary).toBe("#cf233e");
		expect(migrateBrandPreferences({ themeRadius: 8 }).themeRadius).toBe(8);
	});
});
