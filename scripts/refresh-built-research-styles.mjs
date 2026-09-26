import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const sourceLibrary = fileURLToPath(new URL("../public/research-library", import.meta.url));
const styleNames = ["reader.css", "catalog.css"];

function htmlFiles(directory) {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const filename = path.join(directory, entry.name);
		if (entry.isSymbolicLink()) throw new Error(`Refusing to modify a linked build asset: ${filename}`);
		return entry.isDirectory() ? htmlFiles(filename) : /\.html?$/i.test(entry.name) ? [filename] : [];
	});
}

function versionedHref(href, version) {
	const fragmentAt = href.indexOf("#");
	const fragment = fragmentAt < 0 ? "" : href.slice(fragmentAt);
	const withoutFragment = fragmentAt < 0 ? href : href.slice(0, fragmentAt);
	const queryAt = withoutFragment.indexOf("?");
	const pathname = queryAt < 0 ? withoutFragment : withoutFragment.slice(0, queryAt);
	const query = new URLSearchParams(queryAt < 0 ? "" : withoutFragment.slice(queryAt + 1));
	query.set("v", version);
	return `${pathname}?${query}${fragment}`;
}

/** Change only stylesheet href attribute ranges. Never serialize the report DOM. */
export function refreshResearchHtml(html, filename, libraryRoot, versions) {
	const document = load(html, { sourceCodeLocationInfo: true });
	const changes = [];
	let references = 0;
	for (const link of document("head link[href]").toArray()) {
		const attributes = link.attribs;
		if (!attributes.rel?.toLowerCase().split(/\s+/).includes("stylesheet")) continue;
		const href = attributes.href;
		if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
		const pathname = href.split(/[?#]/)[0];
		const target = pathname.startsWith("/research-library/")
			? path.resolve(libraryRoot, pathname.slice("/research-library/".length))
			: path.resolve(path.dirname(filename), pathname);
		const name = styleNames.find(name => target === path.join(libraryRoot, "_ui", name));
		if (!name) continue;
		references++;
		const nextHref = versionedHref(href, versions[name]);
		if (nextHref === href) continue;
		const location = link.sourceCodeLocation?.attrs?.href;
		if (!location) throw new Error(`Missing stylesheet source location: ${filename}`);
		const original = html.slice(location.startOffset, location.endOffset);
		const assignment = original.match(/^[^\s=]+\s*=\s*/)?.[0];
		if (!assignment) throw new Error(`Invalid stylesheet href: ${filename}`);
		const escaped = nextHref.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
		changes.push({ start: location.startOffset, end: location.endOffset, text: `${assignment}"${escaped}"` });
	}
	for (const change of changes.sort((a, b) => b.start - a.start)) {
		html = html.slice(0, change.start) + change.text + html.slice(change.end);
	}
	return { html, references };
}

/** Operate on Vite output only; source reports and their original hashes stay untouched. */
export function refreshBuiltResearchStyles(outputDirectory) {
	const libraryRoot = path.resolve(outputDirectory, "research-library");
	if (libraryRoot === sourceLibrary || libraryRoot.startsWith(`${sourceLibrary}${path.sep}`)) {
		throw new Error("Research style cache refresh must target built output, not public source files.");
	}
	if (fs.lstatSync(libraryRoot).isSymbolicLink()) throw new Error("Built research-library must not be a symlink.");
	const versions = Object.fromEntries(styleNames.map((name) => {
		const filename = path.join(libraryRoot, "_ui", name);
		if (fs.lstatSync(filename).isSymbolicLink()) throw new Error(`Built research stylesheet must not be a symlink: ${name}`);
		return [name, createHash("sha256").update(fs.readFileSync(filename)).digest("hex").slice(0, 12)];
	}));
	const files = htmlFiles(libraryRoot);
	if (!files.length) throw new Error("Built research-library has no HTML pages.");
	let references = 0;
	const updates = [];
	for (const filename of files) {
		const original = fs.readFileSync(filename, "utf8");
		const result = refreshResearchHtml(original, filename, libraryRoot, versions);
		references += result.references;
		if (result.html !== original) updates.push([filename, result.html]);
	}
	if (!references) throw new Error("Built research-library has no library stylesheet references.");
	// Validate the entire output before writing any updated HTML.
	for (const [filename, html] of updates) fs.writeFileSync(filename, html);
	return { htmlFiles: files.length, changedFiles: updates.length, references, versions };
}

/** Mirror Vite's config/output-related CLI flags without changing its own argument handling. */
export function viteBuildConfigOverrides(args) {
	const requiredValues = new Set(["--config", "-c", "--base", "--logLevel", "-l", "--configLoader", "--filter", "-f", "--mode", "-m", "--target", "--outDir", "--assetsDir", "--assetsInlineLimit"]);
	const optionalValues = new Set(["--debug", "-d", "--ssr", "--sourcemap", "--minify", "--manifest", "--ssrManifest"]);
	const options = {};
	for (let i = 0; i < args.length; i++) {
		const [flag, ...inline] = args[i].split("=");
		if (!flag.startsWith("-")) {
			options.root ??= args[i];
			continue;
		}
		const takesValue = requiredValues.has(flag) || (optionalValues.has(flag) && args[i + 1] && !args[i + 1].startsWith("-"));
		const value = inline.length ? inline.join("=") : takesValue ? args[++i] : undefined;
		if (flag === "--config" || flag === "-c") options.configFile = value;
		else if (flag === "--mode" || flag === "-m") options.mode = value;
		else if (flag === "--configLoader") options.configLoader = value;
		else if (flag === "--outDir") options.build = { outDir: value };
	}
	return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	if (!process.argv[2]) throw new Error("Usage: node scripts/refresh-built-research-styles.mjs <build-output-directory>");
	console.log(JSON.stringify(refreshBuiltResearchStyles(process.argv[2])));
}
