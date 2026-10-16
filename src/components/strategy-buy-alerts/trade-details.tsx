import type { StrategyTradePerformance } from "#src/api/strategy";
import { Typography } from "antd";

import { percent } from "./format";

const { Text } = Typography;
const familyNames: Record<string, string> = {
	high_beta_sentiment: "高弹性情绪/龙头",
	first_board: "首板次日套利",
	overnight: "隔夜尾盘确认",
	trend_structure: "趋势结构",
	catalyst: "事件催化",
	capital_flow: "资金流",
	blended: "多战法综合",
	adaptive_confluence: "情绪催化自适应",
	generic: "通用",
};
const trustNames: Record<string, string> = {
	trusted: "可信跟投",
	canary: "小仓验证",
	observe: "仅观察",
	disabled: "暂停跟投",
};

export function StrategyPerformanceDetails({ performance, showEntryRules = true }: { performance: StrategyTradePerformance, showEntryRules?: boolean }) {
	return (
		<div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #e8e8e8" }}>
			<Text strong>战法特点：</Text>
			<div>
				{familyNames[performance.strategy_family || ""] || performance.strategy_family || "未记录"}
				{performance.settlement_label ? ` · ${performance.settlement_label}` : ""}
				{!showEntryRules || performance.entry_buffer_pct == null ? "" : ` · 最大追价 ${performance.entry_buffer_pct.toFixed(2)}%`}
				{!showEntryRules || performance.min_risk_reward_ratio == null ? "" : ` · 最低盈亏比 ${performance.min_risk_reward_ratio.toFixed(2)}`}
			</div>
			<div style={{ marginTop: 6 }}><Text strong>战法综合表现：</Text></div>
			<div>
				{`固定周期胜率 ${percent(performance.win_rate_pct)} · 近${performance.recent_sample_count}笔胜率 ${percent(performance.recent_win_rate_pct)} · 综合质量分 ${performance.quality_score?.toFixed(1) ?? "未验证"}`}
			</div>
			<div>
				{`该战法保本胜率 ${percent(performance.break_even_win_rate_pct)} · 胜率安全边际 ${performance.win_rate_edge_pct == null ? "未验证" : `${performance.win_rate_edge_pct >= 0 ? "+" : ""}${performance.win_rate_edge_pct.toFixed(2)}个百分点`}`}
			</div>
			<div>
				{`成熟样本 ${performance.sample_count} 笔（前向 ${performance.forward_sample_count} 笔）`}
				{performance.win_rate_ci95_pct ? ` · 胜率95%区间 ${performance.win_rate_ci95_pct[0].toFixed(1)}%–${performance.win_rate_ci95_pct[1].toFixed(1)}%` : ""}
			</div>
			<div>
				{`成本后平均收益 ${percent(performance.estimated_net_avg_return_pct)} · 盈利因子 ${performance.profit_factor?.toFixed(2) ?? "未验证"} · ${trustNames[performance.trust_status || ""] || "可信度未验证"}${performance.trust_score == null ? "" : ` ${performance.trust_score.toFixed(1)}分`}`}
			</div>
			{performance.trust_reason && <Text type="secondary">{performance.trust_reason}</Text>}
		</div>
	);
}
