interface StrategyState {
	auto_trade?: boolean | number
	positions_count?: number
	decision_status?: string
	decision_reason?: string
	history_status?: string
}

export function strategyExecutionStatus(state: StrategyState): {
	status: "default" | "processing" | "warning" | "error"
	text: string
} {
	if (state.history_status === "price_anomaly" || state.decision_status === "history_review")
		return { status: "warning", text: "历史价格待核验" };
	if (!state.auto_trade)
		return { status: "default", text: "已暂停" };
	if (state.decision_status === "expired")
		return { status: "default", text: "上次窗口已结束" };
	if (state.decision_status === "not_scheduled")
		return { status: "default", text: "未纳入调度" };
	if (state.decision_status === "blocked")
		return { status: "error", text: "委托未通过校验" };
	if (state.decision_status === "traded_with_rejections")
		return { status: "warning", text: "已成交，部分委托未执行" };
	if (state.decision_status === "waiting_signal")
		return { status: "default", text: Number(state.positions_count) > 0 ? "持仓中，开仓条件未满足" : "等待入场条件" };
	if (state.decision_status === "not_run")
		return { status: "default", text: "尚无执行记录" };
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
