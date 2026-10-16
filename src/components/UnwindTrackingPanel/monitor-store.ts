import type { UnwindPlan } from "#src/api/strategy";
import { create } from "zustand";

export const UNWIND_ALERT_Z_INDEX = 1_000_000_000;

export interface UnwindMonitorView {
	userId: string
	plans: UnwindPlan[]
	enabled: boolean
	checking: boolean
	checkedAt: Date | null
	nextAt: Date | null
	note: string
	error: string
	alertCount: number
	check: () => Promise<void>
	setEnabled: (enabled: boolean) => void
	showHistory: () => void
}

// The app-level host owns the single timer. Page panels only observe this state.
export const useUnwindMonitorStore = create<{ view: UnwindMonitorView | null }>(() => ({ view: null }));
