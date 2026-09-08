import type { PortfolioStockAnalysis } from "#src/api/strategy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShortTermSection } from "./index";

afterEach(cleanup);
const stock: PortfolioStockAnalysis = {
	stock_name: "测试",
	buy_price: 650,
	buy_shares: 100,
	pnl_pct: -13,
	pnl_amount: -8800,
	sector: "",
	main_business: "",
	financial_analysis: { revenue_trend: "", profit_trend: "", cash_flow_quality: "" },
	growth_type: "",
	growth_evidence: "",
	moat: "",
	moat_detail: "",
	price_analysis: "",
	operation_guidance: "",
	risk_factors: [],
	highlight: "",
	prices_7d: [],
	stock_code: "03750",
	market: "hk",
	currency: "HKD",
	current_price: 888,
	short_term: {
		version: "short-term-v1",
		timeframe: "日线",
		as_of: "2026-09-08",
		source: "tencent_hk_kline",
		adjustment: "qfq",
		bar_count: 120,
		status: "ready",
		stale: false,
		close: 562,
		moving_averages: [{ period: 16, value: 580, position: "跌破", slope: "下行" }, { period: 60, value: null, position: "数据不足", slope: "未知" }],
		volume_ratio_5: 1.4,
		volume_label: "放量",
		bias16_pct: -3.1,
		atr14: 12,
		support_5: 550,
		resistance_20: 600,
		atr_reference: 544,
		signals: [{ name: "3 穿 16 趋势", state: "等待确认", evidence: "MA3 低于 MA16", trigger: "收盘确认", invalidation: "连续两日跌破 MA16" }],
		warnings: ["大盘待核验"],
		sources: [],
		verdict: "优先控险",
		guidance: "先控制风险",
		rule_note: "规则参数不代表固定胜率",
	},
};

describe("short-term portfolio card", () => {
	it("renders computed daily indicators independently of the current quote", () => {
		render(<ShortTermSection stock={stock} />);
		expect(screen.getByText(/分析收盘价 HK\$562.000/)).toBeInTheDocument();
		expect(screen.getByText(/MA\s*16\s*·\s*HK\$580.000/)).toBeInTheDocument();
		expect(screen.getByText(/1.40 倍/)).toBeInTheDocument();
		expect(screen.getByText(/连续两日跌破 MA16/)).toBeInTheDocument();
		expect(screen.queryByText(/888/)).not.toBeInTheDocument();
		expect(screen.queryByText("财务分析")).not.toBeInTheDocument();
	});
	it("marks stale evidence and retains the analysis date", () => {
		render(<ShortTermSection stock={{ ...stock, short_term: { ...stock.short_term!, status: "stale", stale: true } }} />);
		expect(screen.getByText(/不能确认当前交易信号/)).toBeInTheDocument();
		expect(screen.getByText(/2026-09-08/)).toBeInTheDocument();
	});
	it("asks for regeneration of legacy reports instead of presenting old guidance as technical", () => {
		render(<ShortTermSection stock={{ ...stock, short_term: undefined }} />);
		expect(screen.getByText(/旧版基本面报告/)).toBeInTheDocument();
		expect(screen.queryByText("短线价量解析")).not.toBeInTheDocument();
	});
});
