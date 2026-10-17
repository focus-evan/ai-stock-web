# 抖音账号同步恢复运行手册

本机恢复版本使用 Node.js 编排、Codex 浏览器读取公开作品、本地 faster-whisper 转写，以及原内容中心发布器。旧 `douyi-dl` 项目和旧 Mac 的下载日志未迁入本机，不再把旧虚拟环境路径当成可运行入口。

- Node：`C:\Users\Evan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`
- 入口：`D:\evan\codes\.codex-automation-runtime\douyin-corpus\corpus.mjs`
- 账号注册表：同目录 `accounts.json`，共五个账号，保存完整 sec_uid。
- 正式静态资料：`D:\evan\html\douyin`。
- 本机任务状态、音频缓存、原始转写：本目录 `inbox`、`results`、`media`、`logs`。
- 模型：`models/small`，本地 CPU/int8，不需要云端转写密钥。依赖固定在 `requirements.lock.txt`，其中 PyAV 为 15.1.0；新版 PyAV 19 与当前 faster-whisper 的 `metadata_errors` 参数不兼容。

## 一次完整运行

1. 执行 `node corpus.mjs plan`，获得主页地址、最新已入库作品和待处理 ID。先读取上次日志和 `inbox`，恢复未处理的增量，不能只处理新发现的顶端作品。
2. 使用 `mcp__cua_repl` 的已记录接口打开同一聊天的 in-app browser。保留当前抖音登录状态。只有页面确实显示未登录或验证失败时才请求用户处理；不读取或输出 Cookie，不自动解决验证码。
3. 打开各注册账号的公开主页，核对昵称。通过 `#user_detail_element a[href*="/video/"], #user_detail_element a[href*="/note/"]` 读取页面可见作品。过滤置顶造成的旧 ID，滚动到最新已入库 ID 或更早的作品。每次滚动后读取新页面状态；达到边界才标记扫描完整，不能把列表为空当作没有新作。
4. 作品 ID、时间和文案均来自对应作品页面。主页图片 alt 中的日期可能是账号创建日期，不可拿来做视频发布时间。读取页面里的“发布时间”、主标题和播放器 duration，并检查作者主页链接与注册账号一致。
5. 读取当前 `video.currentSrc`：HTTPS 地址可下载；`blob:` 是播放器流地址，不能当视频文件。对流媒体，使用页面 `pageAssets` 已观测到的 `media-audio` 文件地址。若复用详情页没有观测到媒体资源，打开该作品的一个独立页面，待播放就绪后读取其资产清单。只把抖音 CDN 的实际媒体地址放入本机批次，不输出带签名的接口 URL，也不保存浏览器凭据。
6. 每个批次保存为 `inbox/<run_id>.json`，含 `scans` 与 `items`。格式见本次 `inbox/repair_20261014.json`。`scans` 保存各账号发现的全部新 ID、扫描是否完整、最新观察到的作品；即使暂未处理全部媒体也保留 ID。`items` 保存 slug、aweme_id、source_url、published_at、duration_seconds、description、media_url。
7. 运行 `node corpus.mjs process <run_id>`。它按作品断点续跑；下载检查 MP4 容器与音频时长，空音频失败，单作品失败不会中断后续作品。音频和初始转写只留在本机。没有口播的图文不能假称音频转写成功，应根据可见图片另做 OCR/人工整理并清楚标记来源；当前入口会把这类作品保留为待处理。
8. 读取转写结果，写标题、重点摘要及整理后的原文。只规范化有依据的同音词、标点和重复识别；专名、年份、金额、仓位与方向不清楚时标为待听辨。摘要应忠实表达创作者观点，不替换为系统的操作建议，不把自述收益写成已验证实盘战绩。保存 `inbox/review-<run_id>.json`：`{run_id,reviews:[{slug,aweme_id,display_title,points,transcript,category,review_notes}]}`。执行 `node corpus.mjs review-file <file>`。初始转写、整理文本和摘要必须同时存在才允许入库。
9. 执行 `node corpus.mjs render <run_id>`、`node corpus.mjs validate`。它保留历史资料及老链接，新增独立单视频页；主页区分扫描成功、待处理数量与真正失败数量。保留旧市场验证日期，不把此次文案同步冒充市场观点验证。
10. 调用原发布器 `D:\evan\codes\.codex-automation-runtime\research-publisher\publish.ps1`，参数 `-HtmlRoot D:\evan\html`、`-NodeExe <上述 Node>`、`-PythonExe C:\Users\Evan\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`。发布器合并其他模块、使用服务器版本基线、保留回滚点；`busy` 不等于已上线。只有公网 `catalog.json` 和 `content/douyin/logs/latest_update_summary.json` 与本轮一致，新增单视频页 HTTP 200 且正文完整，才能报告成功。
11. 公网核验之后，运行 `node corpus.mjs cleanup <run_id>` 清除已经通过复核和发布的本机媒体缓存；待复核/失败媒体保留。不要删除历史文字库、JSON、网页或来源索引。

恢复的历史网页可能已包含内容中心导航。作为本地源文件时应移除 `nav.rl-reader-toolbar` 及 `_ui/reader` 的样式/脚本，由发布器统一添加一次。原来未纳入目录的历史别名保存在 `D:\evan\html\douyin\_tools\catalog-exclusions.json`；这是目录过滤配置，文件地址仍然保留，不应把这些历史别名重新登记成几千条新报告。新 `videos/new_<id>.html` 正常纳入目录。

图文或无有效口播的作品可在确认真实内容后补录 `source_type: image_ocr` 或 `published_caption`、`source_text` 与 `evidence_ref`（原图片或页面依据），重新保存批次并运行 process，再按相同 review-file 门槛复核。来源文本必须来自可见原图或原帖正文，不能把标题/标签编成口播全文。程序会区别图文提取数和音频转写数，单视频页标明对应来源。历史 AI 分类总数保存在账号注册表的 baseline_ai_count，新条目只根据其明确主题标签增量计数，不重新给存量分类。

## 浏览器到本机的批次接收器

每轮按需启动 `node corpus.mjs serve`，监听 `127.0.0.1:8793`，不对外开放。用 Node 或 `Start-Process -WindowStyle Hidden` 启动，检查端口，避免重复进程。任务中断后接收进程可能结束，下轮可以重启，状态已经在文件中保存。

浏览器打开 `http://127.0.0.1:8793/`，填入“采集批次 JSON”并点“保存采集批次”，服务器按 ID 合并，不重复追加。`http://127.0.0.1:8793/batch/<run_id>` 用于从可见页面恢复同一批次对象。读取页面上的 `pre` 文本后可解析 JSON，勿输出完整带签名的媒体 URL。

## 通知与恢复

### 2026-10-14 积压处理补充

- 原 190 条积压中，187 条可入库（181 条口播转写、6 条发布正文），2 条为立伟付费作品，1 条实际作者是其他账号。`dispositions.json` 保存逐条访问限制和作者不符依据，不能把会员试看当完整转写。后续仅在用户取得访问权限或来源归属得到更正后重核这些记录。
- `process` 与 GPU 任务共用 `locks/<slug>_<id>.lock`，避免同一作品同时写入。不要删除仍在运行的进程所持有的锁。查看结果时排除 dispositions 中的受限记录。
- 当前电脑已验证 NVIDIA GTX 1650 可转写，依赖固定在 requirements.lock.txt。对已缓存且通过浏览器确认的音频可运行 `.venv/Scripts/python.exe -X utf8 transcribe_backlog_gpu.py 0 <run_id>`，复用一个 GPU 模型。没有缓存的作品仍需先完成真实媒体下载；该入口不采集浏览器、不处理凭据。
- 摘要已逐条阅读整理，全文是机器转写轻整理，并非逐句人工听校。存疑数字、专名和明显识别噪声需要标注。无可靠口播的短片只按页面可见原帖正文入库，必须标明 published_caption，不能编写音频全文。作者在原帖更正口误时保留更正依据。
- 浏览器作者校验要使用作品作者区域及完整 sec_uid，不能把评论区昵称或推荐作品当作者。复用临时页面时确认当前作品 ID，再读取实际媒体资源。
- 发布器现在会记录服务器已激活但公网尚待校验的状态，并重试网络中断；重试不等于伪报校验成功。所有公网核验完成后才清理通过复核的媒体。
- “我的收藏”也属于每日同步范围。登录后进入 `https://www.douyin.com/user/self?showTab=favorite_collection` 的“视频”标签，按当前收藏顺序扫描到已入库边界。作品作者必须从详情页作者区域读取；不可使用收藏者、评论者或相关推荐作者。
- 收藏批次使用 `favorites_<date>` run_id。视频保存真实音频并转写；图文先通过 pageAssets 导出每张原图，再用 `ocr_favorites.py` 生成带【图片 N】分隔的正文。原帖标题只能作为发布正文的一部分，不能替代多图内容。无可靠口播的视频可在核对可见正文后标为 `published_caption`。
- 收藏文案通过 `review-file` 后执行 `render-favorites <run_id>`、`validate`、统一发布器和公网逐页核验；成功后使用 `cleanup-favorites <run_id>`。收藏页必须保留旧记录、真实作者、发布时间、原帖链接与文本来源，列表按抖音当前收藏顺序排列。

保持同一聊天和同一抖音浏览器会话。无变化时不通知；真正下载、转写或发布失败、登录过期、或者历史积压全部完成时报告清楚的数量和阶段。失败后下一次从现有记录继续，不能伪造最新发布日期、清空历史、或者仅去掉红色标签。

### 2026-10-15 账号图文与收藏顺序补充

- 账号主页也要同时读取 `/video/` 与 `/note/`。立伟此前漏掉的11篇公开图文已补齐，共32张原图；两条原付费视频仍保留为访问受限。新的扫描记录要合并此前未解决的 pending_ids，不能只写本轮新发现的ID后把旧待办隐去。
- 判断置顶应识别卡片实际的“置顶”标签，不能仅用标题是否包含“置顶”二字过滤。例如“所有十月的事我都放在主页置顶视频了”仍是普通新作。
- `note_assets` 现支持注册账号和 favorites。每条必须有真实作者、发布时间、原帖地址和 pageAssets 导出的本机 `image_files`。执行 `.venv/Scripts/python.exe -X utf8 ocr_favorites.py <run_id>`；不传参数仍兼容旧收藏批次。该工具复用已完成、图片清单不变的OCR结果。
- 原图应按轮播图次序去重，核对页码总数。横向短表格也属于正文，不能用图片高度阈值排除。优先匹配正文轮播图自身的DOM与已观测pageAssets，不能把评论头像或推荐封面算作正文。
- 收藏渲染现优先采用本轮 scans.observed_order，并保留未观察到的历史资料。AI存量计数不随每天的新批次重置；下载、待处理和失败统计读取真实结果，不再把存在媒体URL当作下载成功。
- 可对浏览器已经确认的媒体运行 `node prefetch_batch.mjs <run_id>`，再执行 `transcribe_backlog_gpu.py 0 <run_id>`，复用一个GPU模型。没有成功媒体、无效容器、完整时长不符或未完成转写的作品仍必须保留待办。成功转写不重复运行。
