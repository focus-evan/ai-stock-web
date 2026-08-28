import type {
	StrategyPerformanceDashboard as DashboardData,
	StrategyPerformanceDashboardItem,
	StrategyPerformanceWeekly,
} from "#src/api/strategy";
import type { ColumnsType } from "antd/es/table";
import { fetchStrategyPerformanceDashboard } from "#src/api/strategy";
import {
	ArrowDownOutlined,
	ArrowUpOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	ExperimentOutlined,
	ReloadOutlined,
	RocketOutlined,
	SafetyCertificateOutlined,
	TrophyFilled,
	WarningOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Card,
	Col,
	Empty,
	message,
	Row,
	Segmented,
	Space,
	Spin,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import ReactECharts from "echarts-for-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title, Text, Paragraph } = Typography;

const DECISION_LABELS: Record<string, { label: string, color: string }> = {
	applied: { label: "已应用新参数", color: "green" },
	rollback: { label: "已自动回滚", color: "red" },
	observed: { label: "持续观察", color: "blue" },
	rejected: { label: "候选参数未通过", color: "orange" },
	insufficient_data: { label: "样本积累中", color: "gold" },
	frozen: { label: "进化已冻结", color: "default" },
	not_analyzed: { label: "尚未分析", color: "default" },
};

const CONTINUITY_LABELS: Record<string, { label: string, color: string }> = {
	continuous: { label: "持续运行", color: "green" },
	interrupted: { label: "周度有中断", color: "red" },
	insufficient_history: { label: "观察期不足", color: "gold" },
	not_started: { label: "尚未启动", color: "default" },
};

const TREND_LABELS: Record<string, { label: string, color: string }> = {
	improving: { label: "近期改善", color: "green" },
	stable: { label: "基本稳定", color: "blue" },
	weakening: { label: "近期走弱", color: "red" },
	insufficient: { label: "样本不足", color: "default" },
};

const WEEKLY_STATUS_VALUE: Record<string, number> = {
	no_data: 0,
	pending_analysis: 1,
	analyzed: 2,
	evolved: 3,
	rollback: 4,
};

function formatPct(value?: number | null) {
	if (value == null)
		return "--";
	return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatRate(value?: number | null) {
	if (value == null)
		return "--";
	return `${value.toFixed(2)}%`;
}

function returnColor(value?: number | null) {
	if (value == null)
		return undefined;
	return value >= 0 ? "#cf1322" : "#389e0d";
}

function currentWeek(item: StrategyPerformanceDashboardItem): StrategyPerformanceWeekly | undefined {
	return item.weekly.at(-1);
}

export default function StrategyPerformanceDashboard() {
	const [weeks, setWeeks] = useState(12);
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetchStrategyPerformanceDashboard(weeks);
			if (response.status !== "success" || !response.data)
				throw new Error(response.message || "战法表现数据加载失败");
			setData(response.data);
		}
		catch (cause) {
			const detail = cause instanceof Error ? cause.message : "战法表现数据加载失败";
			setError(detail);
			message.error(detail);
		}
		finally {
			setLoading(false);
		}
	}, [weeks]);

	useEffect(() => {
		void loadData();
	}, [loadData]);

	const best = useMemo(
		() => data?.strategies.find(item => item.strategy_type === data.best_strategy_type),
		[data],
	);
	const excellent = useMemo(
		() => data?.strategies.filter(item => data.excellent_strategy_types.includes(item.strategy_type)) || [],
		[data],
	);

	const rankingOption = useMemo(() => {
		const items = (data?.strategies || []).filter(item => item.ranking_eligible);
		return {
			animationDuration: 500,
			tooltip: {
				trigger: "axis",
				axisPointer: { type: "shadow" },
				formatter: (params: any[]) => {
					const index = params?.[0]?.dataIndex ?? 0;
					const item = items[index];
					return [
						`<b>${item?.strategy_name || ""}</b>`,
						`胜率：${formatRate(item?.trade.win_rate_pct)}`,
						`平均收益：${formatPct(item?.trade.avg_return_pct)}`,
						`成熟交易样本：${item?.trade.sample_count || 0}`,
					].join("<br/>");
				},
			},
			legend: { data: ["胜率", "平均收益"], top: 0 },
			grid: { left: 48, right: 52, top: 44, bottom: 80 },
			xAxis: {
				type: "category",
				data: items.map(item => item.strategy_name),
				axisLabel: { interval: 0, rotate: 28, fontSize: 11 },
			},
			yAxis: [
				{
					type: "value",
					name: "胜率",
					min: 0,
					max: 100,
					axisLabel: { formatter: "{value}%" },
				},
				{
					type: "value",
					name: "收益",
					axisLabel: { formatter: "{value}%" },
					splitLine: { show: false },
				},
			],
			series: [
				{
					name: "胜率",
					type: "bar",
					barMaxWidth: 32,
					data: items.map(item => ({
						value: item.trade.win_rate_pct ?? 0,
						itemStyle: {
							color: item.strategy_type === data?.best_strategy_type ? "#faad14" : "#ff7875",
							borderRadius: [4, 4, 0, 0],
						},
					})),
				},
				{
					name: "平均收益",
					type: "line",
					yAxisIndex: 1,
					smooth: true,
					symbolSize: 7,
					lineStyle: { width: 3, color: "#1677ff" },
					itemStyle: { color: "#1677ff" },
					data: items.map(item => item.trade.avg_return_pct ?? 0),
					markLine: {
						silent: true,
						symbol: "none",
						lineStyle: { color: "#8c8c8c", type: "dashed" },
						data: [{ yAxis: 0 }],
					},
				},
			],
		};
	}, [data]);

	const weeklyTrendOption = useMemo(() => {
		const items = excellent.slice(0, 4);
		return {
			tooltip: {
				trigger: "axis",
				valueFormatter: (value: number) => formatPct(value),
			},
			legend: { data: items.map(item => item.strategy_name), top: 0 },
			grid: { left: 48, right: 24, top: 48, bottom: 50 },
			xAxis: {
				type: "category",
				data: data?.week_starts.map(value => value.slice(5)) || [],
				boundaryGap: false,
			},
			yAxis: {
				type: "value",
				name: "周均收益",
				axisLabel: { formatter: "{value}%" },
			},
			series: items.map(item => ({
				name: item.strategy_name,
				type: "line",
				smooth: true,
				connectNulls: false,
				symbolSize: 6,
				data: item.weekly.map(week => week.sample_count > 0 ? week.avg_return_pct : null),
			})),
		};
	}, [data, excellent]);

	const evolutionHeatmapOption = useMemo(() => {
		const items = [...(data?.strategies || [])].reverse();
		const heatData: Array<[number, number, number, number, number, number]> = [];
		items.forEach((item, strategyIndex) => {
			item.weekly.forEach((week, weekIndex) => {
				heatData.push([
					weekIndex,
					strategyIndex,
					WEEKLY_STATUS_VALUE[week.evolution_status] ?? 0,
					week.sample_count,
					week.analysis_run_count,
					week.analysis_new_sample_count,
				]);
			});
		});
		return {
			tooltip: {
				position: "top",
				formatter: (params: any) => {
					const [weekIndex, strategyIndex, status, sampleCount, runCount, analyzedNewCount] = params.data;
					const item = items[strategyIndex];
					const week = item?.weekly[weekIndex];
					const statusLabel = ["无到期样本", "有样本待分析", "已分析", "已应用新参数", "已回滚"][status];
					return [
						`<b>${item?.strategy_name || ""}</b>`,
						`${week?.week_start || ""} 至 ${week?.week_end || ""}`,
						`状态：${statusLabel}`,
						`本周到期样本：${sampleCount}`,
						`本周分析新增成熟样本：${analyzedNewCount}`,
						`进化分析次数：${runCount}`,
						`周平均收益：${formatPct(week?.avg_return_pct)}`,
					].join("<br/>");
				},
			},
			grid: { left: 116, right: 28, top: 34, bottom: 64 },
			xAxis: {
				type: "category",
				data: data?.week_starts.map(value => value.slice(5)) || [],
				splitArea: { show: true },
				axisLabel: { rotate: 25 },
			},
			yAxis: {
				type: "category",
				data: items.map(item => item.strategy_name),
				splitArea: { show: true },
				axisLabel: { fontSize: 11 },
			},
			visualMap: {
				type: "piecewise",
				orient: "horizontal",
				left: "center",
				bottom: 0,
				pieces: [
					{ value: 0, label: "本周无新增", color: "#f0f0f0" },
					{ value: 1, label: "待分析", color: "#ffe58f" },
					{ value: 2, label: "已分析", color: "#91caff" },
					{ value: 3, label: "已进化", color: "#95de64" },
					{ value: 4, label: "已回滚", color: "#ff7875" },
				],
			},
			series: [{
				type: "heatmap",
				data: heatData,
				label: {
					show: true,
					formatter: (params: any) => {
						const status = Number(params.data[2] || 0);
						const matured = Number(params.data[3] || 0);
						const analyzedNew = Number(params.data[5] || 0);
						const count = Math.max(matured, analyzedNew);
						if (status === 4)
							return count > 0 ? `回·${count}` : "回";
						if (status === 3)
							return count > 0 ? `进·${count}` : "进";
						if (matured > 0)
							return `${matured}样`;
						if (analyzedNew > 0)
							return `+${analyzedNew}`;
						return status === 2 ? "已析" : "";
					},
				},
				emphasis: {
					itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.25)" },
				},
			}],
		};
	}, [data]);

	const columns: ColumnsType<StrategyPerformanceDashboardItem> = [
		{
			title: "排名",
			key: "rank",
			width: 68,
			align: "center",
			render: (_, item) => item.rank
				? (
					<Tag color={item.rank <= 3 ? "gold" : "blue"}>
						#
						{item.rank}
					</Tag>
				)
				: <Tooltip title="可执行交易样本少于30"><Tag>待积累</Tag></Tooltip>,
		},
		{
			title: "战法",
			key: "strategy",
			width: 190,
			render: (_, item) => (
				<Space direction="vertical" size={2}>
					<Space size={4}>
						<Text strong>{item.strategy_name}</Text>
						{item.strategy_type === data?.best_strategy_type && <TrophyFilled style={{ color: "#faad14" }} />}
					</Space>
					<Text type="secondary" style={{ fontSize: 12 }}>{item.settlement_rule.label}</Text>
				</Space>
			),
		},
		{
			title: "综合分",
			key: "qualityScore",
			width: 88,
			align: "right",
			sorter: (a, b) => a.quality_score - b.quality_score,
			render: (_, item) => (
				<Tooltip title="综合胜率、平均收益、盈亏比、稳定性和近10笔表现">
					<Text strong style={{ color: item.quality_score >= 60 ? "#d48806" : undefined }}>
						{item.quality_score.toFixed(1)}
					</Text>
				</Tooltip>
			),
		},
		{
			title: "成熟样本",
			dataIndex: ["trade", "sample_count"],
			width: 90,
			align: "right",
			sorter: (a, b) => a.trade.sample_count - b.trade.sample_count,
		},
		{
			title: "盈亏与风险",
			key: "risk",
			width: 145,
			render: (_, item) => (
				<Space direction="vertical" size={2}>
					<Text>
						盈亏比：
						{item.trade.profit_loss_ratio?.toFixed(2) ?? "--"}
					</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						序列回撤：
						{formatPct(item.trade.max_drawdown_pct)}
					</Text>
				</Space>
			),
		},
		{
			title: "近10笔",
			key: "recent",
			width: 150,
			render: (_, item) => {
				const trend = TREND_LABELS[item.trade.trend_status] || TREND_LABELS.insufficient;
				return (
					<Space direction="vertical" size={2}>
						<Tag color={trend.color}>{trend.label}</Tag>
						<Text type="secondary" style={{ fontSize: 12 }}>
							{item.trade.recent_sample_count}
							笔 · 胜率
							{formatRate(item.trade.recent_win_rate_pct)}
							{" · 均"}
							{formatPct(item.trade.recent_avg_return_pct)}
						</Text>
					</Space>
				);
			},
		},
		{
			title: "累计胜率",
			key: "winRate",
			width: 100,
			align: "right",
			sorter: (a, b) => (a.trade.win_rate_pct || 0) - (b.trade.win_rate_pct || 0),
			render: (_, item) => <Text strong>{formatRate(item.trade.win_rate_pct)}</Text>,
		},
		{
			title: "平均收益",
			key: "avgReturn",
			width: 100,
			align: "right",
			sorter: (a, b) => (a.trade.avg_return_pct || 0) - (b.trade.avg_return_pct || 0),
			render: (_, item) => (
				<Text strong style={{ color: returnColor(item.trade.avg_return_pct) }}>
					{formatPct(item.trade.avg_return_pct)}
				</Text>
			),
		},
		{
			title: "本周表现",
			key: "weekly",
			width: 180,
			render: (_, item) => {
				const week = currentWeek(item);
				return week && week.sample_count > 0
					? (
						<Space direction="vertical" size={2}>
							<Text>
								{week.sample_count}
								{" "}
								个 · 胜率
								{" "}
								{formatRate(week.win_rate_pct)}
							</Text>
							<Text style={{ color: returnColor(week.avg_return_pct), fontSize: 12 }}>
								周均
								{" "}
								{formatPct(week.avg_return_pct)}
							</Text>
						</Space>
					)
					: week && week.analysis_new_sample_count > 0
						? (
							<Space direction="vertical" size={2}>
								<Text>
									分析新增
									{" "}
									{week.analysis_new_sample_count}
									{" "}
									个成熟样本
								</Text>
								<Text type="secondary" style={{ fontSize: 12 }}>结算日在历史周，已纳入累计统计</Text>
							</Space>
						)
						: week && week.analysis_run_count > 0
							? <Text type="secondary">已分析，本周无新增到期样本</Text>
							: <Text type="secondary">暂无到期样本</Text>;
			},
		},
		{
			title: "自我进化",
			key: "evolution",
			width: 185,
			render: (_, item) => {
				const decision = DECISION_LABELS[item.last_decision] || DECISION_LABELS.not_analyzed;
				return (
					<Space direction="vertical" size={3}>
						<Space size={4}>
							<Tag color="purple">
								V
								{item.current_version}
							</Tag>
							<Tag color={decision.color}>{decision.label}</Tag>
						</Space>
						<Text type="secondary" style={{ fontSize: 12 }}>
							已变更参数
							{" "}
							{item.changed_param_count}
							{" "}
							项
						</Text>
					</Space>
				);
			},
		},
		{
			title: "周度连续性",
			key: "continuity",
			width: 125,
			render: (_, item) => {
				const continuity = CONTINUITY_LABELS[item.continuity_status] || CONTINUITY_LABELS.not_started;
				return <Tag color={continuity.color}>{continuity.label}</Tag>;
			},
		},
	];

	if (!loading && !data && !error)
		return <Empty description="暂无战法表现数据" />;

	return (
		<Spin spinning={loading}>
			<Space direction="vertical" size={16} style={{ width: "100%" }}>
				<div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
					<div>
						<Title level={4} style={{ margin: 0 }}>战法胜率与周度自进化</Title>
						<Text type="secondary">
							交易推荐按各战法自己的结算周期统计；观察候选不计入胜率
						</Text>
					</div>
					<Space wrap>
						<Segmented
							value={weeks}
							onChange={value => setWeeks(Number(value))}
							options={[
								{ label: "近8周", value: 8 },
								{ label: "近12周", value: 12 },
								{ label: "近26周", value: 26 },
							]}
						/>
						<Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>刷新</Button>
					</Space>
				</div>

				{error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void loadData()}>重试</Button>} />}

				{data && (
					<Card title="简单分析报告" size="small">
						<Alert
							type={best && (best.trade.avg_return_pct ?? 0) >= 0 ? "success" : "warning"}
							showIcon
							message={data.analysis_report.headline}
							description={data.analysis_report.summary}
						/>
						<Row gutter={[24, 12]} style={{ marginTop: 16 }}>
							<Col xs={24} lg={12}>
								<Text strong>怎么看</Text>
								<ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
									{data.analysis_report.key_findings.map(item => <li key={item}><Text>{item}</Text></li>)}
								</ul>
							</Col>
							<Col xs={24} lg={12}>
								<Text strong type="warning">需要注意</Text>
								<ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
									{data.analysis_report.cautions.map(item => <li key={item}><Text type="secondary">{item}</Text></li>)}
								</ul>
							</Col>
						</Row>
					</Card>
				)}

				{data && (
					<>
						{best && (
							<Card
								bordered={false}
								style={{
									background: "linear-gradient(135deg, #1f1c4d 0%, #4c3494 58%, #7b5bd6 100%)",
									color: "#fff",
									overflow: "hidden",
								}}
							>
								<Row gutter={[24, 16]} align="middle">
									<Col xs={24} lg={10}>
										<Space align="start" size={14}>
											<TrophyFilled style={{ color: "#ffd666", fontSize: 40 }} />
											<div>
												<Text style={{ color: "rgba(255,255,255,0.72)" }}>当前综合表现最优秀</Text>
												<Title level={2} style={{ color: "#fff", margin: "2px 0 4px" }}>{best.strategy_name}</Title>
												<Paragraph style={{ color: "rgba(255,255,255,0.82)", margin: 0 }}>
													在成熟交易样本不少于
													{" "}
													{data.ranking_min_samples}
													{" "}
													的战法中，综合胜率、收益、盈亏比、稳定性和近期表现排序。
												</Paragraph>
											</div>
										</Space>
									</Col>
									<Col xs={12} sm={6} lg={3}>
										<Statistic title={<span style={{ color: "rgba(255,255,255,0.72)" }}>胜率</span>} value={best.trade.win_rate_pct || 0} precision={2} suffix="%" valueStyle={{ color: "#fff" }} />
									</Col>
									<Col xs={12} sm={6} lg={3}>
										<Statistic title={<span style={{ color: "rgba(255,255,255,0.72)" }}>平均收益</span>} value={best.trade.avg_return_pct || 0} precision={2} prefix={(best.trade.avg_return_pct || 0) >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} suffix="%" valueStyle={{ color: "#ffd666" }} />
									</Col>
									<Col xs={12} sm={6} lg={3}>
										<Statistic title={<span style={{ color: "rgba(255,255,255,0.72)" }}>综合分</span>} value={best.quality_score} precision={1} suffix="分" valueStyle={{ color: "#fff" }} />
									</Col>
									<Col xs={12} sm={6} lg={5}>
										<Text style={{ color: "rgba(255,255,255,0.72)" }}>优秀战法</Text>
										<div style={{ marginTop: 8 }}>
											<Space wrap size={[4, 6]}>
												{excellent.map(item => <Tag key={item.strategy_type} color="gold">{item.strategy_name}</Tag>)}
											</Space>
										</div>
									</Col>
								</Row>
							</Card>
						)}

						<Row gutter={[12, 12]}>
							<Col xs={12} lg={6}><Card size="small"><Statistic title="成熟交易样本" value={data.total_trade_samples} prefix={<SafetyCertificateOutlined />} /></Card></Col>
							<Col xs={12} lg={6}><Card size="small"><Statistic title="达到排名门槛" value={data.eligible_strategy_count} suffix={`/ ${data.strategies.length}`} prefix={<CheckCircleOutlined />} /></Card></Col>
							<Col xs={12} lg={6}><Card size="small"><Statistic title="已执行进化/回滚" value={data.evolved_strategy_count} suffix="个战法" prefix={<RocketOutlined />} valueStyle={{ color: data.evolved_strategy_count > 0 ? "#722ed1" : undefined }} /></Card></Col>
							<Col xs={12} lg={6}><Card size="small"><Statistic title="本周期有分析日志" value={data.analyzed_strategy_count} suffix={`/ ${data.strategies.length}`} prefix={<ExperimentOutlined />} /></Card></Col>
						</Row>

						<Row gutter={[16, 16]}>
							<Col xs={24} xl={14}>
								<Card title="累计胜率与平均收益" extra={<Tag color="gold">金色为当前第一</Tag>}>
									<ReactECharts option={rankingOption} style={{ height: 390 }} />
								</Card>
							</Col>
							<Col xs={24} xl={10}>
								<Card title="优秀战法周均收益趋势" extra={<Text type="secondary">按结算周</Text>}>
									{excellent.length > 0
										? <ReactECharts option={weeklyTrendOption} style={{ height: 390 }} />
										: <Empty description="暂无达到样本门槛且平均收益为正的战法" style={{ paddingTop: 100 }} />}
								</Card>
							</Col>
						</Row>

						<Card
							title="每周自我进化轨迹"
							extra={(
								<Space wrap>
									<Tag icon={<ClockCircleOutlined />}>分析日志按周聚合</Tag>
									<Tag color="blue">格内数字为到期/分析新增样本</Tag>
									<Tag icon={<WarningOutlined />} color="gold">“已分析”不等于参数已更新</Tag>
								</Space>
							)}
						>
							<Alert
								type="info"
								showIcon
								message="灰色只表示该自然周没有新到期样本，不代表该战法累计样本为 0；累计数量请看下方“成熟样本”列。"
								style={{ marginBottom: 12 }}
							/>
							<ReactECharts
								option={evolutionHeatmapOption}
								style={{ height: Math.max(460, data.strategies.length * 32 + 120) }}
							/>
						</Card>

						<Card
							title="全部战法表现与进化状态"
							extra={(
								<Text type="secondary">
									数据更新：
									{data.generated_at}
								</Text>
							)}
						>
							<Table
								rowKey="strategy_type"
								dataSource={data.strategies}
								columns={columns}
								pagination={false}
								size="middle"
								scroll={{ x: 1450 }}
								rowClassName={item => item.strategy_type === data.best_strategy_type ? "ant-table-row-selected" : ""}
							/>
						</Card>

						<Alert
							type="info"
							showIcon
							message="判定口径"
							description={(
								<Space direction="vertical" size={2}>
									<Text>{data.methodology.ranking}</Text>
									<Text>{data.methodology.drawdown_basis}</Text>
									<Text>{data.methodology.recent_basis}</Text>
									<Text>
										{data.methodology.weekly_basis}
										；只有实际应用新参数或回滚才标记为“已进化”。
									</Text>
									<Text type="secondary">周胜率和收益仅代表历史结算结果，不包含手续费、滑点及无法成交影响。</Text>
								</Space>
							)}
						/>
					</>
				)}
			</Space>
		</Spin>
	);
}
