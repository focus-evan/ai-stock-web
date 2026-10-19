(() => {
	"use strict";
	if (window.__douyinRecordsReady || !/(?:^|\/)douyin(?:\/|$)/.test(location.pathname))
		return;
	window.__douyinRecordsReady = true;
	const API = "/api/research/douyin/reading";
	const AUTH_KEY = "react-antd-admin-0.0.0-prod-access-token";
	const SIGNAL = "douyin:reading:server-update:v1";
	let serverRecords = {};
	let serverView = { sort: "liked", filter: "all" };
	let ready = false;
	let activeToken = "";
	let generation = 0;
	const pending = new Set();
	const authToken = () => {
		try {
			return JSON.parse(localStorage.getItem(AUTH_KEY) || "{}")?.state?.token || "";
		}
		catch {
			return "";
		}
	};
	const validId = value => /^\d{5,30}$/.test(value || "");
	const idFrom = (value) => {
		if (validId(value))
			return value;
		const match = String(value || "").match(/(?:^|[_/])(\d{5,30})(?:\.html?|[/?#]|$)/);
		return match?.[1] || "";
	};
	const element = (tag, cls, text) => {
		const node = document.createElement(tag);
		if (cls)
			node.className = cls;
		if (text !== undefined)
			node.textContent = text;
		return node;
	};
	const button = (text, label) => {
		const node = element("button", "dyr-button", text);
		node.type = "button";
		if (label)
			node.setAttribute("aria-label", label);
		return node;
	};
	const links = [...document.querySelectorAll("a.video-link")];
	const records = [];
	for (const link of links) {
		const id = idFrom(link.dataset.awemeId) || idFrom(link.getAttribute("href"));
		if (!id)
			continue;
		const parent = link.parentElement;
		const row = element("div", "dyr-record");
		row.dataset.awemeId = id;
		link.before(row);
		row.append(link);
		const title = link.querySelector("strong")?.textContent.trim() || link.textContent.trim();
		const date = link.querySelector("small")?.textContent.match(/20\d{2}-\d{2}-\d{2}/)?.[0] || "";
		records.push({ id, row, parent, title, date, href: link.href, search: link.textContent.toLocaleLowerCase(), order: records.length, detail: false });
	}
	if (!records.length && /\/videos\//.test(location.pathname)) {
		const id = idFrom(location.pathname) || [...document.querySelectorAll("a[href]")].map(a => idFrom(a.href)).find(Boolean);
		const heading = document.querySelector("h1");
		if (id && heading) {
			const row = element("section", "dyr-detail");
			heading.after(row);
			records.push({ id, row, title: heading.textContent.trim(), date: "", href: location.href, search: "", order: 0, detail: true });
		}
	}
	if (!records.length)
		return;
	const detail = records[0].detail;
	const style = element("style");
	style.textContent = `
    .dyr-panel{margin:20px 0;padding:18px 20px;background:#fff;border:1px solid #dce3eb;border-radius:12px;color:#253247}
    .dyr-panel h2{margin:0 0 6px;font-size:20px}.dyr-help{margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.6}
    .dyr-toolbar,.dyr-filters,.dyr-controls{display:flex;align-items:center;flex-wrap:wrap;gap:9px}.dyr-toolbar{margin-top:12px}
    .dyr-button,.dyr-select{font:inherit;line-height:1.5;padding:7px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#344054;cursor:pointer}
    .dyr-button[aria-pressed="true"]{background:#fff0f2;color:#bf1539;border-color:#e85c79}.dyr-button:focus-visible,.dyr-select:focus-visible,.dyr-search:focus-visible{outline:3px solid #83b9f5;outline-offset:2px}
    .dyr-button.dyr-delete{color:#a72b37}.dyr-search{font:inherit;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#253247;flex:1;min-width:170px;max-width:500px}
    .dyr-count,.dyr-status,.dyr-tag{font-size:13px;color:#64748b}.dyr-status{margin-top:10px;line-height:1.7}.dyr-status:empty{display:none}.dyr-status .dyr-button{margin-left:10px}
    .dyr-record{margin:0 0 12px;border:1px solid #dbe4ef;border-radius:12px;background:var(--panel,#fff);overflow:hidden;min-width:0}
    .dyr-record>a.video-link{border:0!important;margin:0!important;border-radius:0!important;min-width:0}.dyr-record[data-liked="true"]{border-color:#e97e94}
    .dyr-controls{padding:10px 16px 13px;justify-content:flex-end;border-top:1px solid #edf0f4}.dyr-detail{margin:16px 0}.dyr-detail .dyr-controls{justify-content:flex-start;padding:12px 0}
    .dyr-record[hidden]{display:none!important}.dyr-record[data-deleted="true"]{background:#fff8f8}.dyr-empty{padding:24px;color:#64748b;text-align:center;border:1px dashed #cbd5e1;border-radius:10px}.dyr-empty[hidden]{display:none!important}
    @media(max-width:650px){.dyr-panel{padding:15px}.dyr-controls{justify-content:flex-start}.dyr-search{width:100%;max-width:none}.dyr-button{padding:7px 11px}.dyr-record>a.video-link{grid-template-columns:35px minmax(0,1fr)}.dyr-record>a.video-link small{grid-column:2}.dyr-toolbar label{display:flex;align-items:center;gap:8px}}
  `;
	document.head.append(style);
	const panel = element("section", "dyr-panel");
	panel.setAttribute("aria-label", "文案阅读整理");
	panel.append(element("h2", "", detail ? "这篇文案" : "整理文案，留待后读"));
	panel.append(element("p", "dyr-help", "点赞用于个人阅读排序，与抖音平台点赞数无关。登录后跟随账号同步，电脑与手机共用；删除可恢复。"));
	const filters = element("div", "dyr-filters");
	filters.setAttribute("role", "group");
	filters.setAttribute("aria-label", "文案筛选");
	const toolbar = element("div", "dyr-toolbar");
	const search = element("input", "dyr-search");
	search.type = "search";
	search.placeholder = "搜索标题或摘要";
	search.setAttribute("aria-label", "搜索文案");
	const sortLabel = element("label", "", "排序 ");
	const sort = element("select", "dyr-select");
	sort.setAttribute("aria-label", "文案排序");
	for (const [value, text] of [["liked", "点赞优先"], ["recent", "最近点赞"], ["original", "原始顺序"], ["published", "最新发布"]]) {
		const option = element("option", "", text);
		option.value = value;
		sort.append(option);
	}
	sortLabel.append(sort);
	const count = element("span", "dyr-count");
	count.setAttribute("role", "status");
	toolbar.append(search, sortLabel, count);
	if (!detail)
		panel.append(filters, toolbar);
	const status = element("div", "dyr-status");
	status.setAttribute("role", "status");
	status.setAttribute("aria-live", "polite");
	panel.append(status);
	const syncRow = element("div", "dyr-toolbar");
	const syncButton = button("刷新同步", "刷新账号阅读标记");
	const syncLabel = element("span", "dyr-count", "正在读取账号标记…");
	const login = element("a", "dyr-button", "登录后同步");
	login.href = "/login";
	login.target = "_blank";
	login.rel = "noopener";
	login.title = "登录后返回本页，阅读标记会自动同步";
	login.hidden = true;
	syncRow.append(syncLabel, syncButton, login);
	panel.append(syncRow);
	if (detail)
		records[0].row.before(panel);
	else
		records[0].parent.before(panel);
	const empty = element("div", "dyr-empty", "没有符合条件的文案，可切换筛选或清空搜索。");
	empty.hidden = true;
	if (!detail)
		records.at(-1).parent.after(empty);
	let active = "all";
	const announce = (text, undo) => {
		status.replaceChildren(document.createTextNode(text));
		if (undo) {
			const b = button("撤销", "撤销本次删除");
			b.addEventListener("click", undo);
			status.append(b);
		}
	};
	function read(id) {
		return serverRecords[id] || { liked: false, deleted: false, likedAt: 0 };
	}
	async function request(suffix = "", method = "GET", body) {
		const token = authToken();
		if (!token)
			throw Object.assign(new Error("请登录后同步阅读标记。"), { auth: true });
		const response = await fetch(API + suffix, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(12000) });
		if (token !== authToken())
			throw Object.assign(new Error("登录账号已改变，请刷新同步。"), { auth: true });
		if (response.status === 401 || response.status === 403)
			throw Object.assign(new Error("登录已失效，请重新登录后同步。"), { auth: true });
		if (!response.ok)
			throw new Error("服务暂时不可用，请稍后刷新同步。");
		return response.json();
	}
	function authFailure(error) {
		if (error.auth) {
			ready = false;
			serverRecords = {};
			active = "all";
			login.hidden = false;
			syncLabel.textContent = error.message;
			apply();
		}
	}
	async function refresh() {
		if (pending.size)
			return;
		const current = ++generation;
		if (activeToken !== authToken()) {
			ready = false;
			serverRecords = {};
			active = "all";
			sort.value = "liked";
			apply();
		}
		ready = false;
		apply();
		syncButton.disabled = true;
		try {
			const result = await request();
			if (current !== generation)
				return;
			serverRecords = result.records || {};
			serverView = result.preferences || { sort: "liked", filter: "all" };
			active = serverView.filter;
			sort.value = serverView.sort;
			activeToken = authToken();
			ready = true;
			login.hidden = true;
			syncLabel.textContent = `已同步到账号：${result.user.name} · 跨设备保存`;
			apply();
		}
		catch (error) {
			if (current !== generation)
				return;
			ready = false;
			authFailure(error);
			syncLabel.textContent = error.message;
			apply();
		}
		finally {
			if (current === generation)
				syncButton.disabled = false;
		}
	}
	async function persist(record, patch, success, undo) {
		if (!ready || pending.has(record.id))
			return false;
		pending.add(record.id);
		apply();
		try {
			const next = await request(`/${record.id}`, "PATCH", patch);
			serverRecords[record.id] = next;
			announce(success, undo);
			try {
				localStorage.setItem(SIGNAL, String(Date.now()));
			}
			catch { /* server save already succeeded */ }
			return true;
		}
		catch (error) {
			authFailure(error);
			announce(`保存未完成，未显示为成功。${error.message}`);
			return false;
		}
		finally {
			pending.delete(record.id);
			apply();
		}
	}
	const filterButtons = new Map();
	for (const [key, label] of [["all", "全部"], ["liked", "已点赞"], ["deleted", "已删除"]]) {
		const b = button(label);
		b.dataset.filter = key;
		b.addEventListener("click", () => {
			active = key;
			apply();
			saveView();
		});
		filters.append(b);
		filterButtons.set(key, { b, label });
	}
	for (const record of records) {
		const controls = element("div", "dyr-controls");
		const tag = element("span", "dyr-tag");
		const like = button("♡ 点赞", `点赞：${record.title}`);
		like.dataset.action = "like";
		const remove = button("删除", `删除：${record.title}`);
		remove.classList.add("dyr-delete");
		remove.dataset.action = "delete";
		const restore = button("恢复", `恢复：${record.title}`);
		restore.dataset.action = "restore";
		like.addEventListener("click", () => {
			const liked = !read(record.id).liked;
			persist(record, { liked }, liked ? "已点赞并同步到账号。" : "已取消点赞并同步。");
		});
		remove.addEventListener("click", () => persist(record, { deleted: true }, "已移到“已删除”并同步，文案原文保留。", () => persist(record, { deleted: false }, "已恢复并同步。")));
		restore.addEventListener("click", () => persist(record, { deleted: false }, "已恢复并同步，原来的点赞标记仍保留。"));
		controls.append(tag, like, remove, restore);
		record.row.append(controls);
		Object.assign(record, { tag, like, remove, restore });
	}
	async function saveView() {
		if (!ready)
			return;
		pending.add("view");
		sort.disabled = true;
		for (const { b } of filterButtons.values())
			b.disabled = true;
		try {
			serverView = await request("/preferences", "PATCH", { filter: active, sort: sort.value });
			try {
				localStorage.setItem(SIGNAL, String(Date.now()));
			}
			catch { }
		}
		catch (error) {
			active = serverView.filter;
			sort.value = serverView.sort;
			authFailure(error);
			announce(`排序筛选未保存。${error.message}`);
		}
		finally {
			pending.delete("view");
			apply();
		}
	}
	function apply() {
		const q = search.value.trim().toLocaleLowerCase();
		const states = new Map();
		const unique = new Set();
		let shown = 0;
		let all = 0;
		let liked = 0;
		let deleted = 0;
		for (const record of records) {
			const state = read(record.id);
			states.set(record.id, state);
			if (!unique.has(record.id)) {
				unique.add(record.id);
				if (state.deleted) {
					deleted++;
				}
				else {
					all++;
					if (state.liked)
						liked++;
				}
			}
			record.like.textContent = state.liked ? "♥ 已点赞" : "♡ 点赞";
			record.like.setAttribute("aria-pressed", String(state.liked));
			record.like.setAttribute("aria-label", `${state.liked ? "取消点赞" : "点赞"}：${record.title}`);
			record.remove.hidden = state.deleted;
			record.restore.hidden = !state.deleted;
			record.row.dataset.liked = String(state.liked);
			record.row.dataset.deleted = String(state.deleted);
			for (const b of [record.like, record.remove, record.restore])
				b.disabled = !ready || pending.has(record.id);
			record.tag.textContent = state.deleted ? "已移入已删除" : ({ life: "生活", industry: "产业", investment: "投资" }[state.category] || "");
			record.row.hidden = !detail && ((active === "deleted" ? !state.deleted : state.deleted || (active === "liked" && !state.liked)) || !record.search.includes(q));
			if (!record.row.hidden)
				shown++;
		}
		const counts = { all, liked, deleted };
		for (const [key, { b, label }] of filterButtons) {
			b.textContent = `${label} ${counts[key]}`;
			b.setAttribute("aria-pressed", String(active === key));
			b.disabled = !ready;
		}
		sort.disabled = !ready;
		count.textContent = `显示 ${shown} 条 · 共 ${unique.size} 条`;
		empty.hidden = shown > 0;
		if (!detail) {
			const sorted = [...records].sort((a, b) => {
				const sa = states.get(a.id);
				const sb = states.get(b.id);
				if (sort.value === "liked" || sort.value === "recent")
					return Number(sb.liked) - Number(sa.liked) || (sort.value === "recent" ? sb.likedAt - sa.likedAt : 0) || a.order - b.order;
				if (sort.value === "published")
					return b.date.localeCompare(a.date) || a.order - b.order;
				return a.order - b.order;
			});
			for (const r of sorted)
				r.parent.append(r.row);
		}
	}
	search.addEventListener("input", apply);
	sort.addEventListener("change", () => {
		apply();
		saveView();
	});
	window.addEventListener("storage", (event) => {
		if (event.key === null || event.key === AUTH_KEY || event.key === SIGNAL)
			refresh();
	});
	window.addEventListener("focus", () => refresh());
	syncButton.addEventListener("click", () => refresh());
	apply();
	refresh();
})();
