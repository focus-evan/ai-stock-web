# Frontend exact-candidate validation

Candidate: 74244246100a367c61cc3250f62c4d8f81bce693
Parent main: 5e2407bb033d4553dcf0e2c2221c62afa8bad3a3
Isolated worktree: D:/Evan/Codes/.codex-release-worktrees/ai-stock-web-20260905-quality
Runtime: Node v22.17.1; corepack pnpm@10.6.4 (matches packageManager).

Commands and outcomes:
- SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 CI=true corepack pnpm@10.6.4 install --frozen-lockfile: exit 0, 1122 packages reused, lockfile unchanged.
- corepack pnpm@10.6.4 run typecheck: exit 0.
- CI=true corepack pnpm@10.6.4 exec vitest run tests/portfolio-audit.test.tsx tests/demo.test.tsx: exit 0, 2 files and 2 tests passed.
- NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm@10.6.4 exec vite build: exit 0, built in 54.46 seconds; this is the Windows-compatible equivalent of the package.json build command.
- build/index.html exists. All 7 local src/href entries exist; 132 build files generated.
- git status --porcelain --untracked-files=no: empty.
- pnpm-lock.yaml committed and working-tree blob both eae2e588b7e0e804ab142f6047aa31e4ace06e0c.

Warnings:
- pnpm ignored esbuild/simple-git-hooks dependency build scripts; the build still succeeded and the root prepare hook was explicitly skipped.
- Vitest passed but reported a 10-second Vite shutdown delay before exiting 0.
- Vite reported node:module browser externalization, an empty faker chunk, and bundles above 500 kB.
- Existing source test modules are included by the existing build configuration. This candidate changes neither those tests nor the bundle configuration.

No business code, main branch, user worktree, server, or deployment state was modified by this validator.
Detailed logs: frontend-install.log, frontend-typecheck.log, frontend-tests.log, frontend-build.log.
Machine-readable asset hashes and validation status: frontend-validation.json.