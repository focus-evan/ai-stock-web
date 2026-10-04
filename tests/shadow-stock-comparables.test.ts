import { describe, expect, it } from "vitest";
import { formatComparableMetric, normalizeComparableCompanies } from "../src/pages/shadow-stock/comparables";

describe("comparable company data boundaries", () => {
	it.each([null, undefined, {}, "三星电子", 1])("ignores a malformed collection: %j", (value) => {
		expect(normalizeComparableCompanies(value)).toEqual([]);
	});
	it("keeps valid names and filters malformed entries without crashing", () => {
		expect(normalizeComparableCompanies([
			" 三星电子 ",
			{ name: "部分资料", pe: -5 },
			null,
			undefined,
			42,
			[],
			{},
			{ name: 123 },
			"",
			"undefined",
		])).toEqual([
			{ name: "三星电子", market_cap: null, pe: null },
			{ name: "部分资料", market_cap: null, pe: "-5" },
		]);
	});
	it.each([undefined, null, "", "undefined", "NaN", "N/A", "-", "待核验", true, {}, Number.NaN, Number.POSITIVE_INFINITY])("does not invent a metric for %j", (value) => {
		expect(formatComparableMetric(value, "亿")).toBe("待补充");
		expect(formatComparableMetric(value, "x")).toBe("待补充");
	});
	it("preserves supplied numeric values and avoids duplicate units", () => {
		expect(formatComparableMetric(0, "亿")).toBe("0亿");
		expect(formatComparableMetric("120.5", "亿")).toBe("120.5亿");
		expect(formatComparableMetric("120亿元", "亿")).toBe("120亿元");
		expect(formatComparableMetric(-5, "x")).toBe("-5x");
		expect(formatComparableMetric("25x", "x")).toBe("25x");
		expect(formatComparableMetric("25倍", "x")).toBe("25倍");
	});
});
