import type { ShadowStockReportStatusResponse } from "#src/api/shadow-stock";

function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(new DOMException("Cancelled", "AbortError"));
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		const cancel = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", cancel);
			reject(new DOMException("Cancelled", "AbortError"));
		};
		timer = setTimeout(() => {
			signal.removeEventListener("abort", cancel);
			resolve();
		}, ms);
		signal.addEventListener("abort", cancel, { once: true });
	});
}

export async function pollReport(
	check: (signal: AbortSignal) => Promise<ShadowStockReportStatusResponse>,
	signal: AbortSignal,
	intervalMs = 10000,
	maxDurationMs = 900000,
): Promise<ShadowStockReportStatusResponse> {
	const deadline = Date.now() + maxDurationMs;
	let failures = 0;
	while (!signal.aborted && Date.now() < deadline) {
		let status: ShadowStockReportStatusResponse | undefined;
		try {
			status = await check(signal);
			failures = 0;
		}
		catch (error) {
			if (signal.aborted)
				throw error;
			if (++failures >= 3)
				throw new Error("连续三次无法获取生成状态，请重新查询；后台任务可能仍在运行。");
		}
		if (signal.aborted)
			throw new DOMException("Cancelled", "AbortError");
		if (status && status.status !== "running")
			return status;
		await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())), signal);
	}
	if (signal.aborted)
		throw new DOMException("Cancelled", "AbortError");
	throw new Error("后台报告仍在生成，请稍后重新查询或从历史批次查看。");
}
