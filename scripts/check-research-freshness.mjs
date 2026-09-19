import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { normalizeTimestamp, reportMetadata } from "./research-metadata.mjs";
import { reportStatus } from "../public/research-library/_ui/freshness.js";

test("supports the actual timestamps written by all report generators", () => {
	assert.equal(normalizeTimestamp("2026-09-18 15:25:18 +0800"), "2026-09-18T15:25:18+08:00");
	assert.equal(normalizeTimestamp("2026-09-19 12:00"), "2026-09-19T12:00:00+08:00");
	assert.equal(normalizeTimestamp("2026-09-19T08:58:55.98019+08:00"), "2026-09-19T08:58:55+08:00");
});

test("current JSON date wins over the first date of the evidence window; archives stay immutable", () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), "research-dates-"));
	fs.mkdirSync(path.join(root, "theme-ignition-v231"));
	fs.writeFileSync(path.join(root, "theme-ignition-v231/latest.json"), JSON.stringify({ generated_at: "2026-09-19T08:58:55+08:00" }));
	assert.equal(reportMetadata(root, "theme-ignition-v231/latest.html", "2026-09-18").reportDate, "2026-09-19");
	assert.deepEqual(reportMetadata(root, "theme-ignition-v231/archive/old.html", "2026-08-01"), {});
	fs.rmSync(root, { recursive: true });
});

test("weekend holdings remain current, Monday overdue warns, paused and historical are not stale", () => {
	const item = { date: "2026-09-18", generatedAt: "2026-09-18T10:44:43+08:00", refreshPolicy: { days: "weekdays", times: ["06:00"], graceMinutes: 90 } };
	assert.equal(reportStatus(item, new Date("2026-09-19T17:00:00+08:00")).state, "current");
	assert.equal(reportStatus(item, new Date("2026-09-21T07:00:00+08:00")).state, "current");
	assert.equal(reportStatus(item, new Date("2026-09-21T08:00:00+08:00")).state, "stale");
	assert.equal(reportStatus({ refreshPolicy: { paused: true } }).state, "paused");
	assert.equal(reportStatus({ date: "2026-07-05" }).state, "historical");
});

test("twice daily global report can expire within the same date", () => {
	const item = { generatedAt: "2026-09-19T06:00:00+08:00", refreshPolicy: { days: "daily", times: ["06:00", "12:00"], graceMinutes: 90 } };
	assert.equal(reportStatus(item, new Date("2026-09-19T12:30:00+08:00")).state, "current");
	assert.equal(reportStatus(item, new Date("2026-09-19T14:00:00+08:00")).state, "stale");
});
