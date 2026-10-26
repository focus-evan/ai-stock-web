import { fetchWildmanHoldings, generateWildmanUnwindPlans } from "#src/api/wildman";
import WildmanDailyPanel from "#src/components/WildmanDailyPanel";
import { appRouteHref } from "#src/utils/app-route-href";
import { useEffect, useRef, useState } from "react";
import { useSnapshot } from "./use-snapshot";

function quantity(value: number | null) {
	return typeof value === "number" && Number.isFinite(value) ? `${value.toLocaleString("zh-CN")} 股` : "待补录 / 待核实";
}

export default function WildmanHoldingsPanel({ onOpenLedger, embedded = false }: { onOpenLedger: () => void, embedded?: boolean }) {
	const snapshot = useSnapshot(fetchWildmanHoldings, "实际持仓读取失败，不能判断为没有持仓。请重新读取后再使用解套计划。");
	const [showPlans, setShowPlans] = useState(true);
	const [revision, setRevision] = useState(0);
	const [generating, setGenerating] = useState(false);
	const [generationMessage, setGenerationMessage] = useState("");
	const mounted = useRef(false);
	const generatingRef = useRef(false);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	async function generate() {
		if (generatingRef.current)
			return;
		generatingRef.current = true;
		setGenerating(true);
		setGenerationMessage("");
		try {
			const result = await generateWildmanUnwindPlans();
			if (!mounted.current)
				return;
			if (!["success", "partial"].includes(result.status))
				throw new Error("更新失败");
			const failures = result.data.errors?.length || 0;
			setGenerationMessage(failures ? `本次处理 ${result.data.total} 只，${failures} 只未完成；请核对下方持仓与计划状态。` : "已完成本次生成请求，正在重新读取持仓与解套计划。");
			await snapshot.read();
			if (mounted.current) {
				setRevision(value => value + 1);
				setShowPlans(true);
			}
		}
		catch {
			if (mounted.current)
				setGenerationMessage("解套生成 / 更新失败，请重试；不按旧价格执行。");
		}
		finally {
			generatingRef.current = false;
			if (mounted.current)
				setGenerating(false);
		}
	}
	const data = snapshot.data;
	return (
		<section className="wildman-holdings" aria-label="我的实际持仓解套">
			<div className="wildman-section-title">
				<div>
					<h3>我的实际持仓</h3>
					<p>自动读取你在系统登记的持仓与成交账本，每60秒同步。此处不连接券商，也不把总持仓当作今日可卖股数。</p>
				</div>
				<button type="button" onClick={() => void snapshot.read()} disabled={snapshot.loading}>{snapshot.loading ? "正在读取持仓…" : "重新读取持仓"}</button>
			</div>
			{snapshot.error && <div className="wildman-error" role="alert">{snapshot.error}</div>}
			{!data && !snapshot.error && <p role="status">正在读取已登记持仓…</p>}
			{data && (
				<>
					<p className="wildman-note">
						来源：系统登记持仓 · 共
						{data.total}
						{" "}
						只 · 已有解套账户
						{data.initialized}
						{" "}
						只 · 待生成 / 更新
						{data.pending}
						{" "}
						只
					</p>
					{data.items.length === 0
						? <p className="wildman-empty">尚未登记实际持仓。请先在自选盯盘填写持仓成本与股数。</p>
						: (
							<div className="wildman-holding-grid">
								{data.items.map(item => (
									<article className="wildman-holding" key={item.watchlist_id}>
										<h4>
											{item.stock_name || item.stock_code}
											<small>{item.stock_code}</small>
										</h4>
										<dl>
											<div>
												<dt>账本当前股数</dt>
												<dd>{quantity(item.current_shares)}</dd>
											</div>
											<div>
												<dt>有效成本</dt>
												<dd>{typeof item.effective_cost === "number" && Number.isFinite(item.effective_cost) ? item.effective_cost.toFixed(/^\d{5}$/.test(item.stock_code) ? 3 : 2) : "待补录 / 待核实"}</dd>
											</div>
										</dl>
										<p className={item.position_conflict ? "wildman-conflict" : "wildman-note"}>{item.position_conflict ? "持仓基准有冲突，先核对登记与真实成交，暂不按该股旧计划执行。" : item.has_unwind_account ? "已有解套账本 · 仍需核验当天计划" : "已登记持仓 · 尚未建立解套计划"}</p>
										{item.registration_complete === false && <p className="wildman-conflict">持仓资料待补录，请先核对登记成本与股数；不会按零仓或清仓处理。</p>}
									</article>
								))}
							</div>
						)}
					<div className="wildman-actions">
						{data.total > 0 && <button className="wildman-primary" type="button" onClick={() => void generate()} disabled={generating}>{generating ? "正在生成 / 更新解套…" : "根据我的持仓生成/更新解套"}</button>}
						{data.initialized > 0 && <button type="button" onClick={() => setShowPlans(value => !value)}>{showPlans ? "收起解套操作单" : "查看已有解套操作单"}</button>}
						<button type="button" onClick={onOpenLedger}>查看 / 记录真实成交</button>
						<a href={appRouteHref("/short-term-strategy/stock-analysis?tab=watchlist")} target="_top">管理已登记持仓</a>
					</div>
				</>
			)}
			{generationMessage && <p role="status" className="wildman-generation-message">{generationMessage}</p>}
			{showPlans && data && data.initialized > 0 && !snapshot.error && <WildmanDailyPanel key={revision} onOpenLedger={onOpenLedger} embedded={embedded} />}
		</section>
	);
}
