import type { UnwindPlan } from "#src/api/strategy";
import { useAuthStore } from "#src/store/auth";
import { useUserStore } from "#src/store/user";
import { BellOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Space, Switch, Tag } from "antd";
import { useEffect } from "react";
import { useUnwindMonitorStore } from "./monitor-store";
import { beijingTime } from "./strategy-time";
import "./strategy-time.css";

/** Read-only view of the app-level monitor; mounting this panel never starts another timer. */
export default function PriceMonitor({ onPlans }: { onPlans?: (plans: UnwindPlan[]) => void }) {
	const view = useUnwindMonitorStore(state => state.view);
	const userId = useUserStore(state => state.id);
	const authenticated = useAuthStore(state => Boolean(state.token));
	const current = authenticated && view?.userId === userId ? view : null;
	useEffect(() => {
		if (current?.checkedAt && onPlans)
			onPlans(current.plans);
	}, [current?.plans, current?.checkedAt, onPlans]);
	if (!current)
		return <Alert type="info" showIcon message="全局解套监控正在初始化" />;
	const { enabled, checking, checkedAt, nextAt, note, error, alertCount, check, setEnabled, showCurrent, showHistory } = current;
	return (
		<section className="unwind-price-monitor" aria-label="解套到价监控">
			<div className="unwind-date-heading">
				<Space wrap>
					<BellOutlined />
					<strong>全局解套提醒 · 每30秒同步</strong>
					<Switch aria-label="启用到价监控" checked={enabled} onChange={setEnabled} />
					<Tag color={enabled ? "blue" : "default"}>{enabled ? "全局监控已开启" : "全局监控已暂停"}</Tag>
				</Space>
				<Space wrap>
					<Button icon={<ReloadOutlined />} loading={checking} disabled={!enabled} onClick={() => check()}>立即检查价格</Button>
					{alertCount > 0 && (
						<Button type="primary" onClick={showCurrent}>
							查看当前提醒（
							{alertCount}
							）
						</Button>
					)}
					{alertCount === 0 && <Tag>暂无需要操作的提醒</Tag>}
					<Button type="text" onClick={showHistory}>历史记录</Button>
				</Space>
			</div>
			<div className="unwind-date-meta">
				<span>
					上次读取成功：
					<strong>{checkedAt ? beijingTime(checkedAt) : "尚未完成"}</strong>
				</span>
				<span>
					下次检查：
					<strong>{enabled && nextAt ? beijingTime(nextAt) : "—"}</strong>
				</span>
			</div>
			<p className="unwind-date-note">{checking ? "正在获取最新报价…" : enabled ? note : "已暂停全局价格检查与到价弹窗"}</p>
			<p className="unwind-date-note">服务器每60秒核验行情，页面每30秒同步。只弹出当前有效的操作或风险事项；过期提醒自动撤下，候选和验证信号保存在历史记录中。</p>
			{error && <Alert showIcon type="warning" message={error} />}
		</section>
	);
}
