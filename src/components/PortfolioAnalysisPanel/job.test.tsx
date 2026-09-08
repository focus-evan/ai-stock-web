import { fetchPortfolioAnalysis, fetchPortfolioAnalysisJob, triggerPortfolioAnalysis } from "#src/api/strategy";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioAnalysisPanel from "./index";

vi.mock("#src/api/strategy", () => ({
	fetchPortfolioAnalysis: vi.fn(),
	fetchPortfolioAnalysisJob: vi.fn(),
	triggerPortfolioAnalysis: vi.fn(),
}));

const report = { stocks: [], total: 0, overall_summary: "saved report", generated_at: "2026-09-08 23:48:07" };

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchPortfolioAnalysis).mockResolvedValue({ status: "success", data: report });
});
afterEach(cleanup);

describe("portfolio background generation", () => {
	it("keeps a submitted job pending instead of treating submission as completion", async () => {
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValue({ status: "running", job_id: "new-job" });
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValueOnce({ status: "idle" });
		vi.mocked(triggerPortfolioAnalysis).mockResolvedValue({ status: "running", job_id: "new-job" });
		render(<PortfolioAnalysisPanel />);
		fireEvent.click((await screen.findAllByRole("button", { name: /生成分析/ }))[0]);
		await waitFor(() => expect(fetchPortfolioAnalysisJob).toHaveBeenCalledWith("new-job"));
		expect(screen.getByText(/正在后台生成持仓分析/)).toBeInTheDocument();
		expect(triggerPortfolioAnalysis).toHaveBeenCalledTimes(1);
	});

	it("rejoins an existing task after refresh without submitting another generation", async () => {
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValue({ status: "running", job_id: "existing" });
		render(<PortfolioAnalysisPanel />);
		await waitFor(() => expect(fetchPortfolioAnalysisJob).toHaveBeenCalledWith("existing"));
		expect(screen.getByText(/正在后台生成持仓分析/)).toBeInTheDocument();
		expect(triggerPortfolioAnalysis).not.toHaveBeenCalled();
	});

	it("shows a restarted task as expired and keeps the previous report", async () => {
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValueOnce({ status: "running", job_id: "old" });
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValue({ status: "error", job_id: "old", message: "任务状态已失效" });
		render(<PortfolioAnalysisPanel />);
		expect(await screen.findByText("任务状态已失效")).toBeInTheDocument();
		expect(triggerPortfolioAnalysis).not.toHaveBeenCalled();
		expect(screen.queryByText(/正在后台生成持仓分析/)).not.toBeInTheDocument();
		expect(screen.getByText(report.generated_at)).toBeInTheDocument();
	});

	it("updates the report only after the background task completes", async () => {
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValueOnce({ status: "running", job_id: "done" });
		vi.mocked(fetchPortfolioAnalysisJob).mockResolvedValue({ status: "success", job_id: "done", data: { ...report, generated_at: "2026-09-09 00:10:00" } });
		render(<PortfolioAnalysisPanel />);
		expect(await screen.findByText("2026-09-09 00:10:00")).toBeInTheDocument();
		expect(screen.queryByText(/正在后台生成持仓分析/)).not.toBeInTheDocument();
	});
});
