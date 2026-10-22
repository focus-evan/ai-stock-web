import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import StrategyAuditNotice from "../src/components/strategy-audit-notice";

afterEach(cleanup);
it("shows paused entries without claiming exits are disabled", () => {
	render(<StrategyAuditNotice pathname="/short-term-strategy/overnight" />);
	expect(screen.getByText(/暂停新开仓，继续观察和管理已有持仓退出/)).toBeTruthy();
});
it("labels prior-session environment and unverified prices", () => {
	render(<StrategyAuditNotice pathname="/short-term-strategy/breakthrough" />);
	expect(screen.getByText(/上一交易日沪深300/)).toBeTruthy();
	expect(screen.getByText(/推荐价是观察参考/)).toBeTruthy();
});
it("does not apply unrelated policy to other products", () => {
	const { container } = render(<StrategyAuditNotice pathname="/short-term-strategy/stock-analysis" />);
	expect(container.textContent).toBe("");
});
