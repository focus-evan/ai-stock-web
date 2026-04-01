import type { SchedulerTask } from "#src/api/system";

import {
	addSchedulerUser,
	getSchedulerStatus,
	getSchedulerUserConfig,
	removeSchedulerUser,
	updateSchedulerUser,
} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	DashboardOutlined,
	DeleteOutlined,
	MinusCircleOutlined,
	PlusOutlined,
	ReloadOutlined,
	SettingOutlined,
	ThunderboltOutlined,
	UserOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Badge,
	Button,
	Card,
	Checkbox,
	Col,
	message,
	Popconfirm,
	Progress,
	Row,
	Select,
	Space,
	Statistic,
	Switch,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import { useState } from "react";

const { Text } = Typography;

/** 策略颜色 */
function strategyColor(s: string): string {
	if (s === "dragon_head")
		return "#eb2f96";
	if (s === "event_driven")
		return "#fa8c16";
	if (s === "sentiment")
		return "#1890ff";
	if (s === "breakthrough")
		return "#13c2c2";
	if (s === "volume_price")
		return "#2f54eb";
	if (s === "overnight")
		return "#52c41a";
	if (s === "moving_average")
		return "#faad14";
	if (s === "combined")
		return "#722ed1";
	if (s === "relay")
		return "#f5222d";
	if (s === "northbound")
		return "#9254de";
	if (s === "trend_momentum")
		return "#fa541c";
	if (s === "moat_value")
		return "#2f54eb";
	if (s === "global")
		return "#8c8c8c";
	return "#595959";
}

/** 策略图标 */
function strategyIcon(s: string): string {
	if (s === "dragon_head")
		return "🐉";
	if (s === "event_driven")
		return "📡";
	if (s === "sentiment")
		return "💡";
	if (s === "breakthrough")
		return "🚀";
	if (s === "volume_price")
		return "📊";
	if (s === "overnight")
		return "🌙";
	if (s === "moving_average")
		return "📈";
	if (s === "combined")
		return "🔗";
	if (s === "relay")
		return "🏆";
	if (s === "northbound")
		return "🏦";
	if (s === "trend_momentum")
		return "📐";
	if (s === "moat_value")
		return "🏰";
	if (s === "global")
		return "⚙️";
	return "📋";
}

/** 阶段颜色 */
function phaseColor(phase: string): string {
	if (phase.includes("recommend"))
		return "blue";
	if (phase.includes("trade"))
		return "red";
	if (phase.includes("follow"))
		return "green";
	if (phase === "盘前" || phase === "premarket")
		return "cyan";
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
	if (phase === "盘前" || phase === "premarket")
		return "盘前";
	if (phase === "settle")
		return "结算";
	if (phase === "review")
		return "复盘";
	return phase;
}

/** 任务类型选项 */
const TASK_TYPE_OPTIONS = [
	{ label: "自动交易", value: "trade" },
	{ label: "跟投建议", value: "follow" },
	{ label: "每日复盘", value: "review" },
];

export default function SchedulerPage() {
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>(["trade", "follow", "review"]);

	// 调度器状态
	const {
		data: schedulerData,
		loading,
		refresh: refreshScheduler,
	} = useRequest(
		async () => {
			const res = await getSchedulerStatus();
			return (res as any)?.result || res;
		},
		{ pollingInterval: 10000 },
	);

	// 用户配置
	const {
		data: userConfigData,
		loading: configLoading,
		refresh: refreshConfig,
	} = useRequest(
		async () => {
			const res = await getSchedulerUserConfig();
			return (res as any)?.result || res;
		},
	);

	// 添加用户
	const { run: handleAddUser, loading: addLoading } = useRequest(
		async () => {
			if (!selectedUserId)
				return;
			return await addSchedulerUser(selectedUserId, selectedTaskTypes);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success("用户已添加");
				setSelectedUserId(null);
				setSelectedTaskTypes(["trade", "follow", "review"]);
				refreshConfig();
				refreshScheduler();
			},
			onError: () => message.error("添加失败"),
		},
	);

	// 删除用户
	const { run: handleRemoveUser } = useRequest(
		async (userId: number) => {
			return await removeSchedulerUser(userId);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success("用户已移除");
				refreshConfig();
				refreshScheduler();
			},
			onError: () => message.error("移除失败"),
		},
	);

	// 更新用户启用状态
	const { run: handleToggleUser } = useRequest(
		async (userId: number, enabled: boolean) => {
			return await updateSchedulerUser(userId, { enabled });
		},
		{
			manual: true,
			onSuccess: () => {
				message.success("状态已更新");
				refreshConfig();
			},
			onError: () => message.error("更新失败"),
		},
	);

	const tasks: SchedulerTask[] = schedulerData?.tasks || [];
	const summary = schedulerData?.summary || { total: 0, done: 0, pending: 0, progress: 0 };

	const configs = userConfigData?.configs || [];
	const availableUsers = userConfigData?.available_users || [];
	// 已配置的用户 ID
	const configuredUserIds = new Set(configs.map((c: any) => c.user_id));
	// 可选的用户（排除已配置的）
	const selectableUsers = availableUsers.filter((u: any) => !configuredUserIds.has(u.id));

	// 按策略分组
	const strategies = [
		"dragon_head",
		"event_driven",
		"sentiment",
		"breakthrough",
		"volume_price",
		"overnight",
		"moving_average",
		"northbound",
		"trend_momentum",
		"relay",
		"combined",
		"global",
	];
	const strategyNames: Record<string, string> = {
		dragon_head: "🐉 龙头战法",
		event_driven: "📡 事件驱动",
		sentiment: "💡 情绪战法",
		breakthrough: "🚀 突破战法",
		volume_price: "📊 量价关系",
		overnight: "🌙 隔夜施工法",
		moving_average: "📈 均线战法",
		northbound: "🏦 北向资金",
		trend_momentum: "📐 趋势动量",
		relay: "🏆 连板接力",
		combined: "🔗 综合战法",
		global: "⚙️ 全局任务",
	};

	const taskColumns = [
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

	// 配置用户表格列
	const userColumns = [
		{
			title: "用户",
			dataIndex: "username",
			key: "username",
			render: (username: string) => (
				<Space>
					<UserOutlined />
					<Text strong>{username}</Text>
				</Space>
			),
		},
		{
			title: "任务类型",
			dataIndex: "task_types",
			key: "task_types",
			render: (types: string[]) => (
				<Space>
					{types.includes("trade") && <Tag color="red">自动交易</Tag>}
					{types.includes("follow") && <Tag color="green">跟投建议</Tag>}
					{types.includes("review") && <Tag color="purple">每日复盘</Tag>}
				</Space>
			),
		},
		{
			title: "状态",
			dataIndex: "enabled",
			key: "enabled",
			width: 80,
			render: (enabled: boolean, record: any) => (
				<Switch
					checked={enabled}
					size="small"
					onChange={checked => handleToggleUser(record.user_id, checked)}
				/>
			),
		},
		{
			title: "操作",
			key: "action",
			width: 80,
			render: (_: any, record: any) => (
				<Popconfirm
					title={`确认移除用户 ${record.username}？`}
					description="移除后该用户将不再执行定时任务"
					onConfirm={() => handleRemoveUser(record.user_id)}
				>
					<Button type="link" danger size="small" icon={<DeleteOutlined />}>
						移除
					</Button>
				</Popconfirm>
			),
		},
	];

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* ==================== 用户配置管理 ==================== */}
				<Card
					title={(
						<Space>
							<SettingOutlined />
							<span>定时任务用户配置</span>
						</Space>
					)}
					extra={(
						<Button
							icon={<ReloadOutlined />}
							onClick={refreshConfig}
							loading={configLoading}
							size="small"
						>
							刷新
						</Button>
					)}
				>
					{/* 添加用户 */}
					<div
						style={{
							display: "flex",
							gap: 12,
							alignItems: "center",
							marginBottom: 16,
							padding: "12px 16px",
							background: "#fafafa",
							borderRadius: 8,
						}}
					>
						<Select
							style={{ width: 180 }}
							placeholder="选择用户"
							value={selectedUserId}
							onChange={setSelectedUserId}
							options={selectableUsers.map((u: any) => ({
								label: u.nickname ? `${u.username} (${u.nickname})` : u.username,
								value: u.id,
							}))}
							allowClear
						/>
						<Checkbox.Group
							options={TASK_TYPE_OPTIONS}
							value={selectedTaskTypes}
							onChange={v => setSelectedTaskTypes(v as string[])}
						/>
						<Button
							type="primary"
							icon={<PlusOutlined />}
							onClick={handleAddUser}
							loading={addLoading}
							disabled={!selectedUserId}
						>
							添加
						</Button>
					</div>

					{/* 已配置用户列表 */}
					<Table
						columns={userColumns}
						dataSource={configs}
						rowKey="id"
						pagination={false}
						size="small"
						locale={{ emptyText: "暂无配置用户，请添加" }}
					/>
				</Card>

				{/* ==================== 头部概览 ==================== */}
				<Card
					title={(
						<Space>
							<DashboardOutlined />
							<span>任务执行状态</span>
						</Space>
					)}
					extra={(
						<Space>
							{schedulerData?.running
								? <Badge status="processing" text={<Text type="success">运行中</Text>} />
								: <Badge status="error" text={<Text type="danger">已停止</Text>} />}
							<Button icon={<ReloadOutlined />} onClick={refreshScheduler} loading={loading}>
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

				{/* ==================== 按策略分组的任务面板 ==================== */}
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
										columns={taskColumns}
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

				{/* ==================== 时间轴概览 ==================== */}
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
