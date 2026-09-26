import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareLibrary } from "./prepare-research-library.mjs";
import { refreshBuiltResearchStyles, viteBuildConfigOverrides } from "./refresh-built-research-styles.mjs";

await prepareLibrary();
const result = spawnSync(process.execPath, [fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url)), "build", ...process.argv.slice(2)], {
	stdio: "inherit",
	env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=8192" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

if (result.status === 0 && !process.argv.slice(2).some(arg => ["--help", "-h", "--version", "-v"].includes(arg))) {
	const { resolveConfig } = await import("vite");
	const config = await resolveConfig(viteBuildConfigOverrides(process.argv.slice(2)), "build", "production", "production");
	const refreshed = refreshBuiltResearchStyles(path.resolve(config.root, config.build.outDir));
	console.log(`[research] refreshed CSS cache versions in ${refreshed.changedFiles}/${refreshed.htmlFiles} built pages.`);
}
