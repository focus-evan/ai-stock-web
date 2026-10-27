import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnwindRiskReview, saveUnwindRiskReview } from "../src/api/strategy";
import RiskReview from "../src/components/UnwindTrackingPanel/RiskReview";

vi.mock("#src/api/strategy", () => ({ fetchUnwindRiskReview: vi.fn(), saveUnwindRiskReview: vi.fn() }));
afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});
describe("dated risk review", () => {
	it("loads evidence for the selected holding and saves an explicit blocked decision", async () => {
		const data = { announcement: "blocked" as const, fundamental: "clear" as const, sector: "unknown" as const, evidence: "2026-10-21公告核验：测试来源存在风险，需进一步确认" };
		vi.mocked(fetchUnwindRiskReview).mockResolvedValue({ status: "success", data });
		vi.mocked(saveUnwindRiskReview).mockResolvedValue({ status: "success", data });
		render(<RiskReview watchlistId={66} />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "补充风险信息（可选）" }));
		});
		expect(fetchUnwindRiskReview).toHaveBeenCalledWith(66);
		expect(screen.getByRole("textbox")).toHaveValue(data.evidence);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "保存今日核验" }));
		});
		expect(saveUnwindRiskReview).toHaveBeenCalledWith(66, data);
	});
	it("does not label missing evidence as a passed review", async () => {
		vi.mocked(fetchUnwindRiskReview).mockResolvedValue({ status: "success", data: null });
		render(<RiskReview watchlistId={66} />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "补充风险信息（可选）" }));
		});
		expect(screen.getByRole("textbox")).toHaveValue("");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "保存今日核验" }));
		});
		expect(saveUnwindRiskReview).not.toHaveBeenCalled();
	});
});
