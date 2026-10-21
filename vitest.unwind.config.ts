import react from "@vitejs/plugin-react";
import { FileSystemIconLoader } from "unplugin-icons/loaders";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vitest/config";

// Focused component suite must not start dev-server inspectors or TS workers.
export default defineConfig({
	plugins: [react(), Icons({ customCollections: { svg: FileSystemIconLoader("./src/icons/svg") }, compiler: "jsx", jsx: "react" })],
	define: { __APP_INFO__: JSON.stringify({ pkg: { version: "test" }, lastBuildTime: "test" }) },
	test: { globals: true, environment: "happy-dom", setupFiles: ["./src/setupTests.ts"], maxWorkers: 1 },
});
