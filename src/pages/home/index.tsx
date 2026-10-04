import type { DashboardPosition, DashboardStrategy, DashboardTrade, Metric } from "#src/api/portfolio/dashboard";
import type { CSSProperties } from "react";
import { fetchDashboard } from "#src/api/portfolio";
import { BasicContent } from "#src/components/basic-content";
import { ArrowRightOutlined, BookOutlined, FundOutlined, HistoryOutlined, ReadOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useRequest } from "ahooks";
import { Alert, Badge, Button, Card, Empty, Input, Select, Skeleton, Space, Table, Tabs, Tag, theme, Typography } from "antd";
import { lazy, Suspense, useState } from "react";
import { Link, useLocation } from "react-router";
import { dashboardFromResponse, filterStrategies, formatMetric, formatTime, metricClass, needsAttention, recommendationState, STRATEGIES, strategyName } from "./data";
import { strategyExecutionStatus } from "./strategy-status";
import "./business.css";
import "./style.css";

const Performance = lazy(() => import("./performance"));
const { Text } = Typography;
const shortcuts = [
	{ path: "/market-intelligence", title: "每日重点情报", description: "看变化，核对来源", icon: <ReadOutlined /> },
	{ path: "/short-term-strategy/portfolio", title: "策略组合", description: "查看持仓与执行", icon: <FundOutlined /> },
	{ path: "/short-term-strategy/review", title: "复盘中心", description: "核对成交与判断", icon: <HistoryOutlined /> },
	{ path: "/research-center", title: "研究与知识库", description: "雷达、深度与方法", icon: <BookOutlined /> },
];

function NumberValue({ value, suffix = "", signed = false }: { value: Metric, suffix?: string, signed?: boolean }) {
	return <span className={`wb-number ${signed ? metricClass(value) : ""}`}>{formatMetric(value, suffix, signed)}</span>;
}

export default function Home() {
	const { token } = theme.useToken();
	const { pathname } = useLocation();
	const [keyword, setKeyword] = useState("");
	const [filter, setFilter] = useState("all");
	const [tab, setTab] = useState("strategies");
	const [receivedAt, setReceivedAt] = useState<string>();
	const { data, error, loading, refresh } = useRequest(async () => dashboardFromResponse(await fetchDashboard()), {
		pollingInterval: pathname === "/home" ? 60000 : 0,
		pollingWhenHidden: false,
		pollingErrorRetryCount: 2,
		onSuccess: () => setReceivedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false, timeZone: "Asia/Shanghai" })),
	});
	const strategies = data?.strategy_summary || [];
	const attention = strategies.filter(needsAttention);
	const filtered = filterStrategies(strategies, keyword, filter);
	const positions = data?.positions || [];
	const overview = data?.overview;
	const quality = data?.data_quality;
	const styles = {
		"--wb-bg": token.colorBgContainer,
		"--wb-soft": token.colorFillAlter,
		"--wb-border": token.colorBorderSecondary,
		"--wb-text": token.colorText,
		"--wb-muted": token.colorTextSecondary,
		"--wb-primary": token.colorPrimary,
		"--wb-primary-bg": token.colorPrimaryBg,
		"--wb-up": token.colorError,
		"--wb-down": token.colorSuccess,
	} as CSSProperties;
	const strategyColumns = [
		{ title: "策略 / 组合", key: "name", width: 190, render: (_: unknown, s: DashboardStrategy) => (
			<div>
				<strong>{strategyName(s.strategy_type)}</strong>
				<div className="wb-muted wb-small">{s.name || `组合 #${s.portfolio_id}`}</div>
			</div>
		) },
		{ title: "执行状态", key: "state", width: 180, render: (_: unknown, s: DashboardStrategy) => {
			const state = strategyExecutionStatus(s);

			return <Badge status={state.status} text={state.text} />;
		} },
		{ title: "总资产（元）", dataIndex: "total_asset", align: "right" as const, width: 140, render: (v: Metric) => <NumberValue value={v} /> },
		{ title: "累计收益率", dataIndex: "total_profit_pct", align: "right" as const, width: 125, sorter: (a: DashboardStrategy, b: DashboardStrategy) => (a.total_profit_pct ?? -Infinity) - (b.total_profit_pct ?? -Infinity), render: (v: Metric) => <NumberValue value={v} suffix="%" signed /> },
		{ title: "持仓笔数", dataIndex: "positions_count", align: "right" as const, width: 90, render: (v?: number) => v ?? "—" },
		{ title: "最近决策 / 结算", key: "updated", width: 155, render: (_: unknown, s: DashboardStrategy) => <span className="wb-muted wb-small">{formatTime(s.last_run_at || s.last_run_date)}</span> },
	];
	const positionColumns = [
		{ title: "股票", key: "stock", width: 150, render: (_: unknown, p: DashboardPosition) => (
			<div>
				<strong>{p.stock_name || p.stock_code}</strong>
				<div className="wb-muted wb-small">{p.stock_code}</div>
			</div>
		) },
		{ title: "策略 / 组合", key: "strategy", width: 190, render: (_: unknown, p: DashboardPosition) => (
			<div>
				{strategyName(p.strategy_type)}
				<div className="wb-muted wb-small">{p.portfolio_name}</div>
			</div>
		) },
		{ title: "数量", dataIndex: "quantity", align: "right" as const, width: 90 },
		{ title: "成本价", dataIndex: "avg_cost", align: "right" as const, width: 100, render: (v: Metric) => <NumberValue value={v} /> },
		{ title: "参考价格", key: "price", align: "right" as const, width: 135, render: (_: unknown, p: DashboardPosition) => (
			<div>
				<NumberValue value={p.current_price} />
				<div className="wb-muted wb-small">{p.quote_refreshed ? "行情快照" : p.quote_refreshed === false ? "存储价格" : "来源待核验"}</div>
			</div>
		) },
		{ title: "持仓盈亏（元）", key: "profit", align: "right" as const, width: 140, render: (_: unknown, p: DashboardPosition) => <NumberValue value={p.profit ?? p.unrealized_pnl} signed /> },
	];
	const tradeColumns = [
		{ title: "成交时间", key: "time", width: 170, render: (_: unknown, t: DashboardTrade) => formatTime(t.created_at || t.trade_date) },
		{ title: "股票", key: "stock", width: 170, render: (_: unknown, t: DashboardTrade) => (
			<div>
				{t.stock_name || t.stock_code}
				<div className="wb-muted wb-small">{t.stock_code}</div>
			</div>
		) },
		{ title: "方向", key: "direction", width: 90, render: (_: unknown, t: DashboardTrade) => {
			const d = t.direction || t.action;

			return <Tag color={d === "buy" ? "red" : d === "sell" ? "green" : "default"}>{d === "buy" ? "买入" : d === "sell" ? "卖出" : "待核验"}</Tag>;
		} },
		{ title: "数量", dataIndex: "quantity", align: "right" as const, width: 90 },
		{ title: "成交价", dataIndex: "price", align: "right" as const, width: 100, render: (v: Metric) => <NumberValue value={v} /> },
		{ title: "策略", dataIndex: "strategy_type", width: 180, render: strategyName },
	];

	const tabs = data
		? [
			{ key: "strategies", label: `策略组合 · ${strategies.length}`, children: (
				<>
					<div className="wb-toolbar">
						<Input aria-label="搜索策略或组合" placeholder="搜索策略或组合" prefix={<SearchOutlined />} value={keyword} allowClear onChange={e => setKeyword(e.target.value)} />
						<Select aria-label="筛选执行状态" value={filter} onChange={setFilter} options={[{ value: "all", label: "全部状态" }, { value: "attention", label: "需要关注" }, { value: "holding", label: "有持仓" }, { value: "paused", label: "已暂停" }]} />
						<Text type="secondary">
							{filtered.length}
							{" "}
							/
							{" "}
							{strategies.length}
							{" "}
							个组合
						</Text>
						{(keyword || filter !== "all") && (
							<Button
								type="link"
								onClick={() => {
									setKeyword("");
									setFilter("all");
								}}
							>
								重置筛选
							</Button>
						)}
					</div>
					<Table<DashboardStrategy>
						rowKey="portfolio_id"
						dataSource={filtered}
						columns={strategyColumns}
						size="middle"
						scroll={{ x: 950 }}
						pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
						locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={strategies.length ? "没有匹配的组合，可重置筛选" : "尚无模拟组合，可前往策略组合创建"} /> }}
						expandable={{ expandedRowRender: s => (
							<div className="wb-detail">
								<p>
									<strong>最近决策：</strong>
									{s.decision_reason || "尚无可核验的决策记录"}
								</p>
								<Space wrap size="large">
									<span>
										累计收益
										<NumberValue value={s.total_profit} signed />
									</span>
									<span>
										持仓当日浮动
										<NumberValue value={s.daily_profit_available === true ? s.daily_profit : undefined} signed />
									</span>
									<span>
										最近模拟成交
										{formatTime(s.last_actual_trade_at || s.last_actual_trade_date)}
									</span>
								</Space>
							</div>
						) }}
					/>
					<div className="wb-table-footer">
						<span>展开组合可查看决策原因、收益与最近模拟成交。</span>
						<Link to="/short-term-strategy/portfolio">
							管理策略组合
							<ArrowRightOutlined />
						</Link>
					</div>
				</>
			) },
			{ key: "signals", label: "推荐观察", children: (
				<>
					<p className="wb-muted">各策略最近一次推荐快照；交易日与数据状态分别标注。</p>
					<div className="wb-recommendations">
						{Object.entries(STRATEGIES).map(([key, cfg]) => {
							const rec = recommendationState(data.recommendations?.[key]);
							return (
								<article className="wb-rec" key={key}>
									<div className="wb-rec-heading">
										<h3>{cfg.label}</h3>
										<Tag color={rec.tone}>{rec.label}</Tag>
									</div>
									<div className="wb-muted wb-small">
										生成时间：
										{formatTime(rec.data.generated_at || rec.data.trading_date)}
									</div>
									<p className="wb-muted wb-small">{rec.description}</p>
									{rec.stocks.length
										? (
											<ol>
												{rec.stocks.map(stock => (
													<li key={stock.stock_code || stock.code || stock.stock_name || stock.name || stock.reason}>
														<div>
															<strong>{stock.stock_name || stock.name || "未命名股票"}</strong>
															<span className="wb-muted wb-small">
																{" "}
																{stock.stock_code || stock.code}
															</span>
															{stock.reason && <p className="wb-muted wb-small">{stock.reason}</p>}
														</div>
														<span className="wb-number wb-small">{formatMetric(stock.score, "分")}</span>
													</li>
												))}
											</ol>
										)
										: <div className="wb-rec-empty">{rec.label}</div>}
								</article>
							);
						})}
					</div>
				</>
			) },
			{ key: "positions", label: `持仓明细 · ${positions.length}`, children: <Table<DashboardPosition> rowKey={p => `${p.portfolio_id ?? p.strategy_type}-${p.id ?? p.stock_code}`} dataSource={positions} columns={positionColumns} scroll={{ x: 850 }} pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }} locale={{ emptyText: <Empty description="当前暂无持仓" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} /> },
			{ key: "trades", label: "最近成交", children: (
				<>
					<p className="wb-muted">最近 10 笔模拟成交。完整交易记录请进入策略组合查看。</p>
					<Table<DashboardTrade> rowKey={t => `${t.portfolio_id ?? t.strategy_type}-${t.id ?? [t.stock_code, t.created_at || t.trade_date, t.direction || t.action, t.quantity, t.price].join("-")}`} dataSource={data.recent_trades} columns={tradeColumns} scroll={{ x: 820 }} pagination={false} locale={{ emptyText: <Empty description="尚无模拟成交记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} />
				</>
			) },
			{ key: "performance", label: "收益曲线", children: <Suspense fallback={<Skeleton active />}><Performance data={data} /></Suspense> },
		]
		: [];

	return (
		<BasicContent className="workbench" style={styles}>
			<header className="wb-heading">
				<div>
					<div className="wb-eyebrow">AI STOCK / WORKSPACE</div>
					<h1>
						研究工作台
						<Tag>模拟交易</Tag>
					</h1>
					<p>先检查执行与数据，再看组合表现和候选机会。</p>
				</div>
				<div className="wb-refresh">
					<span className="wb-muted wb-small" role="status">{loading ? "正在更新数据…" : error ? "更新失败" : receivedAt ? `最近读取 ${receivedAt}` : "等待数据"}</span>
					<Button aria-label="刷新数据" icon={<ReloadOutlined />} onClick={refresh} loading={loading}>刷新数据</Button>
				</div>
			</header>
			<nav className="wb-shortcuts" aria-label="常用研究入口">
				{shortcuts.map(item => (
					<Link key={item.path} to={item.path} className="wb-shortcut">
						<span className="wb-shortcut-icon">{item.icon}</span>
						<span>
							<strong>{item.title}</strong>
							<small>{item.description}</small>
						</span>
						<ArrowRightOutlined />
					</Link>
				))}
			</nav>
			{error && <Alert type="error" showIcon message="工作台数据更新失败" description={data ? "当前保留上次成功读取的快照，请重试后再做判断。" : "暂时无法读取组合信息，资产和收益尚不可用。"} action={<Button aria-label="重试" onClick={refresh} loading={loading}>重试</Button>} />}
			{!data && !error && <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>}
			{data && (
				<>
					{quality && quality.stored_price_positions > 0 && <Alert type="warning" showIcon message={`${quality.stored_price_positions} 笔持仓使用存储价格`} description="本次行情未完整获取，资产与盈亏可能滞后；请在持仓明细中核对价格来源。" />}
					{!quality && <Alert type="info" showIcon message="行情覆盖信息待核验" description="当前接口未提供价格来源覆盖信息，组合金额按返回快照展示。" />}
					<section className="wb-metrics" aria-label="组合资产概览">
						<MetricCard label="模拟总资产" value={overview?.total_asset} note={`${overview?.portfolios_count ?? strategies.length} 个组合 · 各组合独立资金汇总`} primary />
						<MetricCard label="累计收益" value={overview?.total_profit} note="总资产减初始资金 · 元" signed />
						<MetricCard label="累计收益率" value={overview?.total_profit_pct} suffix="%" note="按初始资金加权 · 非策略简单平均" signed />
						<MetricCard label="可用现金" value={overview?.available_cash} note={`${overview?.positions_count ?? positions.length} 笔持仓 · 同一股票可属于多个组合`} />
					</section>
					<section className="wb-attention" aria-label="执行概况">
						<div>
							<span className="wb-eyebrow">执行概况</span>
							<h2>{attention.length ? `${attention.length} 个组合需要关注` : "暂无已识别的执行异常"}</h2>
							<p>{attention.length ? "优先检查数据恢复与执行阻断原因。" : "根据最近返回的执行记录汇总，空仓和暂停各有独立状态。"}</p>
						</div>
						<div className="wb-attention-counts">
							{[{ key: "attention", label: "需要关注", count: attention.length }, { key: "holding", label: "持仓组合", count: strategies.filter(s => Number(s.positions_count) > 0).length }, { key: "paused", label: "已暂停", count: strategies.filter(s => !s.auto_trade).length }].map(item => (
								<button
									key={item.key}
									type="button"
									aria-pressed={tab === "strategies" && filter === item.key}
									onClick={() => {
										setFilter(item.key);
										setTab("strategies");
									}}
								>
									<strong>{item.count}</strong>
									<span>{item.label}</span>
								</button>
							))}
						</div>
					</section>
					<Card className="wb-main-card">
						<Tabs
							activeKey={tab}
							onChange={setTab}
							items={tabs}
						/>
					</Card>
					<footer className="wb-footnote">
						<span>
							数据快照：
							{formatTime(data.generated_at)}
							（北京时间）
						</span>
						<span>模拟结果用于观察与复盘，不代表实际成交或未来收益。</span>
					</footer>
				</>
			)}
		</BasicContent>
	);
}

function MetricCard({ label, value, note, primary = false, signed = false, suffix = "" }: { label: string, value: Metric, note: string, primary?: boolean, signed?: boolean, suffix?: string }) {
	return (
		<article className={`wb-metric${primary ? " wb-metric-primary" : ""}`}>
			<div className="wb-metric-label">{label}</div>
			<div className="wb-metric-value"><NumberValue value={value} suffix={suffix} signed={signed} /></div>
			<p>{note}</p>
		</article>
	);
}
