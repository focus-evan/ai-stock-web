import {
	getHealthCheck,
	getSystemMetrics,
} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	ApiOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	CloseCircleOutlined,
	CloudServerOutlined,
	DashboardOutlined,
	DatabaseOutlined,
	ExclamationCircleOutlined,
	HddOutlined,
	ReloadOutlined,
	RobotOutlined,
	ScheduleOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Button,
	Card,
	Col,
	Descriptions,
	Progress,
	Row,
	Space,
	Statistic,
	Tag,
	Typography,
} from "antd";

const { Text } = Typography;

/** 将秒转为可读时间 */
function formatUptime(seconds: number): string {
	if (!seconds)
		return "-";
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0)
		return `${d}天 ${h}时 ${m}分`;
	if (h > 0)
		return `${h}时 ${m}分`;
	return `${m}分`;
}

/** 状态图标 */
function StatusIcon({ status }: { status: string }) {
	if (status === "healthy" || status === "connected" || status === "running" || status === "configured") {
		return <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 22 }} />;
	}
	if (status === "degraded" || status === "stopped" || status === "not_configured") {
		return <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 22 }} />;
	}
	return <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 22 }} />;
}

/** 状态 Tag */
function StatusTag({ status }: { status: string }) {
	const colorMap: Record<string, string> = {
		healthy: "success",
		connected: "success",
		running: "processing",
		configured: "success",
		degraded: "warning",
		stopped: "warning",
		not_configured: "warning",
		error: "error",
		disconnected: "error",
		unhealthy: "error",
	};
	const labelMap: Record<string, string> = {
		healthy: "健康",
		connected: "已连接",
		running: "运行中",
		configured: "已配置",
		degraded: "降级",
		stopped: "已停止",
		not_configured: "未配置",
		error: "异常",
		disconnected: "断开",
		unhealthy: "不健康",
	};
	return (
		<Tag
			color={colorMap[status] || "default"}
			style={{ fontSize: 13, padding: "2px 10px" }}
		>
			{labelMap[status] || status}
		</Tag>
	);
}

/** 使用率颜色 */
function usageColor(pct: number): string {
	if (pct >= 90)
		return "#ff4d4f";
	if (pct >= 70)
		return "#faad14";
	return "#52c41a";
}

export default function MonitorPage() {
	// 健康检查
	const {
		data: rawHealth,
		refresh: refreshHealth,
	} = useRequest(
		async () => {
			const res = await getHealthCheck();
			return (res as any)?.result || res;
		},
		{ pollingInterval: 15000 },
	);

	// 系统指标
	const {
		data: rawMetrics,
		refresh: refreshMetrics,
	} = useRequest(
		async () => {
			const res = await getSystemMetrics();
			return (res as any)?.result || res;
		},
		{ pollingInterval: 10000 },
	);

	const health = rawHealth;
	const metrics = rawMetrics;
	const checks = health?.checks || {};

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* ==================== 系统健康总览 ==================== */}
				<Card
					title={(
						<Space>
							<DashboardOutlined />
							<span>系统健康总览</span>
						</Space>
					)}
					extra={(
						<Space>
							{health && (
								<Text type="secondary" style={{ fontSize: 12 }}>
									最后检查:
									{" "}
									{health.checked_at}
								</Text>
							)}
							<Button
								icon={<ReloadOutlined />}
								onClick={() => {
									refreshHealth();
									refreshMetrics();
								}}
							>
								刷新
							</Button>
						</Space>
					)}
				>
					<Row gutter={[16, 16]}>
						{/* 总体状态 */}
						<Col xs={24} sm={12} md={6}>
							<Card
								hoverable
								style={{
									borderRadius: 12,
									background: health?.status === "healthy"
										? "linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)"
										: "linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)",
								}}
							>
								<Space direction="vertical" align="center" style={{ width: "100%" }}>
									<CloudServerOutlined style={{ fontSize: 28, color: health?.status === "healthy" ? "#52c41a" : "#faad14" }} />
									<Text strong style={{ fontSize: 15 }}>系统状态</Text>
									{health && <StatusTag status={health.status} />}
								</Space>
							</Card>
						</Col>

						{/* API */}
						<Col xs={24} sm={12} md={6}>
							<Card hoverable style={{ borderRadius: 12 }}>
								<Space direction="vertical" align="center" style={{ width: "100%" }}>
									<ApiOutlined style={{ fontSize: 28, color: "#1890ff" }} />
									<Text strong style={{ fontSize: 15 }}>API 服务</Text>
									<StatusTag status={checks.api?.status || "unknown"} />
								</Space>
							</Card>
						</Col>

						{/* 数据库 */}
						<Col xs={24} sm={12} md={6}>
							<Card hoverable style={{ borderRadius: 12 }}>
								<Space direction="vertical" align="center" style={{ width: "100%" }}>
									<DatabaseOutlined style={{ fontSize: 28, color: "#722ed1" }} />
									<Text strong style={{ fontSize: 15 }}>数据库</Text>
									<StatusTag status={checks.database?.status || "unknown"} />
								</Space>
							</Card>
						</Col>

						{/* 调度器 */}
						<Col xs={24} sm={12} md={6}>
							<Card hoverable style={{ borderRadius: 12 }}>
								<Space direction="vertical" align="center" style={{ width: "100%" }}>
									<ScheduleOutlined style={{ fontSize: 28, color: "#eb2f96" }} />
									<Text strong style={{ fontSize: 15 }}>任务调度</Text>
									<StatusTag status={checks.scheduler?.status || "unknown"} />
								</Space>
							</Card>
						</Col>
					</Row>
				</Card>

				{/* ==================== 资源使用率 ==================== */}
				{metrics && (
					<Card
						title={(
							<Space>
								<HddOutlined />
								<span>服务器资源</span>
							</Space>
						)}
					>
						<Row gutter={[24, 24]}>
							{/* CPU */}
							<Col xs={24} sm={12} md={6}>
								<div style={{ textAlign: "center" }}>
									<Progress
										type="dashboard"
										percent={metrics.cpu_usage || 0}
										strokeColor={usageColor(metrics.cpu_usage || 0)}
										size={120}
									/>
									<div style={{ marginTop: 8 }}>
										<Text strong>CPU 使用率</Text>
									</div>
									{metrics.load_average && (
										<Text type="secondary" style={{ fontSize: 11 }}>
											负载:
											{" "}
											{metrics.load_average.map((v: number) => v.toFixed(2)).join(" / ")}
										</Text>
									)}
								</div>
							</Col>

							{/* 内存 */}
							<Col xs={24} sm={12} md={6}>
								<div style={{ textAlign: "center" }}>
									<Progress
										type="dashboard"
										percent={metrics.memory_usage || 0}
										strokeColor={usageColor(metrics.memory_usage || 0)}
										size={120}
									/>
									<div style={{ marginTop: 8 }}>
										<Text strong>内存使用率</Text>
									</div>
									<Text type="secondary" style={{ fontSize: 11 }}>
										{metrics.memory_used_gb || 0}
										{" "}
										/
										{" "}
										{metrics.memory_total_gb || 0}
										{" "}
										GB
									</Text>
								</div>
							</Col>

							{/* 磁盘 */}
							<Col xs={24} sm={12} md={6}>
								<div style={{ textAlign: "center" }}>
									<Progress
										type="dashboard"
										percent={metrics.disk_usage || 0}
										strokeColor={usageColor(metrics.disk_usage || 0)}
										size={120}
									/>
									<div style={{ marginTop: 8 }}>
										<Text strong>磁盘使用率</Text>
									</div>
									<Text type="secondary" style={{ fontSize: 11 }}>
										{metrics.disk_used_gb || 0}
										{" "}
										/
										{" "}
										{metrics.disk_total_gb || 0}
										{" "}
										GB
									</Text>
								</div>
							</Col>

							{/* 进程信息 */}
							<Col xs={24} sm={12} md={6}>
								<Space direction="vertical" style={{ width: "100%" }} size="middle">
									<Statistic
										title="进程运行时间"
										value={formatUptime(metrics.process_uptime_seconds || 0)}
										prefix={<ClockCircleOutlined />}
										valueStyle={{ fontSize: 16 }}
									/>
									<Statistic
										title="进程内存"
										value={metrics.process_memory_mb || 0}
										suffix="MB"
										valueStyle={{ fontSize: 16 }}
									/>
									<Text type="secondary" style={{ fontSize: 11 }}>
										Python
										{" "}
										{metrics.python_version || "-"}
									</Text>
								</Space>
							</Col>
						</Row>
					</Card>
				)}

				{/* ==================== 数据库详情 ==================== */}
				{checks.database && checks.database.status === "connected" && (
					<Card
						title={(
							<Space>
								<DatabaseOutlined />
								<span>数据库详情</span>
							</Space>
						)}
					>
						<Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
							<Descriptions.Item label="版本">
								{checks.database.version}
							</Descriptions.Item>
							<Descriptions.Item label="运行时间">
								{checks.database.uptime_display}
							</Descriptions.Item>
							<Descriptions.Item label="活跃连接">
								<Text strong style={{ color: "#1890ff" }}>
									{checks.database.active_connections}
								</Text>
							</Descriptions.Item>
							<Descriptions.Item label="连接池">
								<Space>
									<Tag color="blue">
										当前:
										{" "}
										{checks.database.pool_size}
									</Tag>
									<Tag color="green">
										空闲:
										{" "}
										{checks.database.pool_free}
									</Tag>
									<Tag color="default">
										上限:
										{" "}
										{checks.database.pool_max}
									</Tag>
								</Space>
							</Descriptions.Item>
						</Descriptions>
					</Card>
				)}

				{/* ==================== DB 连接池 & LLM API ==================== */}
				<Row gutter={[16, 16]}>
					{/* DB 连接池 */}
					{metrics?.db_pool && (
						<Col xs={24} md={12}>
							<Card
								size="small"
								title={(
									<Space>
										<DatabaseOutlined />
										<span>DB 连接池</span>
									</Space>
								)}
							>
								<Row gutter={16}>
									<Col span={8}>
										<Statistic title="当前" value={metrics.db_pool.size} valueStyle={{ fontSize: 20 }} />
									</Col>
									<Col span={8}>
										<Statistic title="空闲" value={metrics.db_pool.free} valueStyle={{ fontSize: 20, color: "#52c41a" }} />
									</Col>
									<Col span={8}>
										<Statistic title="使用中" value={metrics.db_pool.used} valueStyle={{ fontSize: 20, color: "#1890ff" }} />
									</Col>
								</Row>
								<Progress
									percent={metrics.db_pool.max > 0 ? Math.round((metrics.db_pool.used / metrics.db_pool.max) * 100) : 0}
									status="active"
									strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
									style={{ marginTop: 12 }}
								/>
							</Card>
						</Col>
					)}

					{/* LLM API */}
					{checks.llm_api && (
						<Col xs={24} md={12}>
							<Card
								size="small"
								title={(
									<Space>
										<RobotOutlined />
										<span>LLM API</span>
									</Space>
								)}
							>
								<Space direction="vertical" style={{ width: "100%" }}>
									<Space>
										<StatusIcon status={checks.llm_api.status} />
										<Text strong style={{ fontSize: 16 }}>{checks.llm_api.provider}</Text>
									</Space>
									<StatusTag status={checks.llm_api.status} />
								</Space>
							</Card>
						</Col>
					)}
				</Row>
			</Space>
		</BasicContent>
	);
}
