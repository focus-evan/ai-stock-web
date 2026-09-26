import catalogThemeUrl from "../public/research-library/_ui/catalog.css?url";
import readerThemeUrl from "../public/research-library/_ui/reader.css?url";

const themeId = "ai-stock-research-theme";

/** Keep the live publisher's content while applying this frontend's versioned theme. */
export function applyResearchTheme(target: Document | null) {
	if (target?.contentType !== "text/html" || !target.location?.pathname.startsWith("/research-library/"))
		return;
	const catalog = target.location.pathname === "/research-library/" || target.location.pathname === "/research-library/index.html";
	const existing = target.querySelector<HTMLLinkElement>(`link#${themeId}`);
	const link = existing ?? target.createElement("link");
	link.id = themeId;
	link.rel = "stylesheet";
	link.href = catalog ? catalogThemeUrl : readerThemeUrl;
	if (!existing)
		target.head.append(link);
}

export function researchCatalogUrl() {
	return `/research-library/index.html?theme=${encodeURIComponent(catalogThemeUrl)}`;
}

if (typeof document !== "undefined")
	applyResearchTheme(document);
