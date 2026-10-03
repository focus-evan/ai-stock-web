import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import Industry from "../src/pages/industry";
import { generateMenuItemsFromRoutes } from "../src/router/utils/generate-menu-items-from-routes";

vi.mock("#src/components/basic-content", () => ({ BasicContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("echarts-for-react", () => ({ default: () => <div>chart</div> }));
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

it("keeps the humanoid tab accessible after another industry's request fails", async () => {
	vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/industry/chains"
		? { ok: true, json: async () => ({ success: true, data: [{ code: "ai", name: "AI产业链" }, { code: "humanoid_robot", name: "人形机器人" }] }) }
		: url.endsWith("/ai")
			? { ok: false, status: 500 }
			: { ok: true, json: async () => ({ success: true, data: { name: "人形机器人", layers: [] } }) }));
	render(<Industry />);
	await screen.findByText("加载失败");
	fireEvent.click(screen.getByRole("tab", { name: /人形机器人/ }));
	expect(await screen.findByText("该产业尚无S量化完整批次")).toBeInTheDocument();
});

it("a slow prior industry response cannot replace the selected industry", async () => {
	let complete!: (value: unknown) => void;
	vi.stubGlobal("fetch", vi.fn((url: string) => {
		if (url.endsWith("/ai"))
			return new Promise((resolve) => { complete = resolve; });
		return Promise.resolve({ ok: true, json: async () => url === "/api/industry/chains"
			? ({ success: true, data: [{ code: "ai", name: "AI产业链" }, { code: "humanoid_robot", name: "人形机器人" }] })
			: ({ success: true, data: { layers: [] } }) });
	}));
	render(<Industry />);
	fireEvent.click(await screen.findByRole("tab", { name: /人形机器人/ }));
	await screen.findByText("该产业尚无S量化完整批次");
	await act(async () => complete({ ok: true, json: async () => ({ success: true, data: { layers: [{ id: 1, name: "过期产业内容", technologies: [] }] } }) }));
	expect(screen.queryByText("过期产业内容")).not.toBeInTheDocument();
});

it("renders intelligence and unknown menu icons without leaking component names", () => {
	const items = generateMenuItemsFromRoutes([
		{ path: "/intelligence", handle: { title: "每日重点情报", icon: "ReadOutlined" } },
		{ path: "/future", handle: { title: "未来功能", icon: "MissingOutlined" } },
	]);
	render(
		<MemoryRouter>
			{items.map(item => (
				<div key={item.key}>
					{item.icon}
					{item.label}
				</div>
			))}
		</MemoryRouter>,
	);
	expect(screen.getByText("每日重点情报")).toBeInTheDocument();
	expect(screen.queryByText("ReadOutlined")).not.toBeInTheDocument();
	expect(screen.queryByText("MissingOutlined")).not.toBeInTheDocument();
	expect(screen.getByRole("img", { name: "read" })).toBeInTheDocument();
});
