import type { StrategyAnalysis, WatchlistGuidanceRecord, WatchlistItem } from "#src/api/strategy";
import {
	fetchWatchlist,
	fetchWatchlistGuidance,
	removeFromWatchlist,
	triggerWatchlistGuidance,
} from "#src/api/strategy";
import {
	ClockCircleOutlined,
	DeleteOutlined,
	EyeOutlined,
	LoadingOutlined,
	StarFilled,
	ThunderboltOutlined,
} from "@ant-design/icons";
import {
	Badge,
	Button,
	Card,
	Col,
	Collapse,
	Empty,
	message,
	Modal,
	Popconfirm,
	Row,
	Space,
	Spin,
	Tag,
	Typography,
} from "antd";
import React, { useCallback, useEffect, useState } from "react";

const { Text, Paragraph } = Typography;

/** 风险等级配色 */
const RISK_COLORS: Record<string, string> = {
	低: "green",
	中: "orange",
	高: "red",
};

/** 决策配色 */
const DECISION_COLORS: Record<string, string> = {
	止损: "#cf1322",
	止盈减仓: "#d46b08",
	减仓观望: "#d46b08",
	加仓: "#389e0d",
	持有观察: "#096dd9",
};

function fmtPnl(v: number): string {
	if (v >= 0)
		return `+${v.toFixed(2)}`;
	return v.toFixed(2);
}

/** 战法分析卡片 */
const StrategyAnalysisCard: React.FC<{ sa: StrategyAnalysis }> = ({ sa }) => (
	<div
		style={{
			background: "#fafafa",
			borderRadius: 8,
			padding: "10px 14px",
			marginBottom: 8,
			borderLeft: `3px solid ${RISK_COLORS[sa.risk_level] || "#d9d9d9"}`,
		}}
	>
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
			<Space size={4}>
				<span>{sa.icon || "📊"}</span>
				<Text strong style={{ fontSize: 13 }}>{sa.strategy_name}</Text>
			</Space>
			<Space size={4}>
				<Tag color={RISK_COLORS[sa.risk_level]} style={{ margin: 0, fontSize: 10 }}>
					风险:
					{sa.risk_level}
				</Tag>
			</Space>
		</div>
		<Paragraph
			style={{ fontSize: 12, color: "#595959", marginBottom: 4, lineHeight: "18px" }}
			ellipsis={{ rows: 3, expandable: true, symbol: "展开" }}
		>
			{sa.analysis}
		</Paragraph>
		<div style={{
			background: "linear-gradient(90deg, #eef2ff 0%, #e0e7ff 100%)",
			borderRadius: 4,
			padding: "4px 8px",
			fontSize: 12,
			color: "#4338ca",
			fontWeight: 500,
		}}
		>
			👉
			{" "}
			{sa.action}
		</div>
		{sa.key_metrics && Object.keys(sa.key_metrics).length > 0 && (
			<div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
				{Object.entries(sa.key_metrics).map(([k, v]) => (
					<Tag key={k} style={{ margin: 0, fontSize: 10, borderRadius: 3 }}>
						{k}
						:
						{String(v)}
					</Tag>
				))}
			</div>
		)}
	</div>
);

/** 指导记录详情 */
const GuidanceDetail: React.FC<{ record: WatchlistGuidanceRecord }> = ({ record }) => (
	<div style={{ padding: "8px 0" }}>
		{/* 行情快照 */}
		<div style={{
			display: "flex",
			gap: 16,
			marginBottom: 12,
			padding: "8px 12px",
			background: "#fafafa",
			borderRadius: 6,
			flexWrap: "wrap",
		}}
		>
			<Space size={4}>
				<Text type="secondary" style={{ fontSize: 12 }}>现价</Text>
				<Text strong>{record.current_price?.toFixed(2)}</Text>
			</Space>
			<Space size={4}>
				<Text type="secondary" style={{ fontSize: 12 }}>涨跌</Text>
				<Text style={{ color: record.change_pct >= 0 ? "#cf1322" : "#389e0d", fontWeight: 600 }}>
					{record.change_pct >= 0 ? "+" : ""}
					{record.change_pct?.toFixed(2)}
					%
				</Text>
			</Space>
			<Space size={4}>
				<Text type="secondary" style={{ fontSize: 12 }}>盈亏</Text>
				<Text style={{ color: record.pnl_pct >= 0 ? "#cf1322" : "#389e0d", fontWeight: 600 }}>
					{fmtPnl(record.pnl_amount)}
					元(
					{fmtPnl(record.pnl_pct)}
					%)
				</Text>
			</Space>
		</div>

		{/* 各战法分析 */}
		{record.strategy_analyses?.map((sa, i) => (
			<StrategyAnalysisCard key={`${sa.strategy}-${i}`} sa={sa} />
		))}

		{/* 综合决策 */}
		<div style={{
			background: "linear-gradient(135deg, #722ed1 0%, #9254de 100%)",
			borderRadius: 8,
			padding: "10px 14px",
			color: "#fff",
			marginTop: 4,
		}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<Text style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
					🎯 综合决策:
					{" "}
					{record.overall_decision}
				</Text>
				<Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
					<ClockCircleOutlined />
					{" "}
					{record.guidance_time}
				</Text>
			</div>
			<div style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, marginTop: 4 }}>
				{record.overall_summary}
			</div>
		</div>
	</div>
);

interface Props {
	_unused?: never
}

const WatchlistPanel: React.FC<Props> = () => {
	const [items, setItems] = useState<WatchlistItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [guidanceLoading, setGuidanceLoading] = useState<number | null>(null);
	const [guidanceModal, setGuidanceModal] = useState<{
		item: WatchlistItem
		records: WatchlistGuidanceRecord[]
	} | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const resp = await fetchWatchlist();
			if (resp.status === "success") {
				setItems(resp.data.items || []);
			}
		}
		catch (e) {
			console.error("Failed to load watchlist", e);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleRemove = async (id: number) => {
		try {
			const resp = await removeFromWatchlist(id);
			if (resp.status === "success") {
				message.success("已移除自选");
				loadData();
			}
		}
		catch {
			message.error("移除失败");
		}
	};

	const handleTriggerGuidance = async (item: WatchlistItem) => {
		setGuidanceLoading(item.id);
		try {
			const resp = await triggerWatchlistGuidance(item.id);
			if (resp.status === "success") {
				message.success("操作指导已生成");
				loadData();
			}
		}
		catch {
			message.error("指导生成失败");
		}
		finally {
			setGuidanceLoading(null);
		}
	};

	const handleViewHistory = async (item: WatchlistItem) => {
		try {
			const resp = await fetchWatchlistGuidance(item.id, 30);
			if (resp.status === "success") {
				setGuidanceModal({ item, records: resp.data.records || [] });
			}
		}
		catch {
			message.error("获取指导历史失败");
		}
	};

	if (loading) {
		return (
			<Card bordered={false} style={{ borderRadius: 12, marginTop: 20 }}>
				<div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
					<Spin tip="加载自选列表..." />
				</div>
			</Card>
		);
	}

	if (!items.length) {
		return (
			<Card
				bordered={false}
				style={{ borderRadius: 12, marginTop: 20 }}
				title={(
					<Space size={8}>
						<StarFilled style={{ color: "#faad14", fontSize: 18 }} />
						<Text strong style={{ fontSize: 15 }}>我的自选盯盘</Text>
					</Space>
				)}
			>
				<Empty description="暂无自选，请在推荐列表中点击 ⭐ 加入自选" image={Empty.PRESENTED_IMAGE_SIMPLE} />
			</Card>
		);
	}

	return (
		<>
			<Card
				bordered={false}
				style={{ borderRadius: 12, marginTop: 20, overflow: "hidden" }}
				styles={{ header: { borderBottom: "none", padding: "16px 24px 0" }, body: { padding: "12px 24px 24px" } }}
				title={(
					<Space size={8}>
						<StarFilled style={{ color: "#faad14", fontSize: 18 }} />
						<Text strong style={{ fontSize: 15 }}>我的自选盯盘</Text>
						<Badge count={items.length} style={{ backgroundColor: "#faad14" }} />
					</Space>
				)}
				extra={
					<Button size="small" onClick={loadData}>刷新</Button>
				}
			>
				<Row gutter={[12, 12]}>
					{items.map((item) => {
						const pnlColor = (item.pnl_pct ?? 0) >= 0 ? "#cf1322" : "#389e0d";
						const lg = item.latest_guidance;

						return (
							<Col key={item.id} xs={24} sm={12} lg={8}>
								<div style={{
									borderRadius: 10,
									border: "1px solid #e8e8e8",
									background: "#fff",
									overflow: "hidden",
									height: "100%",
									display: "flex",
									flexDirection: "column",
								}}
								>
									{/* 头部 */}
									<div style={{
										background: "linear-gradient(135deg, #fffbe6 0%, #fff7e6 100%)",
										padding: "10px 14px 8px",
										borderBottom: "1px solid #ffe58f",
									}}
									>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
											<div>
												<Text strong style={{ fontSize: 15 }}>{item.stock_name}</Text>
												<Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>{item.stock_code}</Text>
											</div>
											<Popconfirm title="确认移除自选？" onConfirm={() => handleRemove(item.id)} okText="确认" cancelText="取消">
												<Button type="text" size="small" danger icon={<DeleteOutlined />} />
											</Popconfirm>
										</div>
										{/* 战法标签 */}
										<div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
											{(item.strategy_names || []).map(sn => (
												<Tag key={sn} color="purple" style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 5px", borderRadius: 3 }}>
													{sn}
												</Tag>
											))}
										</div>
									</div>

									{/* 持仓信息 */}
									<div style={{ padding: "8px 14px", display: "flex", gap: 12, flexWrap: "wrap" }}>
										<div>
											<Text type="secondary" style={{ fontSize: 11 }}>成本</Text>
											<div>
												<Text style={{ fontSize: 13, fontWeight: 600 }}>
													¥
													{Number(item.buy_price).toFixed(2)}
												</Text>
											</div>
										</div>
										<div>
											<Text type="secondary" style={{ fontSize: 11 }}>股数</Text>
											<div>
												<Text style={{ fontSize: 13, fontWeight: 600 }}>
													{item.buy_shares}
													股
												</Text>
											</div>
										</div>
										{item.current_price != null && (
											<div>
												<Text type="secondary" style={{ fontSize: 11 }}>现价</Text>
												<div>
													<Text style={{ fontSize: 13, fontWeight: 600 }}>
														¥
														{item.current_price.toFixed(2)}
													</Text>
												</div>
											</div>
										)}
										{item.pnl_pct != null && (
											<div>
												<Text type="secondary" style={{ fontSize: 11 }}>盈亏</Text>
												<div>
													<Text style={{ fontSize: 13, fontWeight: 600, color: pnlColor }}>
														{fmtPnl(item.pnl_amount || 0)}
														元 (
														{fmtPnl(item.pnl_pct)}
														%)
													</Text>
												</div>
											</div>
										)}
									</div>

									{/* 最新指导预览 */}
									{lg && (
										<div style={{
											margin: "0 10px 8px",
											padding: "8px 10px",
											background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
											borderRadius: 6,
											fontSize: 12,
										}}
										>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
												<Tag
													color={DECISION_COLORS[lg.overall_decision] ? undefined : "purple"}
													style={{
														margin: 0,
														fontWeight: 600,
														fontSize: 11,
														color: DECISION_COLORS[lg.overall_decision] || "#722ed1",
														borderColor: DECISION_COLORS[lg.overall_decision] || "#722ed1",
														background: "rgba(255,255,255,0.8)",
													}}
												>
													🎯
													{" "}
													{lg.overall_decision}
												</Tag>
												<Text type="secondary" style={{ fontSize: 10 }}>
													{lg.trading_session}
												</Text>
											</div>
											<Text style={{ fontSize: 11, color: "#595959" }}>{lg.overall_summary}</Text>
										</div>
									)}

									{/* 操作按钮 */}
									<div style={{ padding: "0 10px 10px", display: "flex", gap: 6, marginTop: "auto" }}>
										<Button
											size="small"
											block
											icon={guidanceLoading === item.id ? <LoadingOutlined /> : <ThunderboltOutlined />}
											loading={guidanceLoading === item.id}
											style={{
												background: "linear-gradient(90deg, #722ed1 0%, #9254de 100%)",
												borderColor: "transparent",
												color: "#fff",
												borderRadius: 6,
												fontSize: 12,
											}}
											onClick={() => handleTriggerGuidance(item)}
										>
											生成指导
										</Button>
										<Button
											size="small"
											block
											icon={<EyeOutlined />}
											style={{ borderRadius: 6, fontSize: 12 }}
											onClick={() => handleViewHistory(item)}
										>
											历史指导
										</Button>
									</div>
								</div>
							</Col>
						);
					})}
				</Row>
			</Card>

			{/* 指导历史 Modal */}
			<Modal
				open={!!guidanceModal}
				onCancel={() => setGuidanceModal(null)}
				footer={null}
				title={
					guidanceModal
						? (
							<span>
								📋
								{" "}
								{guidanceModal.item.stock_name}
								{" "}
								操作指导历史
							</span>
						)
						: ""
				}
				width={680}
				destroyOnClose
			>
				{guidanceModal && (
					guidanceModal.records.length === 0
						? <Empty description="暂无操作指导记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
						: (
							<Collapse
								accordion
								defaultActiveKey={guidanceModal.records[0]?.id?.toString()}
								items={guidanceModal.records.map(r => ({
									key: r.id.toString(),
									label: (
										<Space>
											<Tag
												color={DECISION_COLORS[r.overall_decision] ? undefined : "purple"}
												style={{
													margin: 0,
													color: DECISION_COLORS[r.overall_decision] || "#722ed1",
													borderColor: DECISION_COLORS[r.overall_decision] || "#722ed1",
													fontWeight: 600,
												}}
											>
												{r.overall_decision}
											</Tag>
											<Text style={{ fontSize: 13 }}>{r.guidance_time}</Text>
											<Tag style={{ margin: 0 }}>{r.trading_session}</Tag>
											<Text style={{
												color: r.pnl_pct >= 0 ? "#cf1322" : "#389e0d",
												fontSize: 12,
												fontWeight: 600,
											}}
											>
												{fmtPnl(r.pnl_pct)}
												%
											</Text>
										</Space>
									),
									children: <GuidanceDetail record={r} />,
								}))}
							/>
						)
				)}
			</Modal>
		</>
	);
};

export default WatchlistPanel;
