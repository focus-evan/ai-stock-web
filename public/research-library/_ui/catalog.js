const PAGE_SIZE = 24;
const html = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
export const safeHref = value => typeof value === "string" && value.startsWith("content/") && !/\.\.|[<>"'\\]|%2e|%2f|%5c/i.test(value) ? value : "#";
export const matches = (entry, query) => query.toLowerCase().trim().split(/\s+/).filter(Boolean).every(word => `${entry.title} ${entry.description || ""} ${entry.searchText || ""} ${entry.id}`.toLowerCase().includes(word));
export function filterItems(items, state) {
	return items.filter(entry => (!state.category || entry.category === state.category) && (!state.collection || entry.collection === state.collection) && (state.archives || !entry.isArchive) && matches(entry, state.query)).sort((a, b) => state.sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title, "zh-CN"));
}
function fileSize(bytes) {
	return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function readState() {
	const params = new URLSearchParams(location.search);
	return { query: params.get("q") || "", category: params.get("category") || "", collection: params.get("collection") || "", view: ["collections", "reports", "attachments"].includes(params.get("view")) ? params.get("view") : "collections", archives: params.get("archives") !== "0", sort: params.get("sort") === "title" ? "title" : "recent", page: Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1) };
}

export async function startLibrary() {
	let catalog;
	const results = document.querySelector("#results");
	try {
		const response = await fetch("catalog.json", { cache: "no-cache" });
		if (!response.ok)
			throw new Error("catalog unavailable");
		catalog = await response.json();
		if (!Array.isArray(catalog.entries) || !Array.isArray(catalog.collections) || !Array.isArray(catalog.attachments))
			throw new Error("invalid catalog");
	}
	catch {
		results.innerHTML = "<div class=\"empty-state\" role=\"alert\"><h2>内容目录暂时无法加载</h2><p>请检查网络后重试，也可以先查看原始目录。</p><button type=\"button\" onclick=\"location.reload()\">重新加载</button><p><a href=\"content/index.html\">打开原始目录 →</a></p></div>";
		document.querySelector("#library-stats").textContent = "目录暂未加载";
		return;
	}
	let state = readState();
	const names = Object.fromEntries(catalog.collections.map(item => [item.id, item.title]));
	const categoryNames = Object.fromEntries(catalog.categories.map(item => [item.id, item.title]));
	const categorySymbols = { radar: "观", research: "研", strategy: "策", method: "法", engineering: "工" };
	const search = document.querySelector("#search");
	const sort = document.querySelector("#sort");
	const archives = document.querySelector("#archives");
	document.querySelector("#library-stats").innerHTML = [[catalog.collections.length, "专题入口"], [catalog.entries.length, "报告页面"], [catalog.attachments.length, "资料附件"]].map(([count, label]) => `<div><span class="stat-number">${count.toLocaleString("zh-CN")}</span><span class="stat-label">${label}</span></div>`).join("");
	document.querySelector("#sync-date").textContent = `内容同步于 ${new Date(catalog.syncedAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
	function update(next, replace = false) {
		state = { ...state, page: 1, ...next };
		const params = new URLSearchParams();
		if (state.query)
			params.set("q", state.query);
		if (state.category)
			params.set("category", state.category);
		if (state.collection)
			params.set("collection", state.collection);
		if (state.view !== "collections")
			params.set("view", state.view);
		if (!state.archives)
			params.set("archives", "0");
		if (state.sort !== "recent")
			params.set("sort", state.sort);
		if (state.page > 1)
			params.set("page", String(state.page));
		history[replace ? "replaceState" : "pushState"]({}, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
		render();
	}
	function render() {
		search.value = state.query;
		sort.value = state.sort;
		archives.checked = state.archives;
		document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-selected", String(button.dataset.view === state.view)));
		document.querySelector("#archive-option").hidden = state.view !== "reports";
		document.querySelector("#reset").hidden = !state.query && !state.category && !state.collection;
		document.querySelector("#categories").innerHTML = [{ id: "", title: "全部内容" }, ...catalog.categories].map(item => `<button type="button" class="category-chip ${state.category === item.id ? "active" : ""}" data-category="${html(item.id)}" aria-pressed="${state.category === item.id}">${html(item.title)}<small>${item.id ? catalog.collections.filter(group => group.category === item.id).length : catalog.collections.length}</small></button>`).join("");
		const collection = catalog.collections.find(item => item.id === state.collection);
		document.querySelector("#collection-context").innerHTML = collection ? `<div class="collection-context"><div><h2>${html(collection.title)}</h2><p>${html(collection.description)}</p></div>${collection.href ? `<a href="${html(safeHref(collection.href))}">打开专题首页 ↗</a>` : ""}</div>` : "";
		let items;
		if (state.view === "collections") {
			items = catalog.collections.filter(item => (!state.category || item.category === state.category) && (!state.collection || item.id === state.collection) && matches(item, state.query));
			items.sort((a, b) => state.sort === "title" ? a.title.localeCompare(b.title, "zh-CN") : (b.date || "").localeCompare(a.date || "") || a.title.localeCompare(b.title, "zh-CN"));
		}
		else {
			items = filterItems(state.view === "reports" ? catalog.entries : catalog.attachments, state);
		}
		const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
		state.page = Math.min(state.page, pageCount);
		const visible = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
		const unit = state.view === "collections" ? "个专题" : state.view === "reports" ? "篇报告" : "份资料";
		document.querySelector("#result-count").textContent = `${state.query ? `“${state.query}” · ` : ""}${state.collection ? `${names[state.collection] || "当前专题"} · ` : ""}${items.length} ${unit}${state.view === "reports" ? " · 日期以报告内容为准" : ""}`;
		if (!items.length)
			results.innerHTML = "<div class=\"empty-state\"><h2>暂时没有找到相关内容</h2><p>试试缩短关键词，或清除分类与专题筛选。</p><button type=\"button\" data-reset>查看全部内容</button></div>";
		else if (state.view === "collections")
			results.innerHTML = `<div class="collection-grid">${visible.map(item => `<article class="collection-card" data-category="${html(item.category)}"><a class="collection-card-main" href="${item.href ? html(safeHref(item.href)) : `?collection=${encodeURIComponent(item.id)}&view=attachments`}"><div class="collection-label"><span>${html(categoryNames[item.category])}</span><span class="collection-symbol" aria-hidden="true">${categorySymbols[item.category] || "研"}</span></div><h2>${html(item.title)}</h2><p>${html(item.description)}</p></a><div class="collection-card-footer"><span>${item.pageCount} 篇报告${item.attachmentCount ? ` · ${item.attachmentCount} 份资料` : ""}</span><a href="?collection=${encodeURIComponent(item.id)}&view=${item.pageCount ? "reports" : "attachments"}" data-collection="${html(item.id)}" data-collection-view="${item.pageCount ? "reports" : "attachments"}">浏览全部 <span aria-hidden="true">→</span></a></div></article>`).join("")}</div>`;
		else results.innerHTML = `<div class="report-list">${visible.map(item => state.view === "reports" ? `<a class="report-row" href="${html(safeHref(item.href))}"><div class="report-date">${item.date ? html(item.date) : "日期未标注"}${/\/latest\.html$/.test(item.id) ? "<br><strong>专题当前页</strong>" : ""}</div><div class="report-body"><h2>${html(item.title)}</h2><p>${html(item.description)}</p><div class="report-meta"><span class="report-tag">${html(names[item.collection] || "原始目录")}</span>${item.isArchive ? "<span class=\"report-tag\">历史记录</span>" : ""}</div></div><span class="report-arrow" aria-hidden="true">↗</span></a>` : `<a class="report-row attachment-row" href="${html(safeHref(item.href))}" target="_blank" rel="noopener"><div class="report-date">${html(item.type)}</div><div class="report-body"><h2>${html(item.title)}</h2><p class="file-path">${html(item.id)}</p><div class="report-meta"><span>${html(names[item.collection] || "资料")}</span><span>· ${fileSize(item.bytes)}</span><span>· 新窗口查看</span></div></div><span class="report-arrow" aria-hidden="true">↗</span></a>`).join("")}</div>`;
		document.querySelector("#pagination").innerHTML = pageCount > 1 ? `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>← 上一页</button><span>${state.page} / ${pageCount}</span><button type="button" data-page="${state.page + 1}" ${state.page === pageCount ? "disabled" : ""}>下一页 →</button>` : "";
	}
	let timer;
	search.addEventListener("input", () => {
		clearTimeout(timer);
		timer = setTimeout(() => update({ query: search.value, view: search.value.trim() ? "reports" : state.view }, true), 180);
	});
	sort.addEventListener("change", () => update({ sort: sort.value }));
	archives.addEventListener("change", () => update({ archives: archives.checked }));
	document.addEventListener("click", (event) => {
		const button = event.target.closest("[data-view],button[data-category],[data-collection],[data-page],[data-reset],#reset");
		if (!button || button.disabled)
			return;
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
			return;
		event.preventDefault();
		if (button.hasAttribute("data-view")) {
			update({ view: button.dataset.view });
		}
		else if (button.hasAttribute("data-category") && button.tagName === "BUTTON") {
			update({ category: button.dataset.category, collection: "" });
		}
		else if (button.hasAttribute("data-collection")) {
			update({ collection: button.dataset.collection, view: button.dataset.collectionView, query: "" });
		}
		else if (button.hasAttribute("data-page")) {
			update({ page: Number(button.dataset.page) });
			results.scrollIntoView({ block: "start" });
			results.focus({ preventScroll: true });
		}
		else if (button.hasAttribute("data-reset") || button.id === "reset") {
			update({ query: "", category: "", collection: "", archives: true });
		}
	});
	window.addEventListener("popstate", () => {
		state = readState();
		render();
	});
	render();
}

if (typeof document !== "undefined" && document.querySelector("#library-stats"))
	startLibrary();
