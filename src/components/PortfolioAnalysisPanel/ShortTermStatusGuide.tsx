import type { PortfolioShortTermAnalysis } from "#src/api/strategy";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Button, Modal, Tag, Typography } from "antd";
import { useState } from "react";
import { getShortTermStatus, SHORT_TERM_STATUS_GROUPS } from "./shortTermStatuses";

export function ShortTermStatusGuide({ analysis }: { analysis: PortfolioShortTermAnalysis }) {
	const [open, setOpen] = useState(false);
	const current = getShortTermStatus(analysis);
	const count = SHORT_TERM_STATUS_GROUPS.reduce((total, group) => total + group.states.length, 0);
	return (
		<>
			<Tag style={{ margin: 0, padding: "2px 10px", lineHeight: "20px", fontSize: 12, fontWeight: 700, border: "none", color: current?.color, background: current?.background }}>
				{current ? `${current.value} · ${current.stage}` : "状态待确认"}
			</Tag>
			<Button
				type="text"
				size="small"
				icon={<QuestionCircleOutlined />}
				onClick={() => setOpen(true)}
				aria-label="查看全部短线状态说明"
				style={{ color: "#fff", paddingInline: 4, fontSize: 12 }}
			>
				状态说明
			</Button>
			<Modal title="短线状态说明" open={open} onCancel={() => setOpen(false)} footer={null} width={560}>
				<Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
					共
					{" "}
					{count}
					{" "}
					种状态：5 种行情判断、2 种数据状态。这是当前状态，不是分数，也不一定逐级变化。
				</Typography.Paragraph>
				<div style={{ padding: "10px 12px", borderRadius: 8, background: current?.background || "#f5f5f5", color: "#333", marginBottom: 12 }}>
					<Typography.Text strong style={{ color: "#333" }}>
						当前：
						{current?.value || "状态待确认"}
					</Typography.Text>
					<div style={{ marginTop: 4 }}>{current?.meaning || "该状态暂未收录，请更新分析后确认。"}</div>
				</div>
				<div style={{ maxHeight: "55vh", overflowY: "auto" }}>
					{SHORT_TERM_STATUS_GROUPS.map(group => (
						<section key={group.title} aria-label={group.title} style={{ marginBottom: 12 }}>
							<Typography.Text type="secondary" style={{ fontSize: 12 }}>{group.title}</Typography.Text>
							{group.states.map(state => (
								<div
									key={state.value}
									aria-current={current?.value === state.value ? "true" : undefined}
									style={{ padding: "8px 10px", borderRadius: 6, marginTop: 4, background: current?.value === state.value ? state.background : undefined, border: current?.value === state.value ? `1px solid ${state.color}` : "1px solid var(--app-border)" }}
								>
									<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
										<Typography.Text strong style={{ color: current?.value === state.value ? state.color : "var(--app-text)" }}>{state.value}</Typography.Text>
										<Typography.Text type="secondary" style={{ fontSize: 12, color: current?.value === state.value ? "#595959" : "var(--app-muted)" }}>{state.stage}</Typography.Text>
										{current?.value === state.value && <Tag color="blue" style={{ margin: 0 }}>当前</Tag>}
									</div>
									<div style={{ marginTop: 3, fontSize: 13, color: current?.value === state.value ? "#595959" : "var(--app-muted)" }}>{state.meaning}</div>
								</div>
							))}
						</section>
					))}
				</div>
			</Modal>
		</>
	);
}
