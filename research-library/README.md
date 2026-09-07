# 研究与知识库

本项目合并收录 Windows `D:\Evan\html` 与 macOS `/Users/evan/html` 的 HTML 报告和相关浏览资料。原生成目录与现有自动化继续保留；同步过程不修改原报告，不执行原目录中的脚本。

## 入口

- 工作台：首页「研究与知识库」卡片，或侧边菜单同名入口 `/research-center`。
- 内容中心是自带的研究资料入口，在前端和后端菜单模式下均可进入；保持登录守卫，保留后端明确配置的同名路由及权限，不更改既有交易菜单。
- 独立阅读：`/research-library/index.html`，适合手机、单独窗口和分享链接。
- 原始目录镜像：`/research-library/content/index.html`。

专题、全部报告、资料附件共享分类与搜索。筛选、专题选择和分页保存在 URL 中，浏览器返回时可以恢复。767 篇初始报告 HTML 均进入目录，包括原始入口和历史归档；原目录另有 4 个浏览器扩展内部页面，不属于报告，已排除。后续以实时目录计数为准。

## 同步更新

在项目目录执行：

```sh
corepack pnpm research:sync --source /Users/evan/html --merge
```

其他来源目录：

```sh
corepack pnpm research:sync --source "D:/another-report-root"
```

也可设置 `RESEARCH_SOURCE_DIR`。默认自动识别 Windows 的 `D:/Evan/html` 或 macOS/Linux 的 `~/html`。`--merge` 更新同名文件并保留其他来源与旧资料；不带该参数是单来源镜像，会移除该来源之外的受管资料，多来源使用时请带 `--merge`。`pnpm dev` 和 `pnpm build` 在来源目录存在时会先合并同步一次；来源不存在时使用仓库内已同步的快照，因此 Linux 构建与发布不依赖 Windows 盘符。`RESEARCH_SYNC=0` 可强制验证并使用仓库快照。

自动化继续写原目录，开发服务启动前、构建前或手动同步时刷新内容。运行中的开发服务不会自动监听外部目录；自动化完成后再次执行同步并刷新页面即可。生产内容需要随下一次前端发布更新，不会因本机原目录变化自动上线。

## 文件与边界

- `public/research-library/content/`：保留专题和历史目录结构的可浏览内容及附件。
- `public/research-library/catalog.json`：按需加载的目录，含标题、正文摘要、分类、报告日期和附件大小；不会把大数据附件打进前端 JavaScript 包。
- `public/research-library/_ui/`：统一入口和报告阅读适配。每篇 HTML 自动加入返回专题、字号、回顶部和表格横向滚动。
- `.sync-manifest.json`：同步清单与原始 SHA256，用于增量比较和移除已从来源删除的受管文件。同步只移除清单明确记录的目标文件，不清空目标目录。
- `research-library/sync-report.json`：完整同步结果、排除项和原始缺失链接，不放入可公开下载的内容目录。

迁移包括 HTML、JSON/JSONL、CSV/TSV、Markdown、TXT、PDF、图片、字体、JS 和 CSS。运维文档明确引用的 `server-cleanup-*/files/` 下 SH/CONF 附件以 `.txt` 副本供阅读和下载，不执行。浏览器缓存/个人配置、隐藏文件、数据库、运行日志、临时下载和生成脚本不进入静态站点。来源中的生成脚本继续由原有自动化使用。

报告正文中的判断、时间和数据保留；网页副本只改写本地资源链接、加入导航和阅读适配。日期优先从报告标题和路径提取，不把搬迁时间当作研究日期。缺失或指向内容库之外的本机文件链接会明确提示不可用，完整清单见同步报告；不会冒充可从手机访问的本机路径。

这些是随前端发布的静态资源。`/research-center` 沿用工作台路由权限，但静态 HTML/附件本身并不受前端登录页保护。如部署环境需要保护运维文档、持仓等资料，应在服务器层为整个 `/research-library/` 路径配置访问控制，不能把 React 菜单权限当作文件访问控制。远程更新需要提交同步后的内容快照、推送 Git 并按生产发布流程部署。

## 验证

```sh
corepack pnpm research:test
corepack pnpm research:verify
corepack pnpm typecheck
corepack pnpm build
```

构建入口使用跨平台 Node 启动器，保留 Vite 原有 8 GiB 内存设置。测试覆盖目录迁移、中文/Windows 链接、来源保护、可重复同步、文件排除、多条件搜索与过期受管文件移除。
