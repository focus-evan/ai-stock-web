import { Alert, Typography } from "antd";

function formatInvalidCondition(condition: string, symbol: string) {
	return condition.replace(/^(突破|跌破)(\d+(?:\.\d+)?)(取消卖出|暂停买回)$/, (_, action: string, value: string, effect: string) => `${action}${symbol}${Number(value).toFixed(3)} ${effect}`);
}

/** Use the event's saved rules, never today's prices for a historical alert. */
export default function AlertInvalidConditions({ conditions, symbol }: { conditions: string[], symbol: string }) {
	if (!conditions.length)
		return <Alert type="info" showIcon message="此条历史提醒未保存失效条件，请打开当前预案重新核验" />;
	return (
		<div style={{ margin: "10px 0", padding: "10px 12px", background: "var(--ant-color-error-bg, #fff2f0)", borderRadius: 8 }}>
			<Typography.Text strong>当时预案的失效条件</Typography.Text>
			{[...new Set(conditions)].map(condition => (
				<div key={condition}><Typography.Text type="danger" strong={/^(?:突破|跌破)/.test(condition)}>{formatInvalidCondition(condition, symbol)}</Typography.Text></div>
			))}
			<div><Typography.Text type="secondary">取消卖出针对未成交卖单；暂停买回线不是接回目标价。历史提醒以当时预案为准。</Typography.Text></div>
		</div>
	);
}
