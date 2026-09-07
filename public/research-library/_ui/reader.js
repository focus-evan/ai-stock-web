(() => {
	const root = document.documentElement;
	const toolbar = document.querySelector(".rl-reader-toolbar");
	if (!toolbar)
		return;
	for (const table of document.querySelectorAll("table")) {
		if (table.parentElement?.classList.contains("rl-table-scroll"))
			continue;
		const wrapper = document.createElement("div");
		wrapper.className = "rl-table-scroll";
		wrapper.setAttribute("role", "region");
		wrapper.setAttribute("aria-label", "数据表格，可左右滑动查看");
		wrapper.tabIndex = 0;
		table.before(wrapper);
		wrapper.append(table);
	}
	const adaptGrids = () => {
		if (!matchMedia("(max-width: 768px)").matches)
			return;
		for (const element of document.querySelectorAll("main, section, article, div, header")) {
			if (element.closest(".rl-reader-toolbar, .rl-table-scroll"))
				continue;
			if (getComputedStyle(element).display === "grid")
				element.classList.add("rl-stack");
		}
	};
	adaptGrids();
	window.addEventListener("resize", adaptGrids, { passive: true });
	let noteTimer;
	document.addEventListener("click", (event) => {
		const anchor = event.target.closest("a[data-library-unavailable]");
		if (!anchor)
			return;
		event.preventDefault();
		let note = document.querySelector(".rl-source-note");
		if (!note) {
			note = document.createElement("div");
			note.className = "rl-source-note";
			note.setAttribute("role", "status");
			document.body.append(note);
		}
		note.textContent = `${anchor.dataset.libraryUnavailable}。报告正文仍可正常阅读。`;
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => note.remove(), 4500);
	});
	const fontButton = toolbar.querySelector("[data-reader-font]");
	fontButton.addEventListener("click", () => {
		const large = root.toggleAttribute("data-library-large");
		fontButton.setAttribute("aria-pressed", String(large));
		fontButton.setAttribute("aria-label", large ? "恢复正文字号" : "放大正文字号");
		fontButton.textContent = large ? "字号 A−" : "字号 A+";
	});
	toolbar.querySelector("[data-reader-top]").addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
})();
