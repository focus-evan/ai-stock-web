import { Alert } from "antd";

export default function StrategyAuditNotice({ pathname }: { pathname: string }) {
	const name = pathname.replace(/\/$/, "").split("/").pop() || "";
	const paused = ["overnight", "trend-momentum", "combined"].includes(name);
	const gated = ["breakthrough", "moving-average", "volume-price", "northbound", "event-driven"].includes(name);
	const board = ["dragon-head", "emotion-relay", "skill-tactics", "adaptive-confluence"].includes(name);
	if (!pathname.startsWith("/short-term-strategy/") || !(paused || gated || board))
		return null;
	return (
		<Alert
			showIcon
			type={paused ? "warning" : "info"}
			style={{ margin: "12px 16px" }}
			message={paused ? "本战法暂停新开仓，继续观察和管理已有持仓退出" : gated ? "开仓前先检查上一交易日沪深300是否站上MA20" : "涨停候选不等于能成交，缺少排队成交证据时仅观察"}
			description="推荐价是观察参考，模拟成交使用信号发布后的有效盘口。未经前向验证的评分只作展示；新规则需要独立积累成交样本，历史收益不能证明新规则有效。"
		/>
	);
}
