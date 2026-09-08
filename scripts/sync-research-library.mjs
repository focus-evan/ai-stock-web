import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const categories = [
	{ id: "radar", title: "每日雷达", description: "宏观、叙事、公告与市场情绪" },
	{ id: "research", title: "个股与持仓", description: "产业链、公司研究与持仓体检" },
	{ id: "strategy", title: "策略与复盘", description: "短线方法、回测与交易质量" },
	{ id: "method", title: "方法与创作", description: "S老师方法论、Skill 与内容创作" },
	{ id: "engineering", title: "系统与工程", description: "产品研究、系统审查与运维记录" },
];
const collections = {
	"short-drama-playbook": ["短剧创作与盈利", "method", "从选题、剧本、AI漫剧与真人制作到平台发布、推广分销和回款的实操手册。"],
	"douyin": ["抖音研究资料", "research", "账号概览、收藏汇总、逐条摘要与校验原文。"],
	"douyin_account_MS4wLjABAAAAuNn_since_20260501": ["抖音账号文字库", "research", "账号视频转写与研究原文。"],
	"douyin_research_all": ["抖音研究汇总", "research", "跨视频研究汇总与相关资料。"],
	"ai-stock-strategies": ["量化策略说明", "strategy", "交易策略、实现逻辑与研究说明。"],
	"ai-stock-strategy-validation": ["策略回测验证", "strategy", "策略推荐记录、回测结果与验证明细。"],
	"ai-stock-system-audit": ["AI投研系统审计", "engineering", "系统审计结论与改进记录。"],
	"citic-securities-six-month-views-2026": ["中信证券半年观点", "research", "中信证券研究观点与阶段性展望。"],
	"github-ai-finance-money-skills-20260725": ["AI金融开源工具", "method", "GitHub 金融研究工具与技能整理。"],
	"skills": ["技能目录", "method", "本机研究技能与使用说明。"],
	"a-share-four-strategies": ["短线四法", "strategy", "养家、92科比、龙头战法与北京炒家，每日雷达和历史复盘。"],
	"a-share-macro-radar": ["A股大盘情绪", "radar", "宏观环境、市场宽度、资金风险偏好与仓位观察。"],
	"a-share-macro-radar-20260703": ["宏观雷达专题", "radar", "阶段性市场情绪与宏观环境研究。"],
	"theme-ignition-v231": ["热门叙事 · V2.3.1", "radar", "盘前叙事、点火扩散、核心受益标的与后续校准。"],
	"global-tech-radar": ["全球科技与流动性", "radar", "全球大厂资本开支、科技催化与流动性变化。"],
	"quarterly-disclosure-monitor": ["财报与公告追踪", "radar", "定期报告、业绩预告和官方披露的持续核验。"],
	"automation-2-holdings": ["持仓晨报", "research", "持仓公司的利多、利空与风险跟踪。"],
	"stock-reports": ["个股深度报告", "research", "V2.3.1、S40、估值比较与公司深度研究。"],
	"v231-holdings-20260627": ["V2.3.1 持仓体检", "research", "分项报告、框架逻辑与组合诊断。"],
	"ai-hardware-materials-beneficiaries": ["AI硬件材料地图", "research", "PCB、MLCC、先进封装、半导体与关键材料。"],
	"semiconductor-equipment-v231-s40": ["半导体设备研究", "research", "V2.3.1 与 S40 视角下的产业和公司比较。"],
	"fresh-ai-screen": ["AI候选池资料", "research", "公司筛选与研究数据附件。"],
	"cffex-citic-backtest": ["中信期货席位回测", "strategy", "公开股指期货席位与次日市场表现的统计检验。"],
	"ai-stock-strategy-audit-20260905": ["战法质量与交易审计", "strategy", "推荐、跟进、模拟组合与数据质量的独立审计。"],
	"ai-stock-strategy-optimization-20260905": ["战法优化验收", "strategy", "执行证据、交易结算、测试与优化效果验证。"],
	"skill-list": ["Skill 与 S老师方法论", "method", "投研、财富规划、内容创作与方法论说明。"],
	"s-ai-agent-agi-optimization": ["S老师决策体系优化", "engineering", "系统核心问题、优化方向与投入优先级。"],
	"s-ai-agent-s-teacher-audit-20260907": ["S老师决策一致性审查", "engineering", "目标理解、方法选择、证据和记忆的系统审查。"],
	"automation-heartbeat-audit": ["自动化任务审查", "engineering", "自动化运行机制与任务状态核验。"],
	"company-tag-audit": ["公司标签审查", "engineering", "公司分类、标签数据和筛选逻辑核验。"],
	"server-resource-audit": ["服务器资源审计", "engineering", "服务器资源使用与运行环境记录。"],
	"server-cleanup-112.124.24.71-20260831": ["Dify 服务器优化", "engineering", "清理方案、备份恢复与执行验收。"],
	"server-cleanup-114.55.219.63-20260831": ["管理服务器清理", "engineering", "清理前情况、操作手册与验收基线。"],
};
const extensions = new Set([".html", ".htm", ".json", ".jsonl", ".csv", ".tsv", ".md", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".css", ".js", ".mjs", ".woff", ".woff2", ".ico"]);
const excludedDirs = new Set(["_tools", "node_modules", "__pycache__"]);
const slash = value => value.replaceAll("\\", "/");
const encodePath = value => value.split("/").map(encodeURIComponent).join("/");
const hash = value => createHash("sha256").update(value).digest("hex");
const compact = value => value.replace(/\s+/g, " ").trim();
const escapeHtml = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const isManualAttachment = relative => /^server-cleanup-[^/]+\/files\/[^/]+\.(sh|conf)$/i.test(relative);
export const publishedPath = (relative) => {
 const portable = relative.split("/").map(segment => {
  if (Buffer.byteLength(segment, "utf8") <= 240) return segment;
  const extension = path.posix.extname(segment);
  let prefix = "";
  for (const character of segment.slice(0, segment.length - extension.length)) {
   if (Buffer.byteLength(prefix + character, "utf8") > 160) break;
   prefix += character;
  }
  return `${prefix}-${hash(segment).slice(0, 12)}${extension}`;
 }).join("/");
 return isManualAttachment(relative) ? `${portable}.txt` : portable;
};

export function shouldInclude(relativePath) {
	const parts = slash(relativePath).split("/");
	return !parts.some(part => part.startsWith(".") || excludedDirs.has(part))
		&& !/^(?:_tmp|tmp_|debug_|main-index-preview)/i.test(parts.at(-1))
		&& (extensions.has(path.extname(relativePath).toLowerCase()) || isManualAttachment(slash(relativePath)));
}

function walk(root, prefix = "") {
	return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(item => {
		const relative = slash(path.join(prefix, item.name));
		if (item.isSymbolicLink()) return [];
		if (item.isDirectory()) {
			if (item.name.startsWith(".") || excludedDirs.has(item.name)) return [];
			return walk(root, relative);
		}
		return item.isFile() ? [relative] : [];
	});
}

export function resolveLocalLink(value, from, files, sourceRoot = "D:/Evan/html") {
	if (!value || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(value)) return null;
	let decoded;
	try { decoded = decodeURIComponent(value); } catch { return { unavailable: "链接格式不完整" }; }
	const [, pathname, suffix = ""] = decoded.match(/^([^?#]*)([?#][\s\S]*)?$/);
	let relative = slash(pathname).replace(/^file:\/\/\//i, "/").replace(/^\/(?=[A-Za-z]:)/, "");
	const roots = [slash(sourceRoot).replace(/\/$/, ""), "D:/Evan/html", "D:/Evan/Codes/reports"];
	const matchedRoot = roots.find(root => relative.toLowerCase().startsWith(`${root.toLowerCase()}/`));
	if (matchedRoot) relative = relative.slice(matchedRoot.length + 1);
	else if (/^[A-Za-z]:|^file:/i.test(relative)) return { unavailable: "此链接指向未收录的本机源文件" };
	else if (relative.startsWith("/")) relative = relative.slice(1);
	else relative = path.posix.join(path.posix.dirname(from), relative);
	relative = path.posix.normalize(relative);
	if (relative === ".." || relative.startsWith("../")) return { unavailable: "此链接指向内容库外的本机源文件" };
	if (relative === ".") relative = "index.html";
	if (!files.has(relative) && files.has(`${relative.replace(/\/$/, "")}/index.html`)) relative = `${relative.replace(/\/$/, "")}/index.html`;
	let repairedFrom;
	if (!files.has(relative) && !matchedRoot && !/^[A-Za-z]:|^file:/i.test(pathname)) {
		let ancestor = path.posix.dirname(from);
		while (ancestor !== ".") {
			ancestor = path.posix.dirname(ancestor);
			const candidate = path.posix.normalize(path.posix.join(ancestor, slash(pathname).replace(/^\//, "")));
			if (!candidate.startsWith("../") && files.has(candidate)) { repairedFrom = relative; relative = candidate; break; }
		}
	}
	if (!files.has(relative)) return { unavailable: "原始目录中没有此文件，或它是未发布的运行文件", target: relative };
	const linked = path.posix.relative(path.posix.dirname(publishedPath(from)), publishedPath(relative)) || path.posix.basename(publishedPath(relative));
	return { href: `${encodePath(linked)}${suffix}`, target: relative, ...(repairedFrom ? { repairedFrom } : {}) };
}

export function findReportDate(relative, title, text) {
	for (const value of [title, relative, text.slice(0, 1800)]) {
		const match = value.match(/(?<!\d)(20\d{2})[-_年]?(0[1-9]|1[0-2])[-_月]?(0[1-9]|[12]\d|3[01])(?:日|\b|_|T|\d{4})/);
		if (match) return `${match[1]}-${match[2]}-${match[3]}`;
	}
	return null;
}

function writeChanged(filename, contents) {
	const buffer = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
	if (fs.existsSync(filename) && hash(fs.readFileSync(filename)) === hash(buffer)) return false;
	fs.mkdirSync(path.dirname(filename), { recursive: true });
	fs.writeFileSync(filename, buffer);
	return true;
}

export const defaultSource = () => process.env.RESEARCH_SOURCE_DIR || (process.platform === "win32" ? "D:/Evan/html" : path.join(os.homedir(), "html"));

export async function syncLibrary({ merge = false, source = defaultSource(), destination = path.join(projectRoot, "public/research-library"), reportFile = path.join(projectRoot, "research-library/sync-report.json") } = {}) {
	source = path.resolve(source);
	destination = path.resolve(destination);
	if (!fs.existsSync(path.join(source, "index.html"))) throw new Error(`Source index.html not found: ${source}`);
	if (destination === source || destination.startsWith(`${source}${path.sep}`) || source.startsWith(`${destination}${path.sep}`)) throw new Error("Source and destination must not overlap.");
	const contentRoot = path.join(destination, "content");
	const previousCatalogFile = path.join(destination, "catalog.json");
	const previousCatalog = fs.existsSync(previousCatalogFile) ? JSON.parse(fs.readFileSync(previousCatalogFile, "utf8")) : {};
	const previousFile = path.join(destination, ".sync-manifest.json");
	const previous = fs.existsSync(previousFile) ? JSON.parse(fs.readFileSync(previousFile, "utf8")) : { files: [], sourceHashes: {} };
	const versionOf = filename => fs.existsSync(path.join(destination, filename)) ? hash(fs.readFileSync(path.join(destination, filename))).slice(0, 12) : "1";
	const readerCssVersion = versionOf("_ui/reader.css");
	const readerJsVersion = versionOf("_ui/reader.js");
	const allFiles = walk(source);
	const included = allFiles.filter(shouldInclude).sort();
	const fileSet = new Set(included);
	const entries = merge ? (previousCatalog.entries || []).filter(entry => !fileSet.has(entry.id)) : [];
	const attachments = merge ? (previousCatalog.attachments || []).filter(entry => !fileSet.has(entry.id)) : [];
	const issues = [];
	const repairedLinks = [];
	const sourceHashes = merge ? { ...previous.sourceHashes } : {};
	let changed = 0;
	let totalBytes = 0;
		for (const relative of included) {
			const input = fs.readFileSync(path.join(source, relative));
			sourceHashes[relative] = hash(input);
			totalBytes += input.length;
			let output = input;
			const group = relative.includes("/") ? relative.split("/")[0] : "overview";
			const details = collections[group] || [group === "overview" ? "原始总入口" : group, "engineering", "专题报告与相关资料。"];
			if (/\.html?$/i.test(relative)) {
				const $ = load(input.toString("utf8").replace(/^\uFEFF/, ""));
				const title = compact($("title").first().text() || $("h1").first().text() || path.basename(relative));
				const text = compact($("h1, h2, h3, p, time, .meta, .subtitle").map((_, node) => $(node).text()).get().join(" "));
				const description = compact($('meta[name="description"]').attr("content") || $("header p, .hero p, main > p, p").first().text() || details[2]).slice(0, 180);
				const date = findReportDate(relative, title, text);
				entries.push({ id: relative, title, description, collection: group, category: details[1], date, modifiedAt: fs.statSync(path.join(source, relative)).mtime.toISOString(), href: `content/${encodePath(publishedPath(relative))}`, searchText: text.slice(0, 1000), isArchive: /(?:archive\/|backup|before[_-]|\.bak\.)/i.test(relative) || (!/^(index|latest)\.html?$/i.test(path.basename(relative)) && Boolean(date)) });
				for (const node of $("a[href], img[src], script[src], link[href], iframe[src], source[src]").toArray()) {
					const element = $(node);
					const attribute = element.attr("href") !== undefined ? "href" : "src";
					const result = resolveLocalLink(element.attr(attribute), relative, fileSet, source);
					if (!result) continue;
					if (result.repairedFrom) repairedLinks.push({ file: relative, from: result.repairedFrom, target: result.target });
					if (result.href) element.attr(attribute, result.href);
					else {
						issues.push({ file: relative, target: result.target || element.attr(attribute), reason: result.unavailable, element: node.tagName });
						if (node.tagName === "a") {
							element.attr("data-library-unavailable", result.unavailable);
							element.attr("href", "#library-source-note");
							element.removeAttr("target");
							element.attr("title", result.unavailable);
						}
					}
				}
				if (!$('meta[name="viewport"]').length) $("head").append('<meta name="viewport">');
				$('meta[name="viewport"]').attr("content", "width=device-width, initial-scale=1, viewport-fit=cover");
				$("html").attr("data-library-page", "").attr("lang", $("html").attr("lang") || "zh-CN");
				const root = "../".repeat(relative.split("/").length);
				$("head").append(`<link rel="stylesheet" href="${root}_ui/reader.css?v=${readerCssVersion}">`);
				$("body").prepend(`<nav class="rl-reader-toolbar" aria-label="报告导航"><a class="rl-reader-home" href="${root}index.html">← 内容中心</a><a class="rl-reader-collection" href="${root}index.html?collection=${encodeURIComponent(group)}&view=reports">${escapeHtml(details[0])}</a><button type="button" data-reader-font aria-label="放大正文字号" aria-pressed="false">字号 A+</button><button type="button" data-reader-top>回顶部 ↑</button></nav>`);
				$("body").append(`<script src="${root}_ui/reader.js?v=${readerJsVersion}" defer></script>`);
				output = $.html();
			}
			else if (/\.(?:jsonl?|csv|tsv|md|txt|pdf)$/i.test(relative) || isManualAttachment(relative)) {
				attachments.push({ id: relative, title: path.basename(relative), collection: group, category: details[1], href: `content/${encodePath(publishedPath(relative))}`, bytes: input.length, type: isManualAttachment(relative) ? "TXT" : path.extname(relative).slice(1).toUpperCase() });
			}
			if (writeChanged(path.join(contentRoot, publishedPath(relative)), output)) changed++;
		}
	const grouped = [...new Set([...entries, ...attachments].map(entry => entry.collection))].filter(group => group !== "overview").map(group => {
		const pages = entries.filter(entry => entry.collection === group);
		const details = collections[group] || [group, "engineering", "专题报告与相关资料。"];
		const landing = pages.find(entry => entry.id === `${group}/latest.html`) || pages.find(entry => entry.id === `${group}/index.html`) || pages[0];
		return { id: group, title: details[0], category: details[1], description: details[2], pageCount: pages.length, attachmentCount: attachments.filter(entry => entry.collection === group).length, href: landing?.href || null, date: landing?.date || null };
	});
	const managedFiles = [...new Set([...(merge ? previous.files.filter(relative => !fileSet.has(relative) || publishedPath(relative) === relative) : []), ...included.map(publishedPath)])].sort();
	const managedSet = new Set(managedFiles);
	const removed = previous.files.filter(relative => !managedSet.has(relative));
	for (const relative of removed) {
		const target = path.resolve(contentRoot, relative);
		if (!target.startsWith(`${contentRoot}${path.sep}`)) throw new Error("Invalid previous manifest path.");
		if (fs.existsSync(target) && fs.lstatSync(target).isFile()) fs.unlinkSync(target);
	}
	totalBytes = managedFiles.reduce((sum, relative) => sum + fs.statSync(path.join(contentRoot, relative)).size, 0);
	const fingerprint = hash(JSON.stringify(Object.entries(sourceHashes).sort(([a], [b]) => a.localeCompare(b))));
	const syncedAt = previousCatalog.fingerprint === fingerprint ? previousCatalog.syncedAt : new Date().toISOString();
	const catalog = { version: 1, fingerprint, syncedAt, categories, collections: grouped, entries, attachments, totalBytes };
	writeChanged(previousCatalogFile, `${JSON.stringify(catalog)}\n`);
	writeChanged(previousFile, `${JSON.stringify({ files: managedFiles, sourceHashes }, null, 2)}\n`);
	const portalIndex = path.join(destination, "index.html");
	if (fs.existsSync(portalIndex)) {
		const indexHtml = fs.readFileSync(portalIndex, "utf8").replace(/_ui\/catalog\.(css|js)(?:\?v=[a-z0-9]+)?/g, (_, extension) => `_ui/catalog.${extension}?v=${versionOf(`_ui/catalog.${extension}`)}`);
		writeChanged(portalIndex, indexHtml);
	}
	const report = { source, destination, syncedAt, htmlPages: entries.length, collections: grouped.length, attachments: attachments.length, copiedFiles: included.length, copiedBytes: totalBytes, changedFiles: changed, removedFiles: removed, excludedDirectories: ["hidden directories / browser profiles", ...excludedDirs], excludedFiles: allFiles.filter(file => !fileSet.has(file)), repairedLinks, unavailableLinks: issues, fingerprint };
	writeChanged(reportFile, `${JSON.stringify(report, null, 2)}\n`);
	return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const sourceIndex = process.argv.indexOf("--source");
	const report = await syncLibrary({ ...(sourceIndex >= 0 ? { source: process.argv[sourceIndex + 1] } : {}), merge: process.argv.includes("--merge") });
	console.log(JSON.stringify({ htmlPages: report.htmlPages, collections: report.collections, attachments: report.attachments, copiedFiles: report.copiedFiles, changedFiles: report.changedFiles, unavailableLinks: report.unavailableLinks.length, MiB: Math.round(report.copiedBytes / 1024 / 1024 * 100) / 100 }, null, 2));
}
