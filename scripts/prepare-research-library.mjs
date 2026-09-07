import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultSource, syncLibrary } from "./sync-research-library.mjs";

export async function prepareLibrary() {
	const source = defaultSource();
	if (process.env.RESEARCH_SYNC !== "0" && fs.existsSync(path.join(source, "index.html"))) {
		const report = await syncLibrary({ source, merge: true });
		console.log(`[research] ${report.htmlPages} pages, ${report.collections} collections; ${report.changedFiles} files updated.`);
		return;
	}
	const library = fileURLToPath(new URL("../public/research-library/", import.meta.url));
	const catalogPath = path.join(library, "catalog.json");
	if (!fs.existsSync(catalogPath)) throw new Error("Research content is missing. Run pnpm research:sync on the source machine first.");
	const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
	if (!catalog.entries?.length) throw new Error("Research catalog is empty.");
	for (const entry of [...catalog.entries, ...catalog.attachments]) {
		const relative = decodeURIComponent(entry.href);
		const target = path.resolve(library, relative);
		if (!relative.startsWith("content/") || !target.startsWith(`${path.resolve(library)}${path.sep}`) || !fs.existsSync(target)) throw new Error(`Missing or invalid research content: ${entry.id}`);
	}
	console.log(`[research] using checked-in snapshot: ${catalog.entries.length} pages.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareLibrary();
