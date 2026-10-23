import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleErrorResponse } from "../src/utils/request/error-response";

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
vi.mock("#src/utils/static-antd", () => ({ message: { error: showError } }));

describe("api error responses", () => {
	beforeEach(() => showError.mockClear());

	it("shows the backend reason and leaves the response readable by the trade dialog", async () => {
		const reason = "请按成交日期顺序登记，早于现有成交的历史补录需先核对账本";
		const response = new Response(JSON.stringify({ detail: reason }), { status: 400, statusText: "Bad Request" });
		const result = await handleErrorResponse(response);
		expect(showError).toHaveBeenCalledWith(reason);
		expect(result).toBe(response);
		expect(response.bodyUsed).toBe(false);
		expect(await response.clone().json()).toEqual({ detail: reason });
	});

	it("formats field validation errors and preserves legacy error messages", async () => {
		await handleErrorResponse(new Response(JSON.stringify({ detail: [{ msg: "价格必须大于零" }] }), { status: 422 }));
		expect(showError).toHaveBeenLastCalledWith("价格必须大于零");
		await handleErrorResponse(new Response(JSON.stringify({ errorMsg: "原有错误提示" }), { status: 400 }));
		expect(showError).toHaveBeenLastCalledWith("原有错误提示");
	});
});
