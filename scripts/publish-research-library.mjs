import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncLibrary } from "./sync-research-library.mjs";

const project = fileURLToPath(new URL("../", import.meta.url));
const library = path.join(project, "public/research-library");
const state = path.join(project, "research-library/publish-state");
const target = "root@121.196.147.222";
const remote = "/data/research-library-publisher";
const sshOptions = ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes", "-o", "ConnectTimeout=10"];
const hash = value => createHash("sha256").update(value).digest("hex");

function run(command, args, options = {}) {
	const result = spawnSync(command, args, { cwd: project, encoding: "utf8", timeout: 180000, maxBuffer: 24 * 1024 * 1024, windowsHide: true, ...options });
	if (result.error || result.status !== 0) throw new Error(`${command} failed: ${result.error?.message || result.stderr || result.stdout}`);
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
	console.log("[research] merging current reports and checking source consistency");
	await syncLibrary({ merge: true });
	run(process.execPath, ["scripts/verify-research-library.mjs"]);
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
			const revision = run("git", ["rev-parse", "HEAD"]);
			const request = { base: baseline.base, files: all, revision };
			fs.writeFileSync(path.join(temporary, "_publish-request.json"), JSON.stringify(request));
			const list = path.join(temporary, "files.txt");
			fs.writeFileSync(list, changed.join("\n") + "\n");
			const bundle = path.join(temporary, "bundle.tar.gz");
			run("tar", ["-czf", bundle, "-C", library, "-T", list, "-C", temporary, "_publish-request.json"]);
			console.log(`[research] uploading ${changed.length} changed files (${Math.ceil(fs.statSync(bundle).size / 1024)} KiB)`);
			run("scp", [...sshOptions, bundle, `${target}:${remote}/incoming/${id}.tar.gz`]);
			const result = JSON.parse(run("ssh", [...sshOptions, target, `python3 ${remote}/activate-research-library.py activate ${remote}/incoming/${id}.tar.gz`]));
			const response = await fetch(`http://121.196.147.222:3667/research-library/catalog.json?verify=${id}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
			if (!response.ok || hash(Buffer.from(await response.arrayBuffer())) !== all["catalog.json"]) throw new Error("Public catalog verification failed; inspect last-publish.json before retrying.");
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
