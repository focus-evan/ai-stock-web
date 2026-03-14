import type { SchedulerTask } from "#src/api/system";

import {
	getSchedulerStatus,
} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	DashboardOutlined,
	MinusCircleOutlined,
	ReloadOutlined,
	ThunderboltOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Badge,
	Button,
	Card,
	Col,
	Progress,
	Row,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";

const { Text } = Typography;

/** 策略颜色 */
function strategyColor(s: string): string {
	if (s === "dragon_head")
		return "#eb2f96";
	if (s === "event_driven")
		return "#fa8c16";
	if (s === "sentiment")
		return "#1890ff";
	return "#722ed1";
}

/** 策略图标 */
function strategyIcon(s: string): string {
	if (s === "dragon_head")
		return "🐉";
	if (s === "event_driven")
		return "📡";
	if (s === "sentiment")
		return "💡";
	return "⚙️";
}

/** 阶段颜色 */
function phaseColor(phase: string): string {
	if (phase.includes("recommend"))
		return "blue";
	if (phase.includes("trade"))
		return "red";
	if (phase.includes("follow"))
		return "green";
	if (phase === "settle")
		return "orange";
	if (phase === "review")
		return "purple";
	return "default";
}

/** 阶段标签 */
function phaseLabel(phase: string): string {
	if (phase.includes("recommend"))
		return "推荐";
	if (phase.includes("trade"))
		return "交易";
	if (phase.includes("follow"))
		return "跟投";
	if (phase === "settle")
		return "结算";
	if (phase === "review")
		return "复盘";
	return phase;
}

export default function SchedulerPage() {
	const {
		data: schedulerData,
		loading,
		refresh,
	} = useRequest(
		async () => {
			const res = await getSchedulerStatus();
			return (res as any)?.result || res;
		},
		{ pollingInterval: 10000 },
	);

	const tasks: SchedulerTask[] = schedulerData?.tasks || [];
	const summary = schedulerData?.summary || { total: 0, done: 0, pending: 0, progress: 0 };

	// 按策略分组
	const strategies = ["dragon_head", "event_driven", "sentiment", "global"];
	const strategyNames: Record<string, string> = {
		dragon_head: "🐉 龙头战法",
		event_driven: "📡 事件驱动",
		sentiment: "💡 情绪战法",
		global: "⚙️ 全局任务",
	};

	const columns = [
		{
			title: "任务",
			dataIndex: "label",
			key: "label",
			render: (label: string, record: SchedulerTask) => (
				<Space>
					<Tag color={phaseColor(record.phase)}>{phaseLabel(record.phase)}</Tag>
					<Text>{label}</Text>
				</Space>
			),
		},
		{
			title: "时间窗口",
			dataIndex: "time",
			key: "time",
			render: (t: string) => (
				<Text code style={{ fontSize: 13 }}>{t}</Text>
			),
		},
		{
			title: "状态",
			dataIndex: "done",
			key: "done",
			width: 100,
			align: "center" as const,
			render: (done: boolean) =>
				done
					? (
						<Tooltip title="已完成">
							<CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
						</Tooltip>
					)
					: (
						<Tooltip title="待执行">
							<MinusCircleOutlined style={{ color: "#d9d9d9", fontSize: 18 }} />
						</Tooltip>
					),
		},
	];

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* 头部概览 */}
				<Card
					title={(
						<Space>
							<DashboardOutlined />
							<span>定时任务管理</span>
						</Space>
					)}
					extra={(
						<Space>
							{schedulerData?.running
								? <Badge status="processing" text={<Text type="success">运行中</Text>} />
								: <Badge status="error" text={<Text type="danger">已停止</Text>} />}
							<Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
								刷新
							</Button>
						</Space>
					)}
				>
					<Row gutter={[16, 16]}>
						<Col xs={24} sm={6}>
							<Statistic
								title="今日进度"
								value={summary.progress}
								suffix="%"
								prefix={<ThunderboltOutlined />}
								valueStyle={{ color: summary.progress === 100 ? "#52c41a" : "#1890ff" }}
							/>
							<Progress
								percent={summary.progress}
								showInfo={false}
								strokeColor={{
									"0%": "#108ee9",
									"100%": "#87d068",
								}}
								style={{ marginTop: 8 }}
							/>
						</Col>
						<Col xs={24} sm={6}>
							<Statistic
								title="已完成"
								value={summary.done}
								suffix={`/ ${summary.total}`}
								prefix={<CheckCircleOutlined />}
								valueStyle={{ color: "#52c41a" }}
							/>
						</Col>
						<Col xs={24} sm={6}>
							<Statistic
								title="待执行"
								value={summary.pending}
								prefix={<ClockCircleOutlined />}
								valueStyle={{ color: "#faad14" }}
							/>
						</Col>
						<Col xs={24} sm={6}>
							<Statistic
								title="交易日"
								value={schedulerData?.is_trading_day ? "是" : "否"}
								valueStyle={{ color: schedulerData?.is_trading_day ? "#52c41a" : "#8c8c8c" }}
							/>
							<Text type="secondary" style={{ fontSize: 12 }}>
								{schedulerData?.current_time || "-"}
							</Text>
						</Col>
					</Row>
				</Card>

				{/* 按策略分组的任务面板 */}
				<Row gutter={[16, 16]}>
					{strategies.map((strategy) => {
						const stratTasks = tasks.filter(t => t.strategy === strategy);
						if (stratTasks.length === 0)
							return null;
						const doneCount = stratTasks.filter(t => t.done).length;
						const totalCount = stratTasks.length;
						const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

						return (
							<Col xs={24} lg={12} key={strategy}>
								<Card
									size="small"
									title={(
										<Space>
											<span style={{ fontSize: 16 }}>
												{strategyNames[strategy] || strategy}
											</span>
											<Tag color={pct === 100 ? "success" : "processing"}>
												{doneCount}
												/
												{totalCount}
											</Tag>
										</Space>
									)}
									extra={(
										<Progress
											type="circle"
											percent={pct}
											size={36}
											strokeColor={strategyColor(strategy)}
										/>
									)}
									style={{
										borderRadius: 12,
										borderTop: `3px solid ${strategyColor(strategy)}`,
									}}
								>
									<Table
										columns={columns}
										dataSource={stratTasks}
										rowKey={r => `${r.strategy}-${r.phase}`}
										pagination={false}
										size="small"
										showHeader={false}
									/>
								</Card>
							</Col>
						);
					})}
				</Row>

				{/* 时间轴概览 */}
				<Card
					size="small"
					title={(
						<Space>
							<ClockCircleOutlined />
							<span>今日任务时间轴</span>
						</Space>
					)}
				>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
						{tasks.map(task => (
							<Tooltip
								key={`${task.strategy}-${task.phase}`}
								title={`${task.name} - ${task.label} (${task.time})`}
							>
								<Tag
									color={task.done ? "success" : "default"}
									style={{
										padding: "4px 10px",
										fontSize: 12,
										cursor: "pointer",
										borderRadius: 6,
									}}
								>
									<Space size={4}>
										<span>{strategyIcon(task.strategy)}</span>
										<span>{task.label}</span>
										<span style={{ color: "#8c8c8c" }}>{task.time.split("-")[0]}</span>
										{task.done
											? <CheckCircleOutlined style={{ color: "#52c41a" }} />
											: <MinusCircleOutlined style={{ color: "#d9d9d9" }} />}
									</Space>
								</Tag>
							</Tooltip>
						))}
					</div>
				</Card>
			</Space>
		</BasicContent>
	);
}
