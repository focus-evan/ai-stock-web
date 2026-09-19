interface StrategyState {
	auto_trade?: boolean | number
	positions_count?: number
	decision_status?: string
	decision_reason?: string
}

export function strategyExecutionStatus(state: StrategyState): {
	status: "default" | "processing" | "warning" | "error"
	text: string
} {
	if (!state.auto_trade)
		return { status: "default", text: "已暂停" };
	if (state.decision_status === "expired")
		return { status: "default", text: "上次窗口已结束" };
	if (state.decision_status === "not_scheduled")
		return { status: "default", text: "未纳入调度" };
	if (state.decision_status === "blocked")
		return { status: "error", text: "执行被阻断" };
	if (state.decision_status === "partial")
		return { status: "processing", text: "部分成交，继续检查" };
	if (state.decision_status === "data_unavailable")
		return { status: "warning", text: "数据待恢复" };
	if (state.decision_status === "failed")
		return { status: "error", text: "执行异常" };
	if (/数据待恢复|行情.*(?:缺失|不完整|未恢复)/.test(state.decision_reason || ""))
		return { status: "warning", text: "数据待恢复" };
	if (Number(state.positions_count) > 0)
		return { status: "processing", text: "持仓管理中" };
	if (state.decision_status === "pending")
		return { status: "processing", text: "等待触发" };
	return { status: "default", text: "空仓观察" };
}
