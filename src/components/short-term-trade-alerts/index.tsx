import { useUserStore } from "#src/store/user";
import { ReloadOutlined } from "@ant-design/icons";
import { useQueries } from "@tanstack/react-query";
import { Alert, Button, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { beijingTradeDate, loadTacticTradeCycles, SHORT_TERM_TACTICS, showTradeAlertsOnPath, todayTradeAlerts } from "./data";

const { Text } = Typography;
const priceText = (value: number | null) => value == null || !Number.isFinite(value) ? "未记录" : `¥${value.toFixed(4)}`;
const quantityText = (value: number | null) => value == null || !Number.isFinite(value) ? "未记录" : `${value.toLocaleString("zh-CN")} 股`;
const redText = { color: "#cf1322", fontSize: "clamp(22px, 2.3vw, 32px)", fontWeight: 800, lineHeight: 1.6 };

function LiveTradeAlerts({ userId }: { userId: string }) {
	const [day, setDay] = useState(beijingTradeDate);
	useEffect(() => {
		const timer = window.setInterval(() => setDay(beijingTradeDate()), 15000);
		const updateDay = () => setDay(beijingTradeDate());
		window.addEventListener("focus", updateDay);
		return () => {
			window.clearInterval(timer);
			window.removeEventListener("focus", updateDay);
		};
	}, []);
	const results = useQueries({
		queries: SHORT_TERM_TACTICS.map(tactic => ({
			queryKey: ["short-term-trade-alerts", userId, tactic.type, day],
			queryFn: ({ signal }: { signal: AbortSignal }) => loadTacticTradeCycles(tactic.type, signal),
			refetchInterval: 15000,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: "always" as const,
			retry: false,
			gcTime: 0,
		})),
	});
	const events = results.flatMap((result, index) => todayTradeAlerts(SHORT_TERM_TACTICS[index], result.data || [], day))
		.sort((a, b) => b.execution.trade_id - a.execution.trade_id);
	const failed = results.flatMap((result, index) => result.isError ? [SHORT_TERM_TACTICS[index].name] : []);
	const loading = results.some(result => result.isPending);
	const fetching = results.some(result => result.isFetching);

	return (
		<section aria-label="短线四法成交提醒" style={{ margin: "16px 16px 0", padding: 16, borderRadius: 12, border: `2px solid ${events.length ? "#ff4d4f" : "#d9d9d9"}`, background: events.length ? "#fff1f0" : "#fff" }}>
			<Space wrap style={{ width: "100%", justifyContent: "space-between", marginBottom: events.length ? 12 : 0 }}>
				<Text strong style={{ color: events.length ? "#cf1322" : undefined, fontSize: events.length ? 24 : 14 }}>
					{events.length ? `短线四法 · 今日模拟成交 ${events.length} 笔` : loading ? "正在检查短线四法成交…" : failed.length ? "短线四法成交检查未完成" : "短线四法 · 今日暂无模拟成交"}
				</Text>
				<Space wrap>
					<Text type="secondary">
						{day}
						（北京时间）· 每 15 秒更新
					</Text>
					<Button size="small" icon={<ReloadOutlined />} loading={fetching} onClick={() => results.forEach(result => void result.refetch())}>刷新成交</Button>
				</Space>
			</Space>
			{failed.length > 0 && <Alert type="warning" showIcon style={{ marginTop: 8, marginBottom: 12 }} message={`${failed.join("、")}更新失败`} description="该战法暂时保留上次成功读取的当天记录，可能有新成交未显示，请重试。" />}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))", gap: 12 }} aria-live="polite" aria-relevant="additions text">
				{events.map(({ id, tactic, cycle, execution }) => (
					<article key={id} style={{ padding: "12px 16px", background: "#fff", border: "1px solid #ffa39e", borderRadius: 8 }}>
						<Space wrap>
							<Text strong style={{ fontSize: 20, color: "#cf1322" }}>
								{tactic.name}
								{" "}
								·
								{" "}
								{cycle.stock_name}
								（
								{cycle.stock_code}
								）
							</Text>
							<Tag color="red">{execution.direction === "buy" ? "买入已成交" : "卖出已成交"}</Tag>
						</Space>
						<div style={redText}>
							{execution.direction === "buy" ? "买入价格" : "卖出价格"}
							{" "}
							{priceText(execution.price)}
						</div>
						<div style={redText}>
							{execution.direction === "buy" ? "买入股数" : "卖出股数"}
							{" "}
							{quantityText(execution.quantity)}
						</div>
						{execution.direction === "sell" && (
							<Text style={{ display: "block", color: "#cf1322", fontSize: 20, fontWeight: 700 }}>
								本轮买入均价
								{" "}
								{priceText(cycle.buy_price)}
								{" "}
								· 累计买入
								{" "}
								{quantityText(cycle.buy_quantity)}
								（首次买入
								{" "}
								{cycle.buy_date || "未记录"}
								）
							</Text>
						)}
						<Text type="secondary">
							{execution.date}
							{" "}
							·
							{" "}
							{cycle.portfolio_name}
							{" "}
							· 本笔模拟成交
						</Text>
						{(execution.verification_status !== "verified" || cycle.verification_status === "anomalous") && (
							<div style={{ marginTop: 6 }}>
								<Tag color="orange">成交数据待核验</Tag>
								<Text type="secondary">{execution.verification_issue || cycle.verification_issues.join("；") || "成交记录缺少完整证据"}</Text>
							</div>
						)}
					</article>
				))}
			</div>
		</section>
	);
}

export default function ShortTermTradeAlerts({ pathname }: { pathname: string }) {
	const userId = useUserStore(state => state.id);
	if (!userId || !showTradeAlertsOnPath(pathname))
		return null;
	return <LiveTradeAlerts key={userId} userId={userId} />;
}
