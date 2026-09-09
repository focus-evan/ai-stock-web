import type { StrategyTradeCycle, StrategyTradeExecution } from "#src/api/strategy";
import { fetchStrategyTradeJournal } from "#src/api/strategy";

export const SHORT_TERM_TACTICS = [
	{ type: "yangjia_emotion_cycle", name: "炒股养家情绪周期" },
	{ type: "kobe92_cycle_speculation", name: "92科比周期投机" },
	{ type: "a_share_leader_tactics", name: "陈小群龙头战法" },
	{ type: "beijing_chaogu_first_board", name: "北京炒家首板" },
] as const;
export type ShortTermTactic = typeof SHORT_TERM_TACTICS[number];

export interface TradeAlertItem {
	id: string
	tactic: ShortTermTactic
	cycle: StrategyTradeCycle
	execution: StrategyTradeExecution
}

export function beijingTradeDate(now = new Date()): string {
	return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function showTradeAlertsOnPath(pathname: string): boolean {
	return ["/home", "/short-term-strategy/portfolio", "/short-term-strategy/skill-tactics"].includes(pathname.replace(/\/$/, ""));
}

export async function loadTacticTradeCycles(strategy: ShortTermTactic["type"], signal?: AbortSignal): Promise<StrategyTradeCycle[]> {
	const cycles = new Map<string, StrategyTradeCycle>();
	let offset = 0;
	let total = 1;
	while (offset < total) {
		signal?.throwIfAborted();
		const response = await fetchStrategyTradeJournal(strategy, "all", 100, offset);
		signal?.throwIfAborted();
		if (response.status !== "success" || !response.data)
			throw new Error("成交记录加载失败");
		const page = response.data;
		if (offset === 0)
			total = page.total;
		if (!page.items.length && offset < total)
			throw new Error("成交记录分页不完整");
		for (const cycle of page.items)
			cycles.set(cycle.id, cycle);
		offset += page.items.length;
	}
	return [...cycles.values()];
}

export function todayTradeAlerts(tactic: ShortTermTactic, cycles: StrategyTradeCycle[], day: string): TradeAlertItem[] {
	const events = new Map<string, TradeAlertItem>();
	for (const cycle of cycles) {
		for (const execution of cycle.executions) {
			if (execution.date !== day || !["buy", "sell"].includes(execution.direction))
				continue;
			const id = `${tactic.type}:${cycle.portfolio_id}:${execution.trade_id}`;
			events.set(id, { id, tactic, cycle, execution });
		}
	}
	return [...events.values()];
}
