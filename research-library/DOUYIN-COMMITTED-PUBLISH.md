# 抖音语料的提交后发布

源码仓库：`focus-evan/ai-stock-web`，内容分支：`codex/douyin-corpus-sync`。

- `research-library/douyin-source/`保存本次静态语料源码及历史目录；保留别名文件，但由`douyin/_tools/catalog-exclusions.json`避免重复登记报告。
- `automation-runtime/douyin-corpus/`保存采集、OCR、转写、渲染和校验程序。Cookie、签名媒体地址、inbox、媒体、模型、锁、结果缓存与本机日志不提交。
- `automation-runtime/research-publisher/`沿用既有发布器，新增可选的`RESEARCH_SOURCE_SCOPE=douyin`。此模式只更新抖音模块，保留线上总入口、其他模块和已有链接；仅允许合并同步。

完成文案复核和本地验证后，刷新源码快照，提交并推送到该远程分支。用`git ls-remote`核验远程分支包含本次提交，核对源码快照哈希，并检查发布所用源码和工具链没有工作区修改。

静态快照保留原始字节，独立运行时沿用自己的格式，不运行应用前端的ESLint自动格式化。运行时用Node语法检查、Python语法解析、scoped-sync测试及语料validate校验；`verify_source_snapshot.mjs <checkout> <commit>`逐一核验源码快照与Git提交的字节完全相同。

从已推送commit的源码目录调用该commit中的`publish.ps1`：`-HtmlRoot <checkout>/research-library/douyin-source`。设置`RESEARCH_SOURCE_SCOPE=douyin`及`RESEARCH_PUBLISH_REVISION=focus-evan/ai-stock-web@<full-commit>`。生成的目录、文件清单与传输包属于构建产物，发布状态位于用户目录，不回写源码。

发布器仍然使用服务器基线、独立内容指针和回滚版本。上线后逐页验证新增正文、总数、收藏顺序、本轮基线的全部模块ID及原有目录行；允许其他任务新增模块，不以旧的35个模块总数覆盖服务器现状。通过后才运行本机媒体缓存清理。交付记录仓库、分支、commit与服务器release/rollback路径。
