import { describe, expect, it } from "vitest";
import { strategyExecutionStatus } from "../src/pages/home/strategy-status";

describe("portfolio execution status", () => {
	it("does not present enabled but empty accounts as trading", () => {
		expect(strategyExecutionStatus({ auto_trade: 1, positions_count: 0, decision_status: "no_action" }).text).toBe("空仓观察");
	});
	it("distinguishes missing data, pending triggers, holdings and pause", () => {
		expect(strategyExecutionStatus({ auto_trade: 1, decision_reason: "数据待恢复：全市场行情缺失" }).text).toBe("数据待恢复");
		expect(strategyExecutionStatus({ auto_trade: 1, decision_status: "pending" }).text).toBe("等待触发");
		expect(strategyExecutionStatus({ auto_trade: 1, positions_count: 1 }).text).toBe("持仓管理中");
		expect(strategyExecutionStatus({ auto_trade: 0, positions_count: 1 }).text).toBe("已暂停");
	});
});
