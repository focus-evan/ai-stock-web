import type { ColumnsType } from "antd/es/table";
import type { AnalysisData } from "./presentation";
import { deleteAnalysisRecord, fetchAnalysisDetail, fetchAnalysisHistory, fetchStockAnalysis } from "#src/api/strategy";
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
import "./stock-analysis.css";

type HistoryRecord = Omit<Partial<AnalysisData>, "llm_enhanced"> & {
	id: number
	stock_code: string
	stock_name: string
	llm_enhanced?: boolean | number
};
type TabKey = "analyze" | "history" | "performance" | "watchlist" | "portfolio" | "unwind";
const storageKey = "stock_analysis_active_tab";
const validTabs: TabKey[] = ["analyze", "history", "performance", "watchlist", "portfolio", "unwind"];
function initialTab(): TabKey {
	try {
		const saved = sessionStorage.getItem(storageKey) as TabKey;
		return validTabs.includes(saved) ? saved : "analyze";
	}
	catch {
		return "analyze";
	}
}
export function HistoryTab() {
	const screens = Grid.useBreakpoint();
	const [items, setItems] = useState<HistoryRecord[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState("");
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
	const viewDetail = async (id: number) => {
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
	};
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
						<p>保留每次判断的时间与依据；表中价格为分析时快照。</p>
					</div>
					<div className="sa-history-tools">
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
				{screens.md === false
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
	return (
		<AnalysisSurface className="sa-workspace">
			<header className="sa-workspace-header app-page-hero">
				<div>
					<span className="sa-eyebrow">股票研究工作台</span>
					<h1>个股分析</h1>
					<p>先看结论和风险，再展开研究依据。</p>
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
									<p>六维分析、催化与反证</p>
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
					{data && !loading && <AnalysisResult key={`${data.stock_code}-${data.analyzed_at}`} data={data} />}
				</>
			)}
			{activeTab === "history" && <HistoryTab key={historyRefreshKey} />}
			{activeTab === "watchlist" && <WatchlistPanel />}
			{activeTab === "portfolio" && <PortfolioAnalysisPanel />}
			{activeTab === "unwind" && <UnwindTrackingPanel />}
			{activeTab === "performance" && <StrategyPerformanceDashboard />}
		</AnalysisSurface>
	);
}
