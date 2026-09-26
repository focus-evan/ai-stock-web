import { afterEach, describe, expect, it, vi } from "vitest";
import { applyResearchTheme, researchCatalogUrl } from "./research-theme";

vi.mock("../public/research-library/_ui/catalog.css?url", () => ({ default: "/assets/catalog-test.css" }));
vi.mock("../public/research-library/_ui/reader.css?url", () => ({ default: "/assets/reader-test.css" }));

afterEach(() => {
	document.querySelector("#ai-stock-research-theme")?.remove();
	window.history.replaceState({}, "", "/");
});

describe("live research publisher branding", () => {
	it("leaves the application and unavailable foreign documents untouched", () => {
		window.history.replaceState({}, "", "/home");
		applyResearchTheme(document);
		applyResearchTheme(null);
		expect(document.querySelector("#ai-stock-research-theme")).toBeNull();
	});

	it("adds one versioned stylesheet even when both module and iframe loading apply it", () => {
		window.history.replaceState({}, "", "/research-library/index.html");
		applyResearchTheme(document);
		applyResearchTheme(document);
		const links = document.querySelectorAll<HTMLLinkElement>("#ai-stock-research-theme");
		expect(links).toHaveLength(1);
		expect(links[0].href).toContain("catalog");
		expect(new URL(researchCatalogUrl(), window.location.origin).searchParams.get("theme")).toContain("catalog");
	});

	it("switches to the reading theme when navigating from the catalog to a report", () => {
		window.history.replaceState({}, "", "/research-library/index.html");
		applyResearchTheme(document);
		window.history.replaceState({}, "", "/research-library/content/live/latest.html");
		applyResearchTheme(document);
		expect(document.querySelectorAll("#ai-stock-research-theme")).toHaveLength(1);
		expect(document.querySelector<HTMLLinkElement>("#ai-stock-research-theme")?.href).toContain("reader");
	});
});
