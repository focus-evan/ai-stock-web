import type { UnwindExecution, UnwindSignal } from "#src/api/strategy";

export function effectiveSignal(data: UnwindExecution | undefined, serverNow: number): UnwindSignal {
	const signal = data?.signal;
	const expiry = Date.parse(signal?.valid_until || "");
	if (!signal || signal.phase !== "intraday" || !Number.isFinite(expiry) || serverNow > expiry) {
		return { ...signal, action: "WAIT", label: "等待", shares: 0, limit_price: null, reason: signal?.action === "WAIT" ? signal.reason : "当前结果已过期或已收市，等待重新核验；不要沿用此前指令" };
	}
	return signal;
}
