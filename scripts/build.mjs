import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareLibrary } from "./prepare-research-library.mjs";

await prepareLibrary();
const result = spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)), "build", ...process.argv.slice(2)], {
	stdio: "inherit",
	env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
