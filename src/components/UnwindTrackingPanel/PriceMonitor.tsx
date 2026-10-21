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
	const { enabled, checking, checkedAt, nextAt, note, error, alertCount, check, setEnabled, showHistory } = current;
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
						<Button onClick={showHistory}>
							查看提醒记录（
							{alertCount}
							）
						</Button>
					)}
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
			<p className="unwind-date-note">服务器每60秒核验行情并保存事件，页面每30秒同步；重新登录或休眠恢复后补发未读提醒。候选与确认分别提醒，点击“我已知晓”后保存已读。过期事件仅供复盘，当前动作以最新行情为准。</p>
			{error && <Alert showIcon type="warning" message={error} />}
		</section>
	);
}
