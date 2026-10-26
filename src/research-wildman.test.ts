import { afterEach, describe, expect, it, vi } from "vitest";
import { enhanceTradingManual } from "./research-wildman";

vi.mock("./styles/wildman-bridge.css?url", () => ({ default: "/assets/wildman-bridge-test.css" }));

function manual() {
	window.history.replaceState({}, "", "/research-library/content/douyin/methods/index.html");
	document.body.innerHTML = "<header><p class=\"hero-copy\">不提供当日荐股。</p><div class=\"hero-actions\"><a class=\"primary-action\" href=\"#decision\">今天该看什么</a><a href=\"#methods\">方法卡</a></div></header><nav class=\"section-menu\"><div class=\"shell\"><a href=\"#rescue\">个股解套</a></div></nav><main><section id=\"map\">原方法</section><section id=\"rescue\"><div class=\"shell\"><form id=\"rescue-form\"><input name=\"cost\" value=\"12.5\"></form></div></section><section id=\"methods\">12张方法卡</section></main>";
}

afterEach(() => {
	window.dispatchEvent(new Event("pagehide"));
	document.body.innerHTML = "";
	document.querySelector("#wildman-live-style")?.remove();
	window.history.replaceState({}, "", "/");
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe("live trading manual bridge", () => {
	it("uses production hash routes for embedded and top-level application navigation", () => {
		vi.stubEnv("VITE_ROUTER_MODE", "hash");
		manual();
		enhanceTradingManual(document);
		expect(document.querySelector("iframe")?.getAttribute("src")).toBe("/#/wildman-widget?tab=daily");
		expect(document.querySelector(".wm-live-intro a")?.getAttribute("href")).toBe("/#/short-term-strategy/stock-analysis?tab=wildman");
	});
	it("only enhances the exact manual, not other public reports", () => {
		manual();
		window.history.replaceState({}, "", "/research-library/content/other/index.html");
		enhanceTradingManual(document);
		expect(document.querySelector("iframe")).toBeNull();
		expect(document.querySelector(".hero-copy")?.textContent).toContain("不提供当日荐股");
	});

	it("mounts once, retains methods and calculator nodes, and never serializes account data", () => {
		manual();
		const form = document.querySelector("#rescue-form");
		const onSubmit = vi.fn((event: Event) => event.preventDefault());
		form?.addEventListener("submit", onSubmit);
		enhanceTradingManual(document);
		enhanceTradingManual(document);
		expect(document.querySelectorAll("iframe")).toHaveLength(1);
		expect(document.querySelectorAll("#wildman-live-style")).toHaveLength(1);
		expect(document.querySelector("main")?.firstElementChild?.id).toBe("wildman-live-workspace");
		expect(document.querySelector("#methods")?.textContent).toBe("12张方法卡");
		expect(document.querySelector("#rescue-form")).toBe(form);
		form?.dispatchEvent(new Event("submit", { cancelable: true }));
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(document.querySelector<HTMLInputElement>("input[name=\"cost\"]")?.value).toBe("12.5");
		expect(document.querySelector<HTMLDetailsElement>("#rescue details")?.open).toBe(false);
		expect(document.querySelector("iframe")?.getAttribute("src")).toBe("/wildman-widget?tab=daily");
	});

	it("rejects foreign or unrelated resize messages and bounds the trusted frame height", () => {
		manual();
		enhanceTradingManual(document);
		const frame = document.querySelector("iframe")!;
		const send = (height: unknown, origin = window.location.origin, source = frame.contentWindow) => window.dispatchEvent(new MessageEvent("message", { origin, source, data: { type: "wildman-workspace-height", height } }));
		send(900, "https://foreign.example");
		send(900, window.location.origin, null);
		send("900");
		send(Number.POSITIVE_INFINITY);
		expect(frame.style.height).toBe("480px");
		send(912);
		expect(frame.style.height).toBe("912px");
		send(1000000);
		expect(frame.style.height).toBe("16000px");
	});

	it("routes the holding button into the same frame without putting credentials in messages", () => {
		manual();
		enhanceTradingManual(document);
		const frame = document.querySelector("iframe")!;
		const post = vi.spyOn(frame.contentWindow!, "postMessage");
		const link = Array.from(document.querySelectorAll<HTMLAnchorElement>(".hero-actions a")).find(item => item.textContent === "带入我的持仓解套")!;
		link.click();
		expect(post).toHaveBeenCalledWith({ type: "wildman-workspace-tab", tab: "unwind" }, window.location.origin);
		expect(document.querySelectorAll("iframe")).toHaveLength(1);
	});
});
