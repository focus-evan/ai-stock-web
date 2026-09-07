import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const root = fileURLToPath(new URL("../public/research-library/", import.meta.url));
const contentRoot = path.join(root, "content");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, ".sync-manifest.json"), "utf8"));
const source = process.env.RESEARCH_SOURCE_DIR || "D:/Evan/html";
const missing = [];
const alteredText = [];
const sourceChanged = [];
let localLinks = 0;
for (const entry of catalog.entries) {
	const filename = path.join(root, decodeURIComponent(entry.href));
	const document = load(fs.readFileSync(filename, "utf8"));
	assert.equal(document(".rl-reader-toolbar").length, 1, `Reader navigation: ${entry.id}`);
	assert.ok(document('meta[name="viewport"]').attr("content")?.includes("width=device-width"), entry.id);
	for (const element of document("[href], [src]").toArray()) {
		const value = document(element).attr("href") ?? document(element).attr("src");
		if (!value || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(value)) continue;
		assert.ok(!/^file:|^[A-Za-z]:/i.test(value), `Non-portable URL: ${entry.id}`);
		const pathname = decodeURIComponent(value.split(/[?#]/)[0]);
		const target = pathname.startsWith("/research-library/") ? path.join(root, pathname.slice("/research-library/".length)) : path.resolve(path.dirname(filename), pathname);
		localLinks++;
		if (!target.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(target)) missing.push({ file: entry.id, value });
	}
	if (fs.existsSync(path.join(source, entry.id))) {
		const original = load(fs.readFileSync(path.join(source, entry.id), "utf8"));
		document(".rl-reader-toolbar").remove();
		const text = document("body").text().replace(/\s+/g, " ").trim();
		const originalText = original("body").text().replace(/\s+/g, " ").trim();
		if (text !== originalText) alteredText.push(entry.id);
	}
}
for (const attachment of catalog.attachments) assert.ok(fs.existsSync(path.join(root, decodeURIComponent(attachment.href))), attachment.id);
for (const [relative, expected] of Object.entries(manifest.sourceHashes)) {
	if (fs.existsSync(path.join(source, relative))) {
		const actual = createHash("sha256").update(fs.readFileSync(path.join(source, relative))).digest("hex");
		if (actual !== expected) sourceChanged.push(relative);
	}
}
const result = { htmlPages: catalog.entries.length, attachmentCount: catalog.attachments.length, localLinksChecked: localLinks, missing, alteredReportText: alteredText, sourceChangedSinceSync: sourceChanged, catalogBytes: fs.statSync(path.join(root, "catalog.json")).size, contentFiles: manifest.files.length };
console.log(JSON.stringify(result, null, 2));
assert.equal(missing.length, 0, "Local links must resolve.");
assert.equal(alteredText.length, 0, "Report wording must be preserved.");
assert.equal(sourceChanged.length, 0, "Source changed after sync; sync again before verification.");
