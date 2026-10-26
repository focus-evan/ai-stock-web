import type { UnwindPlan } from "#src/api/strategy";
import type { UnwindPlanExt } from "#src/api/strategy/unwind-extra";
import { fetchUnwindPlans, refreshUnwindExecution } from "#src/api/strategy";
import PriceMonitor from "#src/components/UnwindTrackingPanel/PriceMonitor";
import { StrategyDateStamp } from "#src/components/UnwindTrackingPanel/StrategyDate";
import { appRouteHref } from "#src/utils/app-route-href";
import { CopyOutlined, ReloadOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Collapse, Empty, Input, message, Segmented, Spin, Tag } from "antd";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { beijingClock, buildDailyGuide, guideText } from "./daily-guide";
import "./wildman-daily.css";

const sourceUrl = "/research-library/content/douyin/collections/favorites/videos/new_7696178893922034937.html";
const phaseNames = { sell: "卖点候选", buyback: "已卖待接", recovery: "修复退出", wait: "等待反弹", blocked: "暂停策略" };
const number = (value: number | undefined | null, digits = 2) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);

export default function WildmanDailyPanel({ onOpenLedger, embedded = false }: { onOpenLedger: () => void, embedded?: boolean }) {
	const [plans, setPlans] = useState<UnwindPlan[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState("");
	const [now, setNow] = useState(() => new Date());
	const [filter, setFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [checks, setChecks] = useState<Record<string, [boolean, boolean]>>({});
	const [copied, setCopied] = useState<number | null>(null);
	const mounted = useRef(true);
	const refreshingRef = useRef(false);
	const clock = beijingClock(now);
	const receiveMonitoredPlans = useCallback((items: UnwindPlan[]) => {
		if (!mounted.current)
			return;
		setPlans(items);
		setNow(new Date());
		setError("");
	}, []);
	const load = useCallback(async () => {
		try {
			const response = await fetchUnwindPlans(10);
			if (!mounted.current)
				return;
			if (response.status !== "success")
				throw new Error("读取失败");
			setPlans(response.data.items || []);
			setError("");
			setNow(new Date());
		}
		catch {
			if (mounted.current)
				setError("持仓指导加载失败，请重试。当前不使用旧页面数据执行。");
		}
		finally {
			if (mounted.current)
				setLoading(false);
		}
	}, []);
	useEffect(() => {
		mounted.current = true;
		void load();
		const timer = window.setInterval(() => setNow(new Date()), 30000);
		const reader = embedded ? window.setInterval(() => void load(), 60000) : null;
		return () => {
			mounted.current = false;
			window.clearInterval(timer);
			if (reader !== null)
				window.clearInterval(reader);
		};
	}, [load, embedded]);
	const refresh = async () => {
		if (refreshingRef.current)
			return;
		refreshingRef.current = true;
		setRefreshing(true);
		try {
			if (embedded) {
				await load();
				return;
			}
			const response = await refreshUnwindExecution();
			if (!mounted.current)
				return;
			if (response.data.errors?.length)
				message.warning(`已更新 ${response.data.total} 只，${response.data.errors.length} 只行情暂不可用，请查看各卡片数据日期。`);
			else message.success(`已核验 ${response.data.total} 只持仓的当天策略与盘中条件`);
			setChecks({});
			await load();
		}
		catch {
			if (mounted.current) {
				setError("生成失败，暂不执行旧指导；请重试。");
				message.error("生成失败，请重试；不按旧价格执行。");
			}
		}
		finally {
			refreshingRef.current = false;
			if (mounted.current)
				setRefreshing(false);
		}
	};
	const guides = useMemo(() => (error ? [] : plans.map(plan => ({ plan, guide: buildDailyGuide(plan, now) }))).sort((a, b) => {
		const rank = { buyback: 0, sell: 1, recovery: 2, wait: 3, blocked: 4 };
		return rank[a.guide.phase] - rank[b.guide.phase] || a.plan.watchlist_id - b.plan.watchlist_id;
	}), [plans, now, error]);
	const visible = guides.filter(({ plan, guide }) => (filter === "all" || guide.phase === filter) && `${plan.stock_name}${plan.stock_code}`.includes(search.trim()));
	const staleCount = guides.filter(g => g.guide.needsRefresh).length;
	const readyCount = guides.filter(g => !g.guide.needsRefresh).length;
	const actionableCount = guides.filter(g => g.guide.canAct).length;
	const metric = (phase: string) => guides.filter(g => g.guide.phase === phase).length;
	const copy = async (plan: UnwindPlan) => {
		try {
			const text = guideText(plan, buildDailyGuide(plan, new Date()));
			let success = false;
			try {
				if (navigator.clipboard) {
					await navigator.clipboard.writeText(text);
					success = true;
				}
			}
			catch {}
			if (!success) {
				const input = document.createElement("textarea");
				input.value = text;
				input.setAttribute("aria-label", "待复制操作单");
				input.style.cssText = "position:fixed;left:-9999px;top:0";
				document.body.append(input);
				try {
					input.select();
					success = document.execCommand("copy");
				}
				finally { input.remove(); }
			}
			if (!success)
				throw new Error("Copy unavailable");
			setCopied(plan.watchlist_id);
			message.success("操作单已复制，包含日期和执行前条件");
		}
		catch { message.info("浏览器不支持复制，请直接查看下方操作步骤。"); }
	};
	if (loading)
		return <div className="wm-loading"><Spin tip="正在同步持仓和每日解套指导…"><div /></Spin></div>;
	return (
		<section className="wm-daily" aria-label="野人每日解套指导">
			<header className="wm-header">
				<div>
					<span className="wm-eyebrow">扶老太太下楼梯 · 系统保护版</span>
					<h2>今日解套操作单</h2>
					<p>先卖旧仓 → 等费后价差 → 条件通过再接回 → 修复到成本线，复核退出。</p>
					<div className="wm-date">
						<span>今天 · 北京时间</span>
						<strong>{clock.date}</strong>
						<span>
							每个交易日 09:00 起自动生成当天策略 · 已就绪
							{readyCount}
							{" "}
							/
							{plans.length}
							{" "}
							只
						</span>
					</div>
				</div>
				<div className="wm-header-actions">
					<Button type="primary" icon={<ReloadOutlined />} loading={refreshing} onClick={refresh}>{embedded ? "重新读取解套计划" : "更新今日策略 / 行情"}</Button>
					<Button icon={<SwapOutlined />} onClick={onOpenLedger}>查看 / 记录真实成交</Button>
					<a href={sourceUrl} target="_blank" rel="noreferrer">查看野人完整讲解 ↗</a>
				</div>
			</header>
			{error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>重试</Button>} />}
			<Alert type={staleCount ? "warning" : "info"} showIcon message={staleCount ? `${staleCount} 只当天预案待更新 / 已过有效期，其余 ${readyCount} 只可查看计划` : `今日策略已就绪 ${readyCount} 只 · 当前条件通过 ${actionableCount} 只`} description={`后台每个交易日09:00起，使用上一交易日完整日线生成当天预案；关闭网页也会生成。${embedded ? "手册内每60秒读取计划，到价提醒在完整工作台查看。" : "页面每10分钟核验价格并到价弹窗。"}日线依据为前一交易日是正常的；盘中报价超过120秒只暂停当前动作，保留当天计划。实际卖出后先记录成交，再重算接回价与股数。`} />
			{embedded
				? (
					<p className="wm-footer-note">
						手册内每60秒读取计划；到价提醒请在
						<a href={appRouteHref("/short-term-strategy/stock-analysis?tab=wildman")} target="_top">完整工作台</a>
						查看。
					</p>
				)
				: <PriceMonitor onPlans={receiveMonitoredPlans} />}
			<div className="wm-summary">
				<div>
					<span>今日计划就绪</span>
					<strong>
						{readyCount}
						<small>只</small>
					</strong>
				</div>
				<div>
					<span>当前条件通过</span>
					<strong>
						{actionableCount}
						<small>只</small>
					</strong>
				</div>
				<div>
					<span>已卖待接</span>
					<strong>
						{metric("buyback")}
						<small>只</small>
					</strong>
				</div>
				<div>
					<span>修复 / 退出观察</span>
					<strong>
						{metric("recovery")}
						<small>只</small>
					</strong>
				</div>
			</div>
			<Collapse
				className="wm-method"
				items={[{ key: "method", label: "先看懂：野人的原方案，如何变成系统操作单", children: (
					<div className="wm-method-body">
						<p>原讲解：被套后次日开盘先卖，当天相对低位接回；下跌时重复降成本。市场或题材修复后，开盘先看预期，冲高回到成本线可先处理一半，修复不及预期以解套退出为主。</p>
						<p>系统规则：用已有3/16趋势、10日支撑压力、ATR和实际资金池计算候选价；加上底仓、整手、手续费、连续两次报价确认与时段过滤。以上过滤是系统增加的保护规则，不能当成作者原口播。交易日历与停牌最终以交易所、券商状态为准。</p>
						<p>
							“第四、第五天”是原讲解中的情景举例。系统按真实趋势与价格识别修复，不虚构每只股票已经到了第几天。A股当天新买仓位不能作为本轮可卖旧仓，参见
							<a href="https://www.sse.com.cn/lawandrules/sselawsrules2025/trade/universal/c/c_20260424_10816492.shtml" target="_blank" rel="noreferrer">交易所现行规则</a>
							。
						</p>
					</div>
				) }]}
			/>
			<div className="wm-filters">
				<Segmented value={filter} onChange={value => setFilter(String(value))} options={[{ value: "all", label: "全部" }, ...Object.entries(phaseNames).map(([value, label]) => ({ value, label }))]} />
				<Input.Search aria-label="筛选每日解套持仓" placeholder="找股票名称或代码" value={search} onChange={e => setSearch(e.target.value)} allowClear />
			</div>
			{!visible.length && <Empty description={plans.length ? "没有符合筛选条件的持仓" : "请先在自选盯盘中填写持仓成本与股数，本页自动同步。"} />}
			<div className="wm-cards">
				{visible.map(({ plan, guide }) => {
					const a = plan.execution?.plan;
					const recovery = (plan as UnwindPlanExt).recovery;
					const recoveryMoney = (value: number | null | undefined) => recovery?.available && typeof value === "number" && Number.isFinite(value) ? `${guide.symbol}${number(value, guide.symbol === "HK$" ? 3 : 2)}` : "未提供";
					const key = `${clock.date}:${plan.watchlist_id}:${a?.generated_at || "missing"}:${plan.execution?.signal.account_version || ""}`;
					const checked = checks[key] || [false, false];
					const precision = guide.symbol === "HK$" ? 3 : 2;
					const setCheck = (index: number, value: boolean) => setChecks((previous) => {
						const next: [boolean, boolean] = [...(previous[key] || [false, false])];
						next[index] = value;
						return { ...previous, [key]: next };
					});
					return (
						<article className={`wm-card wm-${guide.phase}`} key={plan.watchlist_id}>
							<div className="wm-card-top">
								<div>
									<h3>
										{plan.stock_name}
										{" "}
										<small>{plan.stock_code}</small>
									</h3>
									<Tag color={guide.tone}>{phaseNames[guide.phase]}</Tag>
									<Tag>{guide.period}</Tag>
									{a?.requires_manual_confirmation && <Tag color="volcano">小仓整手回转，先确认</Tag>}
								</div>
								<Button icon={<CopyOutlined />} onClick={() => copy(plan)}>{copied === plan.watchlist_id ? "再次复制" : "复制操作单"}</Button>
							</div>
							<StrategyDateStamp plan={plan} now={now} unavailable={Boolean(error) || guide.needsRefresh} />
							<div className={`wm-current-action${guide.canAct ? " wm-current-ready" : ""}`}>
								<span>当前动作</span>
								<strong>{guide.currentAction}</strong>
								<p>{guide.currentReason}</p>
								<p>
									当前可复核
									<b>
										{guide.currentQuantity}
										{" "}
										股
									</b>
									{" "}
									·
									{guide.quoteAt ? `报价 ${guide.quoteAt}（北京时间）` : "盘中报价待核验"}
								</p>
								{guide.currentLimit != null && (
									<p>
										本轮限价：
										<b>
											{guide.symbol}
											{number(guide.currentLimit, precision)}
										</b>
										{" "}
										·
										{plan.open_sold_shares > 0 ? "接回不高于此价" : "卖出不低于此价"}
									</p>
								)}
							</div>
							<div className="wm-verdict">
								<strong>{guide.title}</strong>
								<p>{guide.reason}</p>
							</div>
							<div className="wm-stock-metrics">
								<div>
									<span>盘中监测价</span>
									<b>{guide.currentPrice == null ? "待核验" : `${guide.symbol}${number(guide.currentPrice, precision)}`}</b>
								</div>
								<div>
									<span>有效成本</span>
									<b>
										{guide.symbol}
										{number(plan.effective_cost, precision)}
									</b>
								</div>
								<div>
									<span>整体回本价（含已实现盈亏）</span>
									<b>{recoveryMoney(recovery?.remaining_breakeven_price)}</b>
								</div>
								<div>
									<span>累计总盈亏</span>
									<b>{recoveryMoney(recovery?.total_pnl)}</b>
								</div>
								<div>
									<span>当前 / 已卖待接</span>
									<b>
										{plan.current_shares}
										{" "}
										/
										{" "}
										{plan.open_sold_shares}
										<small>股</small>
									</b>
								</div>
								<div>
									<span>今日计划数量 · 待触发</span>
									<b>
										{guide.quantity}
										<small>股</small>
									</b>
								</div>
							</div>
							{guide.phase !== "blocked" && (
								<fieldset className="wm-preflight">
									<legend>
										执行前核对
										{checked.filter(Boolean).length}
										/2 · 未确认不执行
									</legend>
									<Checkbox checked={checked[0]} onChange={e => setCheck(0, e.target.checked)}>已核对最新公告与持仓逻辑，没有新增重大风险</Checkbox>
									<Checkbox checked={checked[1]} onChange={e => setCheck(1, e.target.checked)}>已确认市场 / 板块未加速退潮，并核对券商可卖旧仓、费用与每手股数</Checkbox>
									<a href={guide.symbol === "HK$" ? "https://www1.hkexnews.hk/search/titlesearch.xhtml?lang=zh" : `https://www.cninfo.com.cn/new/fulltextSearch?keyWord=${plan.stock_code}`} target="_blank" rel="noreferrer">打开公告查询 ↗</a>
								</fieldset>
							)}
							<ol className="wm-steps">
								{guide.steps.map((step, i) => (
									<li key={step.title}>
										<span className="wm-step-number">{i + 1}</span>
										<div>
											<h4>{step.title}</h4>
											{step.price != null && (
												<div className="wm-order-price">
													{guide.symbol}
													{number(step.price, precision)}
													{step.shares != null && (
														<small>
															{" "}
															× 最多
															{step.shares}
															{" "}
															股
														</small>
													)}
												</div>
											)}
											<p>{step.instruction}</p>
										</div>
									</li>
								))}
							</ol>
							{guide.expectedNet != null && (
								<div className="wm-cost-path">
									<span>
										按候选价完成一轮：预计净降本
										<b>
											{guide.symbol}
											{number(guide.expectedNet)}
										</b>
									</span>
									<span>
										有效成本
										<b>
											{guide.symbol}
											{number(plan.effective_cost, precision)}
											{" "}
											→
											{guide.symbol}
											{number(guide.projectedCost, precision)}
										</b>
									</span>
									<small>仅为成交前估算；未记录真实成交不会改变成本。</small>
								</div>
							)}
							<div className="wm-cancel">
								<b>何时取消：</b>
								{guide.cancel}
							</div>
							<footer className="wm-card-footer">
								策略日期
								{guide.strategyDate || "未生成"}
								{" "}
								· 日线依据
								{guide.dataDate || "未知"}
								{" "}
								· 生成于
								{guide.generatedAt || "尚未生成"}
								<Button type="link" onClick={onOpenLedger}>到解套跟踪记录成交</Button>
							</footer>
							<Collapse
								ghost
								size="small"
								items={[{ key: "history", label: `最近 ${plan.analysis_history.length} 次每日判断`, children: (
									<ul className="wm-history">
										{plan.analysis_history.map(record => (
											<li key={record.id}>
												<b>{record.trading_date}</b>
												<span>{record.analysis_data.decision_label}</span>
												<small>
													当时快照：
													{guide.symbol}
													{number(record.current_price, precision)}
													；
													{record.analysis_data.reason}
												</small>
											</li>
										))}
									</ul>
								) }]}
							/>
						</article>
					);
				})}
			</div>
			<p className="wm-footer-note">本页提供条件式操作指导，无法自动核验盘中公告与分时承接。卖飞、反向做T、跳空和费用可能使降本失败；实际交易由你在券商执行。</p>
		</section>
	);
}
