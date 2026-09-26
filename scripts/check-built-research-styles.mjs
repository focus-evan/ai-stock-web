import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { refreshBuiltResearchStyles, refreshResearchHtml, viteBuildConfigOverrides } from "./refresh-built-research-styles.mjs";

const versions = { "catalog.css": "abcdef012345", "reader.css": "6789abcdef01" };

function temporaryBuild(t) {
	const output = fs.mkdtempSync(path.join(os.tmpdir(), "ai-stock-built-styles-"));
	t.after(() => fs.rmSync(output, { recursive: true, force: true }));
	const library = path.join(output, "research-library");
	fs.mkdirSync(path.join(library, "_ui"), { recursive: true });
	fs.mkdirSync(path.join(library, "content", "中文"), { recursive: true });
	for (const name of Object.keys(versions)) fs.writeFileSync(path.join(library, "_ui", name), `/* ${name} */ body { color: red; }`);
	return { output, library };
}

test("built HTML uses actual CSS hashes, preserves report bodies, and is idempotent", (t) => {
	const { output, library } = temporaryBuild(t);
	const body = '<body>原始报告\r\n<p data-price="3.5">上涨 +3.50% &amp; <strong>风险</strong></p><a href="../../_ui/reader.css?v=body">CSS示例</a><script>const path="_ui/reader.css?v=body";</script></body></html>';
	const catalog = '<html><head><link rel="stylesheet" href="_ui/catalog.css?v=old"><script src="_ui/catalog.js?v=original"></script></head>' + body;
	const report = '<!doctype html><html><head><title>报告</title><link data-note="original" href="../../_ui/reader.css?theme=red&amp;v=old#read" rel="stylesheet"></head>' + body;
	fs.writeFileSync(path.join(library, "index.html"), catalog);
	const reportFile = path.join(library, "content", "中文", "report.htm");
	fs.writeFileSync(reportFile, report);
	const first = refreshBuiltResearchStyles(output);
	assert.equal(first.htmlFiles, 2);
	assert.equal(first.changedFiles, 2);
	assert.equal(first.references, 2);
	const expected = createHash("sha256").update(fs.readFileSync(path.join(library, "_ui", "reader.css"))).digest("hex").slice(0, 12);
	assert.equal(first.versions["reader.css"], expected);
	const updated = fs.readFileSync(reportFile, "utf8");
	assert.equal(updated.slice(updated.indexOf("<body>")), body);
	assert.ok(updated.includes(`?theme=red&amp;v=${expected}#read`));
	assert.ok(updated.includes('data-note="original"'));
	assert.ok(fs.readFileSync(path.join(library, "index.html"), "utf8").includes('src="_ui/catalog.js?v=original"'));
	assert.equal(refreshBuiltResearchStyles(output).changedFiles, 0);
});

test("only real head stylesheet hrefs are changed, never comments, scripts or external assets", () => {
	const html = '<html><head><!-- <link rel="stylesheet" href="_ui/catalog.css?v=comment"> --><script>const demo=\'<link rel="stylesheet" href="_ui/catalog.css?v=script">\';</script><link rel="stylesheet" href="https://example.com/_ui/catalog.css?v=external"><link rel="preload" href="_ui/catalog.css?v=preload"><LINK REL=stylesheet HREF=_ui/catalog.css></head><body><link rel="stylesheet" href="_ui/reader.css?v=body">unchanged</body></html>';
	const result = refreshResearchHtml(html, "/build/research-library/index.html", "/build/research-library", versions);
	assert.equal(result.references, 1);
	assert.equal(result.html, html.replace("HREF=_ui/catalog.css", 'HREF="_ui/catalog.css?v=abcdef012345"'));
});

test("root-absolute library URLs work while similarly named report-owned CSS stays unchanged", () => {
	const html = '<html><head><link rel="stylesheet" href="/research-library/_ui/reader.css?v=old"><link rel="stylesheet" href="_ui/reader.css?v=report-owned"></head><body>原文</body></html>';
	const result = refreshResearchHtml(html, "/build/research-library/content/a.html", "/build/research-library", versions);
	assert.equal(result.references, 1);
	assert.equal(result.html, html.replace("/research-library/_ui/reader.css?v=old", "/research-library/_ui/reader.css?v=6789abcdef01"));
});

test("missing built CSS fails before writing HTML", (t) => {
	const { output, library } = temporaryBuild(t);
	const html = '<html><head><link rel="stylesheet" href="_ui/catalog.css?v=old"></head><body>original</body></html>';
	fs.writeFileSync(path.join(library, "index.html"), html);
	fs.rmSync(path.join(library, "_ui", "reader.css"));
	assert.throws(() => refreshBuiltResearchStyles(output), /ENOENT/);
	assert.equal(fs.readFileSync(path.join(library, "index.html"), "utf8"), html);
});

test("postprocessing refuses checked-in public sources and linked build content", (t) => {
	assert.throws(() => refreshBuiltResearchStyles(fileURLToPath(new URL("../public", import.meta.url))), /not public source/);
	const { output, library } = temporaryBuild(t);
	fs.symlinkSync(path.join(library, "_ui", "reader.css"), path.join(library, "linked.html"));
	assert.throws(() => refreshBuiltResearchStyles(output), /linked build asset/);
});

test("output resolution retains Vite root, mode, config and explicit outDir flags", () => {
	assert.deepEqual(viteBuildConfigOverrides([]), {});
	assert.deepEqual(viteBuildConfigOverrides(["--outDir", "build-custom"]), { build: { outDir: "build-custom" } });
	assert.deepEqual(viteBuildConfigOverrides(["--mode=staging", "--base", "/app/", "app-root", "-c", "custom.ts", "--outDir=release/site", "--minify", "esbuild", "--configLoader", "runner"]), {
		mode: "staging", root: "app-root", configFile: "custom.ts", build: { outDir: "release/site" }, configLoader: "runner",
	});
});
