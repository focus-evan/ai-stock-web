import type { MoatValueStock } from "#src/api/strategy/types";

import {
	fetchMoatValueRecommendations,
	refreshMoatValueRecommendations,
} from "#src/api/strategy";
import { BasicContent } from "#src/components/basic-content";
import {
	BankOutlined,
	CrownOutlined,
	FundOutlined,
	ReloadOutlined,
	RiseOutlined,
	SafetyCertificateOutlined,
	StarFilled,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	message,
	Progress,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";

const { Text, Paragraph } = Typography;

// ===================== 辅助函数 =====================

function valStatusColor(status: string): string {
	if (status.includes("严重低估"))
		return "#52c41a";
	if (status.includes("低估"))
		return "#73d13d";
	if (status.includes("合理"))
		return "#1890ff";
	if (status.includes("偏高"))
		return "#faad14";
	if (status.includes("高估"))
		return "#f5222d";
	return "#8c8c8c";
}

function levelColor(level: string): string {
	if (level === "强烈推荐")
		return "#f5222d";
	if (level === "推荐")
		return "#fa8c16";
	if (level === "关注")
		return "#1890ff";
	return "#8c8c8c";
}

function formatCap(v: number): string {
	const b = v / 1e8;
	if (b >= 10000)
		return `${(b / 10000).toFixed(1)}万亿`;
	return `${b.toFixed(0)}亿`;
}

function cyclePhaseColor(phase: string): string {
	if (phase.includes("底部"))
		return "#52c41a";
	if (phase.includes("偏低"))
		return "#73d13d";
	if (phase.includes("合理"))
		return "#1890ff";
	if (phase.includes("偏高"))
		return "#faad14";
	if (phase.includes("高估"))
		return "#f5222d";
	return "#8c8c8c";
}

function dcaSignalColor(signal: string): string {
	if (signal.includes("大幅加仓"))
		return "green";
	if (signal.includes("适度加仓"))
		return "lime";
	if (signal.includes("正常"))
		return "blue";
	if (signal.includes("减少"))
		return "orange";
	if (signal.includes("暂停"))
		return "red";
	return "default";
}

function percentileBar(val: number, label: string) {
	const color = val < 30 ? "#52c41a" : val < 60 ? "#1890ff" : val < 80 ? "#faad14" : "#f5222d";
	return (
		<Tooltip title={`${label}：历史${val.toFixed(0)}%分位`}>
			<Progress
				format={() => `${val.toFixed(0)}%`}
				percent={val}
				size="small"
				strokeColor={color}
			/>
		</Tooltip>
	);
}

export default function MoatValuePage() {
	const { data, loading, refresh } = useRequest(
		async () => {
			const res = await fetchMoatValueRecommendations(13);
			return (res as any)?.data || (res as any)?.result?.data || res;
		},
		{ pollingInterval: 120000 },
	);

	const { run: doRefresh, loading: refreshing } = useRequest(
		async () => {
			const res = await refreshMoatValueRecommendations(13);
			message.success("刷新完成");
			return res;
		},
		{
			manual: true,
			onSuccess: () => refresh(),
			onError: (e: any) => message.error(`刷新失败: ${e?.message}`),
		},
	);

	const recommendations: MoatValueStock[] = data?.recommendations || [];
	const cycleInfo = data?.cycle_info || {};
	const report = data?.strategy_report || "";
	const signalSummary = data?.signal_summary || {};

	const columns = [
		{
			title: "排名",
			dataIndex: "rank",
			key: "rank",
			width: 60,
			render: (v: number) => (
				<Badge color={v <= 3 ? "#f5222d" : v <= 6 ? "#fa8c16" : "#1890ff"} count={v} />
			),
		},
		{
			title: "股票",
			key: "stock",
			width: 140,
			render: (_: any, r: MoatValueStock) => (
				<Space direction="vertical" size={0}>
					<Text strong>{r.name}</Text>
					<Text style={{ fontSize: 12 }} type="secondary">{r.code}</Text>
				</Space>
			),
		},
		{
			title: "现价",
			dataIndex: "price",
			key: "price",
			width: 80,
			render: (v: number, r: MoatValueStock) => (
				<Space direction="vertical" size={0}>
					<Text strong>
						¥
						{v?.toFixed(2)}
					</Text>
					<Text style={{ color: r.change_pct > 0 ? "#f5222d" : r.change_pct < 0 ? "#52c41a" : "#8c8c8c", fontSize: 12 }}>
						{r.change_pct > 0 ? "+" : ""}
						{r.change_pct?.toFixed(2)}
						%
					</Text>
				</Space>
			),
		},
		{
			title: "PE/PB",
			key: "pe_pb",
			width: 120,
			render: (_: any, r: MoatValueStock) => (
				<Space direction="vertical" size={0}>
					<Text>
						PE:
						{r.pe_ttm?.toFixed(1)}
					</Text>
					<Text>
						PB:
						{r.pb?.toFixed(2)}
					</Text>
					{r.pe_pb_product < 22.5 && (
						<Tag color="green" style={{ fontSize: 10 }}>
							<SafetyCertificateOutlined />
							{" "}
							格雷厄姆✓
						</Tag>
					)}
				</Space>
			),
		},
		{
			title: "PE历史分位",
			key: "pe_pct",
			width: 130,
			render: (_: any, r: MoatValueStock) => percentileBar(r.pe_percentile, "PE"),
		},
		{
			title: "PB历史分位",
			key: "pb_pct",
			width: 130,
			render: (_: any, r: MoatValueStock) => percentileBar(r.pb_percentile, "PB"),
		},
		{
			title: "股息率",
			dataIndex: "dv_ttm",
			key: "dv",
			width: 80,
			render: (v: number) => (
				<Text style={{ color: v > 3 ? "#52c41a" : v > 1.5 ? "#1890ff" : "#8c8c8c" }} strong={v > 3}>
					{v > 3 ? "💰 " : ""}
					{v?.toFixed(1)}
					%
				</Text>
			),
		},
		{
			title: "市值",
			dataIndex: "total_market_cap",
			key: "cap",
			width: 80,
			render: (v: number) => <Text>{formatCap(v)}</Text>,
		},
		{
			title: "估值",
			dataIndex: "valuation_status",
			key: "val",
			width: 80,
			render: (v: string) => (
				<Tag color={valStatusColor(v)} style={{ fontWeight: 600 }}>{v}</Tag>
			),
		},
		{
			title: "评分",
			dataIndex: "moat_score",
			key: "score",
			width: 80,
			sorter: (a: MoatValueStock, b: MoatValueStock) => a.moat_score - b.moat_score,
			render: (v: number, r: MoatValueStock) => (
				<Tooltip
					title={(
						<div>
							<div>
								🏰 护城河:
								{r.score_detail?.moat}
								/35
							</div>
							<div>
								💰 估值:
								{r.score_detail?.valuation}
								/25
							</div>
							<div>
								💵 现金流:
								{r.score_detail?.cashflow}
								/20
							</div>
							<div>
								🔄 周期:
								{r.score_detail?.cycle}
								/10
							</div>
							<div>
								📊 定投:
								{r.score_detail?.dca}
								/10
							</div>
						</div>
					)}
				>
					<div style={{ textAlign: "center" }}>
						<Text strong style={{ fontSize: 18, color: v >= 75 ? "#f5222d" : v >= 60 ? "#fa8c16" : "#1890ff" }}>
							{v}
						</Text>
						<br />
						<Tag color={levelColor(r.recommendation_level)} style={{ fontSize: 10 }}>
							{r.recommendation_level}
						</Tag>
					</div>
				</Tooltip>
			),
		},
		{
			title: "推荐理由",
			key: "reasons",
			width: 280,
			render: (_: any, r: MoatValueStock) => (
				<Space direction="vertical" size={2}>
					{r.reasons?.slice(0, 3).map((reason, i) => (
						<Text key={i} style={{ fontSize: 12 }} type="secondary">
							•
							{" "}
							{reason}
						</Text>
					))}
					{r.operation_suggestion && (
						<Text style={{ fontSize: 12, color: "#722ed1" }}>
							📋
							{" "}
							{r.operation_suggestion}
						</Text>
					)}
				</Space>
			),
		},
	];

	return (
		<BasicContent>
			{/* 顶部：市场周期 + 定投信号 */}
			<Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
				<Col span={6}>
					<Card size="small" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
						<Statistic
							prefix={<FundOutlined />}
							title={(
								<span style={{ color: "rgba(255,255,255,0.8)" }}>
									{cycleInfo.index_name || "沪深300"}
									{" "}
									PE
								</span>
							)}
							value={cycleInfo.index_pe || "-"}
							valueStyle={{ color: "#fff", fontSize: 28 }}
						/>
						<div style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
							历史
							{" "}
							{cycleInfo.pe_percentile?.toFixed(0) || "?"}
							% 分位
						</div>
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small" style={{ background: `linear-gradient(135deg, ${cyclePhaseColor(cycleInfo.cycle_phase || "")} 0%, #36cfc9 100%)` }}>
						<Statistic
							prefix={<RiseOutlined />}
							title={<span style={{ color: "rgba(255,255,255,0.8)" }}>周期阶段</span>}
							value={cycleInfo.cycle_phase || "未知"}
							valueStyle={{ color: "#fff", fontSize: 24 }}
						/>
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small">
						<Statistic
							prefix={<BankOutlined />}
							title="定投信号"
							value={cycleInfo.dca_signal || "正常定投"}
							valueStyle={{ fontSize: 20 }}
						/>
						<Tag color={dcaSignalColor(cycleInfo.dca_signal || "")} style={{ marginTop: 4 }}>
							倍率:
							{" "}
							{cycleInfo.dca_multiplier?.toFixed(1) || "1.0"}
							x
						</Tag>
					</Card>
				</Col>
				<Col span={6}>
					<Card size="small">
						<Row align="middle" justify="space-between">
							<Statistic
								prefix={<StarFilled style={{ color: "#faad14" }} />}
								title="推荐股票"
								value={recommendations.length || 0}
							/>
							<Button
								icon={<ReloadOutlined />}
								loading={refreshing}
								onClick={doRefresh}
								type="primary"
							>
								刷新
							</Button>
						</Row>
						{/* 估值分布标签 */}
						<Space style={{ marginTop: 8 }} wrap>
							{Object.entries(signalSummary).map(([k, v]) => (
								<Tag color={valStatusColor(k)} key={k}>
									{k}
									:
									{" "}
									{v as number}
								</Tag>
							))}
						</Space>
					</Card>
				</Col>
			</Row>

			{/* 策略报告 */}
			{report && (
				<Alert
					description={<Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>{report}</Paragraph>}
					icon={<CrownOutlined />}
					message="护城河价值分析报告"
					showIcon
					style={{ marginBottom: 16 }}
					type="info"
				/>
			)}

			{/* 推荐表格 */}
			<Card bodyStyle={{ padding: 0 }} title="🏰 护城河优选">
				<Table
					columns={columns}
					dataSource={recommendations}
					loading={loading}
					pagination={false}
					rowKey="code"
					scroll={{ x: 1400 }}
					size="small"
				/>
			</Card>
		</BasicContent>
	);
}
