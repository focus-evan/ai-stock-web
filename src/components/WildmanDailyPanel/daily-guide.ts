import type { UnwindPlan } from "#src/api/strategy";
import { freshUnwindQuote } from "../UnwindTrackingPanel/price-alerts";
import { beijingTime, strategyTime, timestamp } from "../UnwindTrackingPanel/strategy-time";

export type GuidePhase = "sell" | "buyback" | "recovery" | "wait" | "blocked";
export interface GuideStep { title: string, instruction: string, price?: number, shares?: number }
export interface DailyGuide {
	phase: GuidePhase
	title: string
	reason: string
	tone: "red" | "gold" | "green" | "blue" | "default"
	steps: GuideStep[]
	cancel: string
	dataDate: string
	period: string
	live: boolean
	needsRefresh: boolean
	symbol: string
	quantity: number
	expectedNet: number | null
	projectedCost: number | null
	strategyDate: string
	generatedAt: string
	quoteAt: string
	currentPrice: number | null
	canAct: boolean
	currentQuantity: number
	currentAction: string
	currentReason: string
	currentLimit: number | null
}

export function beijingClock(now = new Date()) {
	const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Shanghai",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		weekday: "short",
	}).formatToParts(now).filter(p => p.type !== "literal").map(p => [p.type, p.value]));
	return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekend: ["Sat", "Sun"].includes(parts.weekday) };
}

function positive(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function price(value: number, symbol: string) {
	return `${symbol}${value.toFixed(symbol === "HK$" ? 3 : 2)}`;
}

/** Convert the saved daily snapshot into a dated conditional guide; it never mutates the trading ledger. */
export function buildDailyGuide(plan: UnwindPlan, now = new Date()): DailyGuide {
	const a = plan.execution?.plan;
	const signal = plan.execution?.signal;
	const hk = a?.market === "hk" || /^\d{5}$/.test(plan.stock_code);
	const symbol = hk ? "HK$" : "¥";
	const time = strategyTime(a, now);
	const quote = freshUnwindQuote(plan, now);
	const checked = timestamp(signal?.checked_at)?.getTime() || 0;
	const ledgerChanged = plan.trades.some(trade => (timestamp(trade.created_at)?.getTime() || Infinity) > checked);
	const baselineChanged = a && ((a.baseline_shares != null && a.baseline_shares !== plan.baseline_shares) || (a.baseline_cost_price != null && Math.abs(a.baseline_cost_price - plan.baseline_cost_price) > 0.0001));
	const needsRefresh = !a?.trading_date || !time.current || ledgerChanged || Boolean(baselineChanged);
	const live = Boolean(quote && !needsRefresh);
	const readyAction = plan.open_sold_shares > 0 ? "BUY_BACK" : "SELL";
	const target = signal?.target_price;
	const quoteInRange = quote && positive(target) && (readyAction === "BUY_BACK"
		? quote.price <= target && quote.price >= Number(a?.pause_buy_below)
		: quote.price >= target && quote.price <= Number(a?.cancel_sell_above));
	const canAct = live && Boolean(quoteInRange) && !signal?.invalidated && signal?.action === readyAction && positive(signal.shares) && positive(signal.limit_price) && signal.limit_price === target;
	const period = needsRefresh ? "当天预案待更新 · 暂不执行" : signal?.phase === "premarket" ? "今日盘前预案 · 开盘后确认" : signal?.phase === "break" ? "今日预案 · 午间休市" : signal?.phase !== "intraday" ? "非连续交易时段 · 只看预案" : live ? "今日预案 · 盘中核验" : "今日预案已就绪 · 等待新报价";
	const base: DailyGuide = {
		phase: "wait",
		title: "等待数据",
		reason: "",
		tone: "default",
		steps: [],
		cancel: "出现重大公告风险、板块加速退潮或实际可卖数量不足时，取消卖出与接回计划。",
		dataDate: time.dataDate,
		strategyDate: a?.trading_date || "",
		generatedAt: time.generatedAt,
		quoteAt: quote ? beijingTime(quote.at) : "",
		currentPrice: quote?.price ?? null,
		period,
		live,
		needsRefresh,
		symbol,
		quantity: 0,
		expectedNet: null,
		projectedCost: null,
		canAct,
		currentQuantity: canAct ? signal!.shares! : 0,
		currentLimit: canAct ? signal!.limit_price! : null,
		currentAction: canAct ? `条件已通过 · 复核${readyAction === "SELL" ? "卖出" : "接回"}` : "现在不下单，等待条件",
		currentReason: live || signal?.phase !== "intraday" ? signal?.reason || "等待盘中条件确认" : "下方保留今日预案；盘中价格尚未核验或已超过120秒，先点击“立即检查价格”。",
	};
	const result = (patch: Partial<DailyGuide>): DailyGuide => {
		const guide = { ...base, ...patch };
		if (guide.phase === "blocked" || guide.phase === "recovery") {
			guide.canAct = false;
			guide.currentQuantity = 0;
			guide.currentLimit = null;
			guide.currentAction = "现在不下单，先处理下方事项";
			guide.currentReason = guide.reason;
		}
		if (guide.canAct && (guide.currentQuantity > guide.quantity || guide.currentQuantity % (a?.lot_size || 100) !== 0)) {
			guide.canAct = false;
			guide.phase = "blocked";
			guide.needsRefresh = true;
			guide.quantity = 0;
			guide.currentQuantity = 0;
			guide.currentLimit = null;
			guide.title = "股数与持仓不一致，先重新核验";
			guide.currentAction = "股数待复核，暂不下单";
			guide.currentReason = "当前触发股数与持仓容量不一致，更新持仓与行情后再判断。";
			guide.steps = [{ title: "重新核对持仓", instruction: "更新持仓与行情，不按未核验的股数下单。" }];
		}
		return guide;
	};
	if (needsRefresh || !a)
		return result({ phase: "blocked", title: ledgerChanged || baselineChanged ? "持仓已变化，先重新核验" : "等待当天早盘预案", reason: "每个交易日09:00起由后台生成当天策略。当前缺少有效的当天预案、已过有效期或持仓有变化；更新后再判断，不沿用旧日买卖价。", steps: [{ title: "更新今日策略与持仓", instruction: "点击“更新今日策略 / 行情”。非交易日不生成操作单，收市后等待下一交易日预案。" }] });
	if (signal?.invalidated)
		return result({ phase: "blocked", title: "今日计划已失效，停止本轮", reason: signal.reason, steps: [{ title: "取消本轮候选操作", instruction: "不要继续按原卖出或接回价下单；核对持仓与公告，等待新的有效预案。" }] });
	const t = a.technical;
	if (!positive(t.current_price) || !positive(plan.effective_cost) || !positive(plan.baseline_shares) || !positive(t.support_10d) || !positive(t.resistance_10d))
		return result({ phase: "blocked", title: "关键价格不完整", reason: "缺少现价、持仓、有效成本或支撑压力，暂停生成价格与数量。", steps: [{ title: "补齐数据", instruction: "刷新指导；仍不完整时暂不执行。" }] });
	if (a.is_special_treatment || /ST|退市/i.test(plan.stock_name))
		return result({ phase: "blocked", title: "风险警示股，暂停老太太策略", tone: "red", reason: "该股票带有交易风险标识。先核对公告与退出风险，不能用反复接回代替风险处理。", steps: [{ title: "优先处理风险", instruction: "核对风险公告与券商交易限制，不新增接回计划。" }] });
	const lot = Math.max(1, a.lot_size || 100);
	if (!plan.open_sold_shares && plan.baseline_shares < 2 * lot)
		return result({ phase: "blocked", title: "一手仓保留底仓，不做反T", reason: "保留底仓后不足一手，不通过清仓制造滚动机会。退出风险另行评估。", steps: [{ title: "保持持仓可核对", instruction: "不追加资金凑整手，停止一手整仓反T。" }] });
	const sellLow = a.sell_zone_low ?? a.sell_trigger_price;
	const sellHigh = a.sell_zone_high ?? sellLow;
	const buy = plan.open_sold_shares > 0 ? signal?.target_price : a.buyback_price;
	const stop = a.pause_buy_below;
	const observedPrice = quote?.price ?? t.current_price;
	if (positive(stop) && observedPrice < stop)
		return result({ phase: "blocked", title: "已经破位，本轮不接回", tone: "red", reason: `最新有效价格低于暂停买回线 ${price(stop, symbol)}，先保留资金并重新评估持仓逻辑。`, steps: [{ title: "取消接回", instruction: "不要把下跌加速当作更便宜的买点；下一次有效修复后再生成新计划。" }], cancel: `本轮接回计划失效：价格已低于 ${price(stop, symbol)}。` });
	if (plan.open_sold_shares > 0) {
		if (!positive(buy) || !positive(stop) || buy <= stop)
			return result({ phase: "blocked", title: "实际接回目标待核验", tone: "red", reason: "接回目标须按真实卖出记录重新计算；当前目标缺失或与支撑冲突，先保留资金。", steps: [{ title: "重新计算", instruction: "开盘后点击“立即检查价格”，按真实资金池重算；不沿用卖出前的参考价。" }] });
		const halfFee = Math.max(0, a.estimated_round_trip_cost_pct ?? (hk ? 0.45 : 0.25)) / 200;
		let affordable = Math.floor(plan.cash_pool / (buy * (1 + halfFee)) / lot) * lot;
		while (affordable > 0 && affordable * buy + Math.max(hk ? 20 : 5, affordable * buy * halfFee) > plan.cash_pool) affordable -= lot;
		const quantity = Math.max(0, Math.floor(Math.min(plan.open_sold_shares, signal?.planned_shares || 0, affordable) / lot) * lot);
		const averageSell = plan.open_sell_amount / plan.open_sold_shares;
		const net = (averageSell - buy) * quantity - Math.max(hk ? 20 : 5, buy * quantity * halfFee);
		if (quantity < lot || net <= 0)
			return result({ phase: "blocked", title: "费后资金或价差不足", tone: "red", reason: "卖出资金池不足以覆盖整手接回及估算费用，或接回后的净价差非正。", steps: [{ title: "保留卖出资金", instruction: "不追加资金凑整手，不挪用其他股票的资金池。" }] });
		return result({ phase: "buyback", title: canAct ? "接回条件已通过，核对后限价处理" : "已卖出，等低价接回", tone: "blue", reason: `已有 ${plan.open_sold_shares} 股实际卖出记录。先处理这笔，暂停继续卖出；每只股票使用自己的资金池。`, quantity, expectedNet: net, projectedCost: plan.effective_cost - net / plan.baseline_shares, steps: [
			{ title: "先确认接回条件", instruction: `价格与卖一均不高于 ${price(buy, symbol)}，且不低于 ${price(stop, symbol)}；后台须确认连续两次有效报价平稳或回升。下跌趋势还须脱离日内低点；验证信号或页面仍显示等待时不下单。` },
			{ title: "满足条件再限价接回", price: buy, shares: quantity, instruction: `最多接回 ${quantity} 股，价格不高于 ${price(buy, symbol)}；成交前核对实际费用，含费用总额不得超过资金池 ${price(plan.cash_pool, symbol)}。` },
			{ title: "没有回落就接受卖飞", instruction: "不向上改价追回，不为了凑回原股数追加资金。记录真实成交后，系统才计算已实现降本。" },
		], cancel: `跌破 ${price(stop, symbol)}、新利空或板块加速退潮：取消接回。未成交不计入降本。` });
	}
	if (observedPrice >= plan.effective_cost || a.decision === "TARGET_REACHED") {
		const half = Math.floor(plan.current_shares / 2 / lot) * lot;
		return result({ phase: "recovery", title: "回到成本线，转为退出计划", tone: "green", reason: "作者的解套目标已经接近或达到，预期应从降成本切换为处理被套仓位。", quantity: half, steps: [
			{ title: "先确认成本线仍成立", instruction: `开盘后价格仍不低于有效成本 ${price(plan.effective_cost, symbol)}，并且含费用后不亏损，才进入退出步骤。` },
			{ title: "冲高时先处理一半", shares: half, price: plan.effective_cost, instruction: half >= lot ? `冲高达到成本线后可先处理 ${half} 股；使用限价，核对券商可卖数量与卖出费用。` : "持仓不足以分成两笔整手：不能硬拆一半，先选择整手退出或继续观察。" },
			{ title: "余仓看修复是否持续", instruction: "修复持续时观察余仓；修复不及预期、重新走弱时，以退出为目标重新评估，不把解套仓变成恋战仓。" },
		] });
	}
	if (t.trend === "UP" || a.decision === "HOLD_TREND") {
		return result({ phase: "recovery", title: "修复阶段，暂停开盘机械卖出", tone: "green", reason: "3/16趋势偏强，进入作者所说的修复观察阶段。不能仅因前几天做过反T，就每天重复开盘卖出。", steps: [
			{ title: "开盘先看修复是否延续", instruction: "观察竞价与开盘后15分钟；高开后站稳分时均价且板块同步修复，先保留仓位。" },
			{ title: "接近成本线准备退出", price: plan.effective_cost, instruction: `以有效成本 ${price(plan.effective_cost, symbol)} 为复核线；到线后重算卖出费用与分批数量，不提前把反弹当成已解套。` },
			{ title: "修复失败就重算", instruction: positive(stop) ? `跌破 ${price(stop, symbol)} 或出现新增利空时，停止解套循环，转为风险评估。` : "修复失败或出现新增利空时，停止解套循环，转为风险评估。" },
		] });
	}
	if (["HOLD_TOO_SMALL", "ST_ONE_LOT_NO_ROTATION"].includes(a.decision) || !positive(sellLow) || !positive(sellHigh) || !positive(buy) || !positive(stop) || buy <= stop || buy >= sellLow || !positive(a.expected_net_reduction))
		return result({ phase: "blocked", title: "本轮不适合做价差", tone: "red", reason: "整手数量、净价差或支撑条件没有通过。今天不为降成本而强行增加交易。", steps: [{ title: "等待更清楚的机会", instruction: "保持资金与仓位可纠错，等价格结构或持仓条件改善后重新生成指导。" }] });
	const capacity = Math.floor(Math.max(0, plan.current_shares - (a.core_floor_shares || 0)) / lot) * lot;
	const quantity = Math.floor(Math.min(a.sell_shares, capacity, signal?.planned_shares ?? a.sell_shares) / lot) * lot;
	if (quantity < lot)
		return result({ phase: "blocked", title: "可滚动数量不足一手", tone: "red", reason: "保留底仓后没有足够整手数量，不能为了做T追加资金。", steps: [{ title: "暂不执行", instruction: "核对持仓与每手股数，等待原持仓自然达到可操作条件。" }] });
	const ready = canAct && signal?.action === "SELL";
	const expectedNet = (a.expected_net_reduction || 0) * quantity / a.sell_shares;
	return result({ phase: ready ? "sell" : "wait", title: ready ? "卖点候选，等待盘中确认" : "先等反弹，不在低位卖", tone: "gold", reason: a.reason, quantity, expectedNet, projectedCost: plan.effective_cost - expectedNet / plan.baseline_shares, steps: [
		{ title: "等反弹进入卖区", instruction: `候选卖价不低于 ${price(sellLow, symbol)}，突破 ${price(Number(a.cancel_sell_above), symbol)} 取消；超过原候选区上沿仍需连续报价确认冲高受阻。当前为验证模式，保留信号用于回放，不据此直接下单。` },
		{ title: "触发后先卖旧仓", price: sellLow, shares: quantity, instruction: `本轮最多卖 ${quantity} 股，至少保留 ${a.core_floor_shares || 0} 股；数量不得超过券商显示的可卖旧仓。${a.requires_manual_confirmation ? "小仓整手回转占比较高，卖出会明显减少仓位，需先确认能接受卖飞。" : ""}` },
		{ title: "实际成交后才等接回", price: buy, shares: quantity, instruction: `卖出成交后录入真实价格与费用，再刷新指导重算接回价。当前 ${price(buy, symbol)} 只是预案参考；以成交后重算的目标价和股数为准，连续两次有效报价止跌、且不破 ${price(stop, symbol)}，才复核接回。` },
		{ title: "不回落，不追；修复后换目标", instruction: "卖后继续上涨则保留现金与底仓；修复并回到成本线后，转为分批退出，不无限重复反T。" },
	], cancel: `${positive(a.cancel_sell_above) ? `放量突破 ${price(a.cancel_sell_above, symbol)} 取消卖出；` : ""}跌破 ${price(stop, symbol)} 暂停接回。实际成交价改变后必须重算。` });
}

export function guideText(plan: UnwindPlan, guide: DailyGuide) {
	return [`${plan.stock_name} ${plan.stock_code}｜野人每日解套`, `策略适用日期 ${guide.strategyDate || "未生成"}；生成于 ${guide.generatedAt || "未知"}；日线依据 ${guide.dataDate || "未知"}`, `${guide.period}；盘中报价时间 ${guide.quoteAt || "未核验"}`, `当前动作：${guide.currentAction}；当前可复核 ${guide.currentQuantity} 股；限价 ${guide.currentLimit == null ? "待触发" : price(guide.currentLimit, guide.symbol)}；${guide.currentReason}`, guide.title, guide.reason, "执行前：核对公司公告与持仓逻辑、市场/板块状态、券商可卖股数；未确认不执行。", ...guide.steps.map((s, i) => `${i + 1}. ${s.title}：${s.instruction}`), `取消条件：${guide.cancel}`, "系统保护版：连续报价确认、底仓、手续费及支撑过滤为系统规则；降本预期仅在真实成交后核算。"].join("\n");
}

export function wildmanAlertEligible(plan: UnwindPlan, now: Date) {
	const guide = buildDailyGuide(plan, now);
	return ["sell", "wait", "buyback"].includes(guide.phase) && !guide.needsRefresh;
}
