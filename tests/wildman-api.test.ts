import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWildmanDaily, fetchWildmanHoldings } from "../src/api/wildman";
import { request } from "../src/utils/request";

vi.mock("#src/utils/request", () => ({ request: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
describe("wildman read-only API contracts", () => {
	it("uses authenticated GET readers and preserves zero holdings only when the response is complete", async () => {
		vi.mocked(request.get).mockReturnValue({ json: async () => ({ status: "success", data: { source: "user_recorded", items: [], total: 0, initialized: 0, pending: 0 } }) } as ReturnType<typeof request.get>);
		const controller = new AbortController();
		expect((await fetchWildmanHoldings(controller.signal)).total).toBe(0);
		expect(request.get).toHaveBeenCalledWith("strategy/combined/watchlist/holdings-summary", expect.objectContaining({ signal: controller.signal, retry: 0 }));
		expect(request.post).not.toHaveBeenCalled();
	});
	it("rejects missing data and application failures instead of manufacturing empty results", async () => {
		vi.mocked(request.get).mockReturnValue({ json: async () => ({ status: "error", data: { recommended: [], not_recommended: [] } }) } as ReturnType<typeof request.get>);
		await expect(fetchWildmanDaily()).rejects.toThrow("每日研判数据不完整");
		vi.mocked(request.get).mockReturnValue({ json: async () => ({ status: "success", data: { source: "user_recorded", items: [] } }) } as ReturnType<typeof request.get>);
		await expect(fetchWildmanHoldings()).rejects.toThrow("持仓摘要数据不完整");
		expect(request.post).not.toHaveBeenCalled();
	});
});
