import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { findReportDate, resolveLocalLink, shouldInclude, syncLibrary } from "./sync-research-library.mjs";
import { filterItems, matches, safeHref } from "../public/research-library/_ui/catalog.js";

test("local report URLs keep subdirectories, Unicode, queries and fragments", () => {
	const files = new Set(["index.html", "skill-list/中文/index.html", "radar/data.json"]);
	assert.deepEqual(resolveLocalLink("file:///D:/Evan/html/skill-list/中文/index.html?q=1#part", "radar/latest.html", files), { href: "../skill-list/%E4%B8%AD%E6%96%87/index.html?q=1#part", target: "skill-list/中文/index.html" });
	assert.equal(resolveLocalLink("file:///D:/Evan/Codes/reports/index.html", "radar/latest.html", files).href, "../index.html");
	assert.equal(resolveLocalLink("data.json", "radar/latest.html", files).href, "data.json");
	assert.equal(resolveLocalLink("../../outside.py", "radar/latest.html", files).href, undefined);
	assert.equal(resolveLocalLink("https://example.com/research?q=1#part", "index.html", files), null);
	assert.equal(resolveLocalLink("missing.html", "index.html", files).unavailable.length > 0, true);
	const repaired = resolveLocalLink("data.json", "radar/archive/old.html", files);
	assert.equal(repaired.href, "../data.json");
	assert.equal(repaired.repairedFrom, "radar/archive/data.json");
	const manual = "server-cleanup-example/files/restore.sh";
	assert.equal(resolveLocalLink("files/restore.sh", "server-cleanup-example/index.html", new Set([manual])).href, "files/restore.sh.txt");
});

test("publish documents and assets without browser profiles, credentials or generators", () => {
	for (const file of ["theme/archive/report.html", "data/rows.csv", "资料/说明.pdf", "data/sample.json", "assets/site.js"]) assert.equal(shouldInclude(file), true);
	for (const file of [".edge-headless/Default/Preferences", "folder/.env", "_tools/generate.py", "report.py", "server.log", "__pycache__/x.pyc", "_tmp_source.pdf"]) assert.equal(shouldInclude(file), false);
});

test("report dates prefer report titles over filenames or import times", () => {
	assert.equal(findReportDate("archive/run_202608311200.html", "报告 2026-09-01", ""), "2026-09-01");
	assert.equal(findReportDate("archive/run_202608311200.html", "报告", ""), "2026-08-31");
	assert.equal(findReportDate("latest.html", "每日雷达", "报告时间：2026-09-07 07:00"), "2026-09-07");
	assert.equal(findReportDate("guide.html", "投研方法", ""), null);
});

test("search combines category, collection, archive and multiple keywords", () => {
	const rows = [
		{ id: "a/1.html", title: "半导体设备", searchText: "国产替代 先进封装", category: "research", collection: "a", date: "2026-09-01" },
		{ id: "a/2.html", title: "半导体设备", searchText: "先进封装", category: "research", collection: "a", date: "2026-09-02", isArchive: true },
		{ id: "b/3.html", title: "策略复盘", searchText: "半导体 先进封装", category: "strategy", collection: "b" },
	];
	assert.equal(matches(rows[0], "半导体 先进封装"), true);
	const state = { query: "半导体 先进封装", category: "research", collection: "a", archives: false, sort: "recent" };
	assert.deepEqual(filterItems(rows, state).map(row => row.id), ["a/1.html"]);
	assert.deepEqual(filterItems(rows, { ...state, archives: true }).map(row => row.id), ["a/2.html", "a/1.html"]);
	for (const url of ["javascript:alert(1)", "//example.com", "content/../../.env", "content/%2e%2e/private"]) assert.equal(safeHref(url), "#");
	assert.equal(safeHref("content/中文/index.html"), "content/中文/index.html");
});

test("sync preserves source files, disables broken local links and remains repeatable", async () => {
	const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-stock-research-test-"));
	try {
		const source = path.join(temporaryRoot, "source");
		const destination = path.join(temporaryRoot, "output");
		fs.mkdirSync(path.join(source, "radar"), { recursive: true });
		const original = '<!doctype html><html><head><title>总入口</title></head><body><h1>研究</h1><a href="radar/latest.html">雷达</a><a href="missing.html">原始缺失链接</a><script>throw new Error("Must not execute during import")</script></body></html>';
		fs.writeFileSync(path.join(source, "index.html"), original);
		fs.writeFileSync(path.join(source, "radar/latest.html"), '<html><head><title>日报 2026-09-07</title></head><body><p>原始结论</p><a href="../index.html">返回</a><table><tr><td>证据</td></tr></table></body></html>');
		fs.writeFileSync(path.join(source, "radar/data.json"), '{"valid":true}');
		fs.writeFileSync(path.join(source, "radar/.env"), "PRIVATE=not-published");
		const options = { source, destination, reportFile: path.join(temporaryRoot, "report.json") };
		const first = await syncLibrary(options);
		assert.equal(first.htmlPages, 2);
		assert.equal(first.attachments, 1);
		assert.equal(first.unavailableLinks.length, 1);
		assert.equal(fs.readFileSync(path.join(source, "index.html"), "utf8"), original);
		const exported = fs.readFileSync(path.join(destination, "content/radar/latest.html"), "utf8");
		assert.match(exported, /原始结论/);
		assert.match(exported, /viewport/);
		assert.match(exported, /\.\.\/\.\.\/_ui\/reader\.css/);
		assert.equal(fs.existsSync(path.join(destination, "content/radar/.env")), false);
		assert.match(fs.readFileSync(path.join(destination, "content/index.html"), "utf8"), /data-library-unavailable/);
		const second = await syncLibrary(options);
		assert.equal(second.changedFiles, 0);
		assert.equal(second.fingerprint, first.fingerprint);
		assert.equal(second.syncedAt, first.syncedAt);
		fs.writeFileSync(path.join(source, "radar/new.html"), '<html><title>新增报告</title><body>new</body></html>');
		assert.equal((await syncLibrary(options)).htmlPages, 3);
		fs.unlinkSync(path.join(source, "radar/new.html"));
		const fourth = await syncLibrary(options);
		assert.deepEqual(fourth.removedFiles, ["radar/new.html"]);
		assert.equal(fs.existsSync(path.join(destination, "content/radar/new.html")), false);
		await assert.rejects(syncLibrary({ ...options, destination: path.join(source, "nested") }), /overlap/);
	} finally {
		const target = path.resolve(temporaryRoot);
		assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
		assert.ok(path.basename(target).startsWith("ai-stock-research-test-"));
		fs.rmSync(target, { recursive: true, force: true });
	}
});
