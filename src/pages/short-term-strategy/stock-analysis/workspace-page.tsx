import type { ResearchOverview } from "#src/api/strategy/types";
import type { ColumnsType } from "antd/es/table";
import type { AnalysisData } from "./presentation";
import { deleteAnalysisRecord, fetchAnalysisDetail, fetchAnalysisHistory, fetchStockAnalysis, retrySaveStockAnalysis } from "#src/api/strategy";
import PortfolioAnalysisPanel from "#src/components/PortfolioAnalysisPanel";
import StrategyPerformanceDashboard from "#src/components/StrategyPerformanceDashboard";
import UnwindTrackingPanel from "#src/components/UnwindTrackingPanel";
import WatchlistModal from "#src/components/WatchlistModal";
import WatchlistPanel from "#src/components/WatchlistPanel";
import { DeleteOutlined, HistoryOutlined, MoreOutlined, ReloadOutlined, SearchOutlined, StarOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Dropdown, Empty, Grid, Input, message, Modal, Pagination, Segmented, Skeleton, Space, Spin, Table, Tabs, Tag } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import AnalysisResult from "./analysis-result";
import { actionTone, finiteNumber, numberText, priceText } from "./data";
import { AnalysisSurface, ResultSource } from "./presentation";
import { ResearchStatus } from "./research-report";
import "./stock-analysis.css";

type HistoryRecord = Omit<Partial<AnalysisData>, "llm_enhanced"> & {
	id: number
	stock_code: string
	stock_name: string
	llm_enhanced?: boolean | number
	research_overview?: ResearchOverview
};
type TabKey = "analyze" | "history" | "performance" | "watchlist" | "portfolio" | "unwind";
const storageKey = "stock_analysis_active_tab";
const validTabs: TabKey[] = ["analyze", "history", "performance", "watchlist", "portfolio", "unwind"];
function initialTab(): TabKey {
	if (new URLSearchParams(window.location.search).get("tab") === "history")
		return "history";
	try {
		const saved = sessionStorage.getItem(storageKey) as TabKey;
		return validTabs.includes(saved) ? saved : "analyze";
	}
	catch {
		return "analyze";
	}
}
export function HistoryTab({ initialFilter = "", initialId }: { initialFilter?: string, initialId?: number } = {}) {
	const screens = Grid.useBreakpoint();
	const [items, setItems] = useState<HistoryRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [search, setSearch] = useState(initialFilter);
	const [filter, setFilter] = useState(initialFilter);
	const [view, setView] = useState("timeline");
	const [detail, setDetail] = useState<AnalysisData | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState("");
	const [watchlistTarget, setWatchlistTarget] = useState<HistoryRecord | null>(null);
	const listRequest = useRef(0);
	const detailRequest = useRef(0);
	const [modal, modalHolder] = Modal.useModal();
	const loadHistory = useCallback(async (nextPage: number) => {
		const request = ++listRequest.current;
		setLoading(true);
		setError("");
		try {
			const result = await fetchAnalysisHistory({ page: nextPage, page_size: 20, ...(filter ? { stock_code: filter } : {}) });
			if (request !== listRequest.current)
				return;
			if (result.status !== "success")
				throw new Error("读取失败");
			setItems(result.data.items);
			setTotal(result.data.total);
			setPage(nextPage);
		}
		catch {
			if (request === listRequest.current) {
				setItems([]);
				setTotal(0);
				setError("历史记录加载失败，请重试。");
			}
		}
		finally {
			if (request === listRequest.current)
				setLoading(false);
		}
	}, [filter]);
	useEffect(() => {
		void loadHistory(1);
		return () => {
			listRequest.current++;
		};
	}, [loadHistory]);
	useEffect(() => () => {
		detailRequest.current++;
	}, []);
	const viewDetail = useCallback(async (id: number) => {
		const request = ++detailRequest.current;
		setDetail(null);
		setDetailError("");
		setDetailOpen(true);
		setDetailLoading(true);
		try {
			const result = await fetchAnalysisDetail(id);
			if (request !== detailRequest.current)
				return;
			if (result.status !== "success" || !result.data?.analysis_data)
				throw new Error("详情为空");
			setDetail(result.data.analysis_data);
		}
		catch {
			if (request === detailRequest.current)
				setDetailError("该条历史详情加载失败，请关闭后重试。");
		}
		finally {
			if (request === detailRequest.current)
				setDetailLoading(false);
		}
	}, []);
	useEffect(() => {
		if (initialId && initialId > 0)
			void viewDetail(initialId);
	}, [initialId, viewDetail]);
	const removeRecord = (record: HistoryRecord) => modal.confirm({
		title: `删除 ${record.stock_name} 的这条分析记录？`,
		content: "只删除该历史分析记录，不影响自选和持仓。",
		okText: "删除记录",
		cancelText: "取消",
		okButtonProps: { danger: true },
		async onOk() {
			try {
				const result = await deleteAnalysisRecord(record.id);
				if (result.status !== "success")
					throw new Error(result.message || "删除失败");
				message.success("已删除分析记录");
				await loadHistory(items.length === 1 && page > 1 ? page - 1 : page);
			}
			catch (failure) {
				message.error("删除失败，请重试");
				throw failure;
			}
		},
	});
	const columns: ColumnsType<HistoryRecord> = [
		{ title: "股票", key: "stock", width: 175, fixed: "left", render: (_, row) => (
			<button type="button" className="sa-stock-link" onClick={() => viewDetail(row.id)}>
				<strong>{row.stock_name}</strong>
				<small>
					{row.stock_code}
					<span>{/^\d{5}$/.test(row.stock_code) ? "港股" : "A股"}</span>
				</small>
			</button>
		) },
		{ title: "分析建议", key: "action", width: 126, render: (_, row) => (
			<>
				<span className={`sa-action-label sa-action-${actionTone(row.action)}`}>{row.action || "未提供"}</span>
				<small className="sa-row-risk" data-risk={row.risk_level}>{row.risk_level ? `${row.risk_level}风险` : "风险未提供"}</small>
			</>
		) },
		{ title: "综合评分", key: "score", width: 118, render: (_, row) => (
			<>
				<strong className="sa-table-score">{finiteNumber(row.score) === null || Number(row.score) < 0 || Number(row.score) > 100 ? "待核验" : numberText(row.score, 0)}</strong>
				<small className="sa-muted">{finiteNumber(row.score) !== null && Number(row.score) >= 0 && Number(row.score) <= 100 ? " / 100" : "原始分数异常或缺失"}</small>
			</>
		) },
		{ title: "分析时价 / 涨跌幅", key: "price", width: 170, render: (_, row) => {
			const change = finiteNumber(row.change_pct);
			return (
				<>
					<b>{priceText(row.current_price, /^\d{5}$/.test(row.stock_code) ? "hk" : "a")}</b>
					<small className={change === null || change === 0 ? "sa-muted" : change > 0 ? "sa-up" : "sa-down"}>{change === null ? "涨跌幅未提供" : `${change > 0 ? "+" : ""}${numberText(change)}%`}</small>
				</>
			);
		} },
		{ title: "缓存命中", key: "hits", width: 116, render: (_, row) => <span className="sa-count">{/^\d{5}$/.test(row.stock_code) ? "不适用" : row.strategies_total === 0 ? "无策略数据" : `${numberText(row.strategies_hit, 0)} / ${numberText(row.strategies_total, 0)}`}</span> },
		{ title: "生成方式", key: "source", width: 120, render: (_, row) => <ResultSource value={row.llm_enhanced} /> },
		{ title: "分析时间", key: "time", width: 168, render: (_, row) => <span className="sa-time">{row.analyzed_at?.replace("T", " ") || "未标注"}</span> },
		{ title: "操作", key: "actions", width: 132, fixed: "right", render: (_, row) => (
			<Space size={2}>
				<Button type="link" onClick={() => viewDetail(row.id)}>查看报告</Button>
				<Dropdown
					trigger={["click"]}
					menu={{ items: [{ key: "watch", label: "加入自选盯盘", icon: <StarOutlined /> }, { type: "divider" }, { key: "delete", label: "删除记录", danger: true, icon: <DeleteOutlined /> }], onClick: ({ key }) => {
						if (key === "watch")
							setWatchlistTarget(row);
						else if (key === "delete")
							removeRecord(row);
					} }}
				>
					<Button type="text" icon={<MoreOutlined />} aria-label={`${row.stock_name}更多操作`} />
				</Dropdown>
			</Space>
		) },
	];
	return (
		<>
			{modalHolder}
			<div className="sa-history-panel">
				<div className="sa-history-heading">
					<div>
						<h2>
							历史分析
							<span>
								{total}
								{" "}
								条
							</span>
						</h2>
						<p>每次分析独立留存：宏观、赛道、公司、估值、技术面、筹码与拥挤度。选择股票后连续回看。</p>
					</div>
					<div className="sa-history-tools">
						<Segmented aria-label="历史展示方式" value={view} onChange={value => setView(String(value))} options={[{ value: "timeline", label: "分析时间线" }, { value: "table", label: "列表" }]} />
						<Input.Search
							aria-label="按股票代码筛选历史"
							placeholder="按股票代码筛选"
							value={search}
							onChange={event => setSearch(event.target.value)}
							allowClear
							onSearch={(value) => {
								const code = value.trim();
								if (code && !/^\d{5,6}$/.test(code)) {
									message.info("请输入 5 位港股或 6 位 A 股代码");
									return;
								}
								if (code === filter)
									void loadHistory(1);
								else
									setFilter(code);
							}}
						/>
						<Button icon={<ReloadOutlined />} loading={loading} onClick={() => loadHistory(page)}>刷新列表</Button>
					</div>
				</div>
				{filter && (
					<div className="sa-filter">
						<Tag
							closable
							onClose={() => {
								setSearch("");
								setFilter("");
							}}
						>
							股票
							{filter}
						</Tag>
					</div>
				)}
				{error && <Alert message={error} type="error" showIcon action={<Button onClick={() => loadHistory(page)}>重试</Button>} />}
				{view === "timeline"
					? (
						<Spin spinning={loading}>
							<div className="sa-analysis-timeline">
								{items.length
									? items.map(row => (
										<article key={row.id}>
											<div className="sa-timeline-heading">
												<div>
													<time>{row.analyzed_at?.replace("T", " ") || "时间未标注"}</time>
													<h3>
														{row.stock_name}
														{" "}
														<small>{row.stock_code}</small>
													</h3>
												</div>
												<Space wrap>
													<span className={`sa-action-label sa-action-${actionTone(row.action)}`}>{row.action || "未提供"}</span>
													<Tag>
														{row.risk_level || "未提供"}
														风险
													</Tag>
													<span>
														分析时价
														{priceText(row.current_price, /^\d{5}$/.test(row.stock_code) ? "hk" : "a")}
													</span>
												</Space>
											</div>
											<p className="sa-timeline-summary">{row.research_overview?.headline || row.summary || "早期记录，打开报告查看原始结论。"}</p>
											<div className="sa-timeline-layers">
												{row.research_overview?.layers.length
													? row.research_overview.layers.map(layer => (
														<div key={layer.key}>
															<span>{layer.title}</span>
															<ResearchStatus value={layer.status} />
															<p>{layer.conclusion}</p>
														</div>
													))
													: <span className="sa-muted">该次为早期报告，部分分析层未记录。</span>}
											</div>
											<Space wrap>
												<Button type="primary" onClick={() => viewDetail(row.id)}>查看报告</Button>
												<Button onClick={() => {
													setSearch(row.stock_code);
													setFilter(row.stock_code);
												}}
												>
													只看这只股票
												</Button>
												<Button href={`/short-term-strategy/stock-analysis?tab=history&stock_code=${row.stock_code}&analysis_id=${row.id}`}>打开历史页面</Button>
											</Space>
										</article>
									))
									: <Empty description={filter ? "该股票暂无历史分析" : "暂无历史分析，先创建一份报告"} />}
							</div>
							<Pagination current={page} total={total} pageSize={20} hideOnSinglePage showSizeChanger={false} onChange={nextPage => loadHistory(nextPage)} />
						</Spin>
					)
					: screens.md === false
						? (
							<Spin spinning={loading}>
								<div className="sa-mobile-history">
									{items.length
										? items.map(row => (
											<article key={row.id}>
												<div className="sa-mobile-stock">
													<button type="button" className="sa-stock-link" onClick={() => viewDetail(row.id)}>
														<strong>{row.stock_name}</strong>
														<small>{row.stock_code}</small>
													</button>
													<span className={`sa-action-label sa-action-${actionTone(row.action)}`}>
														{row.action || "未提供"}
														{" "}
														·
														{" "}
														{row.risk_level || "未标注"}
														风险
													</span>
												</div>
												<div className="sa-mobile-metrics">
													<div>
														<span>综合评分</span>
														<b>{finiteNumber(row.score) !== null && Number(row.score) >= 0 && Number(row.score) <= 100 ? `${numberText(row.score, 0)} / 100` : "待核验"}</b>
													</div>
													<div>
														<span>分析时价</span>
														<b>{priceText(row.current_price, /^\d{5}$/.test(row.stock_code) ? "hk" : "a")}</b>
													</div>
													<div>
														<span>生成方式</span>
														<ResultSource value={row.llm_enhanced} />
													</div>
												</div>
												<div className="sa-mobile-footer">
													<span>{row.analyzed_at?.replace("T", " ")}</span>
													<Button type="link" onClick={() => viewDetail(row.id)}>查看报告</Button>
													<Dropdown
														trigger={["click"]}
														menu={{ items: [{ key: "watch", label: "加入自选盯盘" }, { key: "delete", label: "删除记录", danger: true }], onClick: ({ key }) => {
															if (key === "watch")
																setWatchlistTarget(row);
															else if (key === "delete")
																removeRecord(row);
														} }}
													>
														<Button type="text" icon={<MoreOutlined />} aria-label={`${row.stock_name}更多操作`} />
													</Dropdown>
												</div>
											</article>
										))
										: <Empty description="暂无历史分析" />}
								</div>
								<Pagination size="small" simple current={page} total={total} pageSize={20} hideOnSinglePage onChange={nextPage => loadHistory(nextPage)} />
							</Spin>
						)
						: <Table columns={columns} dataSource={items} rowKey="id" loading={loading} scroll={{ x: 1125 }} size="middle" locale={{ emptyText: <Empty description={filter ? "该股票暂无历史分析" : "暂无历史分析，先输入股票创建一份报告"} /> }} pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, hideOnSinglePage: true, onChange: nextPage => loadHistory(nextPage), showTotal: count => `共 ${count} 条分析记录` }} />}
				<p className="sa-table-note">缓存命中只表示进入推荐名单的数量；生成方式帮助区分模型结果与规则降级。</p>
			</div>
			<Drawer
				rootClassName="sa-detail-drawer"
				title="历史分析详情"
				width="min(1240px, 100vw)"
				open={detailOpen}
				onClose={() => {
					detailRequest.current++;
					setDetailOpen(false);
					setDetail(null);
				}}
				destroyOnClose
			>
				<AnalysisSurface>{detailLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : detailError ? <Alert type="error" showIcon message={detailError} /> : detail ? <AnalysisResult key={`${detail.stock_code}-${detail.analyzed_at}`} data={detail} historical /> : <Empty />}</AnalysisSurface>
			</Drawer>
			<WatchlistModal open={!!watchlistTarget} onClose={() => setWatchlistTarget(null)} onSuccess={() => setWatchlistTarget(null)} stockCode={watchlistTarget?.stock_code || ""} stockName={watchlistTarget?.stock_name || ""} suggestedBuyPrice={finiteNumber(watchlistTarget?.current_price) || undefined} sourceDate={watchlistTarget?.market_date} />
		</>
	);
}
export default function StockAnalysisPage() {
	const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
	const [stockInput, setStockInput] = useState("");
	const [submittedStock, setSubmittedStock] = useState("");
	const [data, setData] = useState<AnalysisData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [elapsed, setElapsed] = useState(0);
	const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
	const [savingHistory, setSavingHistory] = useState(false);
	const savingHistoryRequest = useRef(false);
	const query = new URLSearchParams(window.location.search);
	const initialCode = query.get("stock_code") || "";
	const initialId = Number(query.get("analysis_id"));
	const running = useRef(false);
	const analysisRequest = useRef(0);
	const workspace = activeTab === "performance" ? "performance" : ["watchlist", "portfolio", "unwind"].includes(activeTab) ? "tracking" : "research";
	const selectTab = useCallback((key: TabKey) => {
		setActiveTab(key);
		try {
			sessionStorage.setItem(storageKey, key);
		}
		catch {
		}
	}, []);
	useEffect(() => () => {
		analysisRequest.current++;
	}, []);
	useEffect(() => {
		if (!loading)
			return;
		const started = Date.now();
		const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
		return () => clearInterval(timer);
	}, [loading]);
	const handleAnalyze = async () => {
		const input = stockInput.trim();
		if (!input || running.current)
			return;
		running.current = true;
		const request = ++analysisRequest.current;
		setElapsed(0);
		setSubmittedStock(input);
		setLoading(true);
		setError("");
		setData(null);
		selectTab("analyze");
		try {
			const result = await fetchStockAnalysis(input);
			if (request !== analysisRequest.current)
				return;
			if (result.status !== "success" || !result.data)
				throw new Error(result.message || "本次分析未完成，请稍后重试。");
			setData(result.data);
			setHistoryRefreshKey(key => key + 1);
		}
		catch (failure) {
			if (request === analysisRequest.current)
				setError(failure instanceof Error ? failure.message : "本次分析失败，请检查网络后重试。");
		}
		finally {
			if (request === analysisRequest.current) {
				running.current = false;
				setLoading(false);
			}
		}
	};
	const retryHistory = async () => {
		if (!data || savingHistoryRequest.current)
			return;
		savingHistoryRequest.current = true;
		const frozen = data;
		const generation = analysisRequest.current;
		setSavingHistory(true);
		try {
			const response = await retrySaveStockAnalysis(data);
			if (response.status !== "success")
				throw new Error("保存未完成");
			setData(previous => analysisRequest.current === generation && previous && previous.stock_code === frozen.stock_code && previous.analyzed_at === frozen.analyzed_at && previous.snapshot_hash === frozen.snapshot_hash ? { ...previous, history_saved: true, history_id: response.data.history_id, history_error: undefined } : previous);
			setHistoryRefreshKey(key => key + 1);
			message.success("原始分析快照已保存");
		}
		catch {
			message.error("历史保存失败，本次报告仍可查看，请稍后重试。");
		}
		finally {
			savingHistoryRequest.current = false;
			setSavingHistory(false);
		}
	};
	return (
		<AnalysisSurface className="sa-workspace">
			<header className="sa-workspace-header app-page-hero">
				<div>
					<span className="sa-eyebrow">股票研究工作台</span>
					<h1>个股分析</h1>
					<p>先看重点，再按宏观、基本面、技术面、筹码与拥挤度逐层判断。</p>
				</div>
				<div className="sa-search">
					<div className="sa-search-controls">
						<Input aria-label="股票代码或公司名称" prefix={<SearchOutlined />} placeholder="输入股票代码或名称，如 600519" maxLength={20} value={stockInput} onChange={event => setStockInput(event.target.value)} onPressEnter={() => handleAnalyze()} allowClear size="large" />
						<Button type="primary" size="large" loading={loading} disabled={!stockInput.trim()} onClick={handleAnalyze}>开始分析</Button>
					</div>
					<span>支持 A 股与港股 · 每次分析生成独立快照</span>
				</div>
			</header>
			<Tabs className="sa-workspace-tabs" activeKey={workspace} onChange={key => selectTab(key === "tracking" ? "watchlist" : key === "performance" ? "performance" : data || loading ? "analyze" : "history")} items={[{ key: "research", label: "个股研究" }, { key: "tracking", label: "跟踪与持仓" }, { key: "performance", label: "战法复盘" }]} />
			{workspace === "research" && (
				<div className="sa-subnav">
					<Segmented value={activeTab} onChange={key => selectTab(key as TabKey)} options={[{ value: "analyze", label: "本次分析", icon: <SearchOutlined /> }, { value: "history", label: "历史记录", icon: <HistoryOutlined /> }]} />
					<span className="sa-muted">{loading ? `正在分析 ${submittedStock} · 已等待 ${elapsed} 秒` : "研究结果与历史快照"}</span>
				</div>
			)}
			{workspace === "tracking" && <div className="sa-subnav"><Segmented value={activeTab} onChange={key => selectTab(key as TabKey)} options={[{ value: "watchlist", label: "自选盯盘" }, { value: "portfolio", label: "整体持仓" }, { value: "unwind", label: "解套跟踪" }]} /></div>}
			{activeTab === "analyze" && (
				<>
					{loading && (
						<div className="sa-loading" role="status">
							<Spin size="large" />
							<h2>正在获取数据并生成分析</h2>
							<p>
								已等待
								{elapsed}
								{" "}
								秒。可切换查看历史记录，结果完成后在「本次分析」查看。
							</p>
							<Skeleton active paragraph={{ rows: 4 }} title={false} />
						</div>
					)}
					{error && !loading && <Alert type="error" showIcon message="分析未完成" description={error} action={<Button onClick={handleAnalyze}>重试</Button>} />}
					{!loading && !error && !data && (
						<div className="sa-empty">
							<div className="sa-empty-icon"><SearchOutlined /></div>
							<h2>从一只股票开始</h2>
							<p>输入股票代码或公司名称，查看研究结论、风险与价格计划。</p>
							<div className="sa-empty-grid">
								<div>
									<span>01</span>
									<h3>判断与计划</h3>
									<p>建议、风险、参考区间</p>
								</div>
								<div>
									<span>02</span>
									<h3>研究依据</h3>
									<p>宏观、赛道、公司、估值、技术、筹码</p>
								</div>
								<div>
									<span>03</span>
									<h3>历史留痕</h3>
									<p>回看每一次判断的时间</p>
								</div>
							</div>
							<Button icon={<HistoryOutlined />} onClick={() => selectTab("history")}>查看历史记录</Button>
						</div>
					)}
					{data && !loading && (
						<>
							{data.history_saved === false && <Alert type="warning" showIcon message="分析已完成，历史尚未保存" description={data.history_error || "请重试保存原始快照。"} action={<Button loading={savingHistory} onClick={retryHistory}>重试保存</Button>} />}
							{data.history_saved && data.history_id && (
								<div className="sa-save-status">
									已保存独立分析快照 ·
									<a href={`/short-term-strategy/stock-analysis?tab=history&stock_code=${data.stock_code}&analysis_id=${data.history_id}`}>打开本次历史分析</a>
								</div>
							)}
							<AnalysisResult key={`${data.stock_code}-${data.analyzed_at}`} data={data} />
						</>
					)}
				</>
			)}
			{activeTab === "history" && <HistoryTab key={historyRefreshKey} initialFilter={/^\d{5,6}$/.test(initialCode) ? initialCode : ""} initialId={Number.isInteger(initialId) && initialId > 0 ? initialId : undefined} />}
			{activeTab === "watchlist" && <WatchlistPanel />}
			{activeTab === "portfolio" && <PortfolioAnalysisPanel />}
			{activeTab === "unwind" && <UnwindTrackingPanel />}
			{activeTab === "performance" && <StrategyPerformanceDashboard />}
		</AnalysisSurface>
	);
}
