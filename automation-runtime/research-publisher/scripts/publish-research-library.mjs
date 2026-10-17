import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { syncLibrary } from "./sync-research-library.mjs";
import { fetchBytesWithRetry } from "./fetch-with-retry.mjs";

const project = fileURLToPath(new URL("../", import.meta.url));
// Keep mutable scheduler state outside the deployed runtime tree. Windows
// sandbox identities can change between unattended runs, which may leave a
// runtime-created directory readable but no longer writable by the next run.
const state = process.env.RESEARCH_PUBLISH_STATE_DIR || path.join(os.homedir(), ".codex/automations-data/research-publisher");
const bundledLibrary = path.join(project, "public/research-library");
const library = process.env.RESEARCH_PUBLISH_LIBRARY_DIR || path.join(state, "library");
const syncReport = path.join(state, "sync-report.json");
const target = "root@121.196.147.222";
const remote = "/data/research-library-publisher";
const sshOptions = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=10"];
const hash = value => createHash("sha256").update(value).digest("hex");
const publicCatalog = process.env.RESEARCH_LIVE_CATALOG_URL || "http://121.196.147.222:3667/research-library/catalog.json";

async function refreshLiveCatalog() {
	const catalogFile = path.join(library, "catalog.json");
	const seedFile = path.join(bundledLibrary, "catalog.seed.json");
	try {
		const bytes = await fetchBytesWithRetry(`${publicCatalog}?bootstrap=${Date.now()}`);
		const parsed = JSON.parse(bytes.toString("utf8"));
		if (!Array.isArray(parsed.collections) || !Array.isArray(parsed.entries)) throw new Error("invalid catalog shape");
		fs.writeFileSync(catalogFile, bytes);
		return { source: "live", collections: parsed.collections.length };
	} catch (error) {
		if (!fs.existsSync(catalogFile) && fs.existsSync(seedFile)) fs.copyFileSync(seedFile, catalogFile);
		if (!fs.existsSync(catalogFile)) throw new Error(`Unable to bootstrap live catalog: ${error.message}`);
		const parsed = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
		console.warn(`[research] live catalog refresh failed; using bundled seed: ${error.message}`);
		return { source: "seed", collections: parsed.collections?.length || 0 };
	}
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { cwd: project, encoding: "utf8", timeout: 180000, maxBuffer: 24 * 1024 * 1024, windowsHide: true, ...options });
	if (result.error || result.status !== 0) throw new Error(`${command} failed: ${(result.error?.message || result.stderr || result.stdout).slice(0, 3000)}`);
	return result.stdout.trim();
}
function filesUnder(root, prefix = "") {
	return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(item => {
		const relative = prefix ? `${prefix}/${item.name}` : item.name;
		if (item.isSymbolicLink()) throw new Error(`Unexpected publish symlink: ${relative}`);
		return item.isDirectory() ? filesUnder(root, relative) : [relative];
	});
}

fs.mkdirSync(state, { recursive: true });
const lockPath = path.join(state, "publish.lock");
if (fs.existsSync(lockPath)) {
	const pid = Number(fs.readFileSync(lockPath, "utf8"));
	try { process.kill(pid, 0); console.log(JSON.stringify({ status: "busy", pid })); process.exit(0); }
	catch (error) { if (error.code !== "ESRCH") throw error; fs.unlinkSync(lockPath); }
}
const lock = fs.openSync(lockPath, "wx");
fs.writeFileSync(lock, String(process.pid));
try {
	if (!fs.existsSync(library)) fs.cpSync(bundledLibrary, library, { recursive: true });
	console.log("[research] merging current reports and checking source consistency");
	const bootstrap = await refreshLiveCatalog();
	console.log(`[research] catalog bootstrap=${bootstrap.source} collections=${bootstrap.collections}`);
	await syncLibrary({ merge: true, destination: library, reportFile: syncReport });
	run(process.execPath, ["scripts/verify-research-library.mjs"], { env: { ...process.env, RESEARCH_LIBRARY_DIR: library, RESEARCH_PORTABLE_BASELINE: "1" } });
	const catalog = JSON.parse(fs.readFileSync(path.join(library, "catalog.json"), "utf8"));
	if (process.argv.includes("--check")) {
		console.log(JSON.stringify({ status: "validated", fingerprint: catalog.fingerprint, collections: catalog.collections.length }));
	} else {
		const all = Object.fromEntries(filesUnder(library).map(relative => [relative, hash(fs.readFileSync(path.join(library, relative)))]));
		const baseline = JSON.parse(run("ssh", [...sshOptions, target, `python3 ${remote}/activate-research-library.py status`]));
		const names = new Set(catalog.collections.map(item => item.id));
		if (baseline.collections.some(id => !names.has(id))) throw new Error("Publish would omit a live collection; merge its source first.");
		const changed = Object.keys(all).filter(name => all[name] !== baseline.files[name]);
		if (!changed.length) {
			console.log(JSON.stringify({ status: "unchanged", fingerprint: catalog.fingerprint }));
		} else {
			const id = randomUUID();
			const temporary = path.join(state, id);
			fs.mkdirSync(temporary);
			const revision = process.env.RESEARCH_PUBLISH_REVISION || `portable-${catalog.fingerprint.slice(0, 12)}`;
			const request = { base: baseline.base, files: all, revision };
			fs.writeFileSync(path.join(temporary, "_publish-request.json"), JSON.stringify(request));
			const list = path.join(temporary, "files.json");
			fs.writeFileSync(list, JSON.stringify(changed));
			const bundle = path.join(temporary, "bundle.tar.gz");
			const python = process.env.RESEARCH_PYTHON || (process.platform === "win32" ? path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe") : "python3");
			run(python, ["scripts/pack-research-library.py", library, path.join(temporary, "_publish-request.json"), bundle, list]);
			console.log(`[research] uploading ${changed.length} changed files (${Math.ceil(fs.statSync(bundle).size / 1024)} KiB)`);
			run("scp", [...sshOptions, bundle, `${target}:${remote}/incoming/${id}.tar.gz`]);
			const result = JSON.parse(run("ssh", [...sshOptions, target, `python3 ${remote}/activate-research-library.py activate ${remote}/incoming/${id}.tar.gz`]));
			fs.writeFileSync(path.join(state, "last-publish.json"), JSON.stringify({ ...result, verification: "pending", activatedAt: new Date().toISOString() }, null, 2));
			const verifiedBytes = await fetchBytesWithRetry(`${publicCatalog}?verify=${id}`);
			if (hash(verifiedBytes) !== all["catalog.json"]) throw new Error("Public catalog verification failed after activation; inspect last-publish.json before retrying.");
			fs.writeFileSync(path.join(state, "last-publish.json"), JSON.stringify({ ...result, verifiedAt: new Date().toISOString() }, null, 2));
			console.log(JSON.stringify(result));
			// Only this run's transport files; release snapshots live on the server.
			fs.rmSync(temporary, { recursive: true });
		}
	}
} finally {
	fs.closeSync(lock);
	fs.unlinkSync(lockPath);
}
