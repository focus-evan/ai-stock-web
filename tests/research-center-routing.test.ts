import type { AppRouteRecordRaw } from "#src/router/types";
import { ensureResearchCenterRoute } from "#src/router/utils/ensure-research-center-route";
import { describe, expect, it } from "vitest";

const library: AppRouteRecordRaw[] = [{ path: "/research-center", handle: { title: "研究与知识库", order: 2 } }];
describe("research library integration with backend menus", () => {
	it("adds the bundled library without changing backend-controlled trading routes", () => {
		const original: AppRouteRecordRaw[] = [{ path: "/home", handle: { title: "首页" } }, { path: "/trading", handle: { title: "交易", roles: ["trader"] } }];
		const result = ensureResearchCenterRoute(original, library);
		expect(result.map(route => route.path)).toEqual(["/home", "/trading", "/research-center"]);
		expect(result[1]).toBe(original[1]);
		expect(original).toHaveLength(2);
	});
	it("preserves an explicit backend library route and its roles", () => {
		const restricted: AppRouteRecordRaw[] = [{ path: "/research-center", handle: { title: "内部研究", roles: ["researcher"] } }];
		expect(ensureResearchCenterRoute(restricted, library)).toBe(restricted);
	});
	it("does not duplicate an existing nested or frontend library entry", () => {
		const nested: AppRouteRecordRaw[] = [{ path: "/", handle: { title: "工作台" }, children: library }];
		expect(ensureResearchCenterRoute(nested, library)).toBe(nested);
		expect(ensureResearchCenterRoute(library, library)).toBe(library);
	});
});
