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
	DashboardOutlined,
	DatabaseOutlined,
	ReloadOutlined,
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
} from "antd";
import { useTranslation } from "react-i18next";

export default function MonitorPage() {
	const { t } = useTranslation();

	// Fetch health check
	const {
		data: healthCheck,
		refresh: refreshHealth,
	} = useRequest(getHealthCheck, {
		pollingInterval: 10000, // Poll every 10 seconds
	});

	// Fetch system metrics
	const {
		data: systemMetrics,
		refresh: refreshMetrics,
	} = useRequest(getSystemMetrics, {
		pollingInterval: 10000, // Poll every 10 seconds
	});

	const getStatusIcon = (status: string) => {
		return status === "healthy" || status === "connected"
			? (
				<CheckCircleOutlined style={{ color: "#52c41a", fontSize: 24 }} />
			)
			: (
				<CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 24 }} />
			);
	};

	const getStatusTag = (status: string) => {
		const isHealthy = status === "healthy" || status === "connected";
		return (
			<Tag color={isHealthy ? "success" : "error"} style={{ fontSize: 14, padding: "4px 12px" }}>
				{status}
			</Tag>
		);
	};

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* System Health */}
				<Card
					title={(
						<Space>
							<DashboardOutlined />
							{t("system.systemHealth", { defaultValue: "System Health" })}
						</Space>
					)}
					extra={(
						<Button
							icon={<ReloadOutlined />}
							onClick={() => {
								refreshHealth();
								refreshMetrics();
							}}
						>
							{t("common.refresh", { defaultValue: "Refresh" })}
						</Button>
					)}
				>
					{healthCheck && (
						<Row gutter={[16, 16]}>
							<Col xs={24} sm={12} md={8}>
								<Card>
									<Space direction="vertical" style={{ width: "100%" }}>
										<Space>
											{getStatusIcon(healthCheck.status)}
											<div style={{ fontSize: 16, fontWeight: 500 }}>
												{t("system.overallStatus", { defaultValue: "Overall Status" })}
											</div>
										</Space>
										{getStatusTag(healthCheck.status)}
									</Space>
								</Card>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Card>
									<Space direction="vertical" style={{ width: "100%" }}>
										<Space>
											<DatabaseOutlined style={{ fontSize: 24, color: "#1890ff" }} />
											<div style={{ fontSize: 16, fontWeight: 500 }}>
												{t("system.database", { defaultValue: "Database" })}
											</div>
										</Space>
										{getStatusTag(healthCheck.database_status)}
									</Space>
								</Card>
							</Col>
							<Col xs={24} sm={12} md={8}>
								<Card>
									<Space direction="vertical" style={{ width: "100%" }}>
										<Space>
											<ApiOutlined style={{ fontSize: 24, color: "#52c41a" }} />
											<div style={{ fontSize: 16, fontWeight: 500 }}>
												{t("system.api", { defaultValue: "API" })}
											</div>
										</Space>
										{getStatusTag(healthCheck.api_status)}
									</Space>
								</Card>
							</Col>
						</Row>
					)}
				</Card>

				{/* System Metrics */}
				{systemMetrics && (
					<Card
						title={(
							<Space>
								<DashboardOutlined />
								{t("system.systemMetrics", { defaultValue: "System Metrics" })}
							</Space>
						)}
					>
						<Row gutter={[16, 16]}>
							<Col xs={24} md={12}>
								<Card title={t("system.cpuUsage", { defaultValue: "CPU Usage" })}>
									<Progress
										type="dashboard"
										percent={systemMetrics.cpu_usage}
										strokeColor={{
											"0%": "#108ee9",
											"100%": "#87d068",
										}}
									/>
								</Card>
							</Col>
							<Col xs={24} md={12}>
								<Card title={t("system.memoryUsage", { defaultValue: "Memory Usage" })}>
									<Progress
										type="dashboard"
										percent={systemMetrics.memory_usage}
										strokeColor={{
											"0%": "#108ee9",
											"100%": "#87d068",
										}}
									/>
								</Card>
							</Col>
						</Row>
						<Row gutter={[16, 16]} style={{ marginTop: 16 }}>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.activeConnections", { defaultValue: "Active Connections" })}
									value={systemMetrics.active_connections}
									prefix={<ApiOutlined />}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.requestsPerMinute", { defaultValue: "Requests/Min" })}
									value={systemMetrics.requests_per_minute}
									prefix={<ClockCircleOutlined />}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.avgResponseTime", { defaultValue: "Avg Response Time" })}
									value={systemMetrics.avg_response_time}
									suffix="ms"
									prefix={<ClockCircleOutlined />}
								/>
							</Col>
						</Row>
					</Card>
				)}

				{/* API Response Metrics */}
				{systemMetrics?.api_metrics && (
					<Card
						title={(
							<Space>
								<ApiOutlined />
								{t("system.apiMetrics", { defaultValue: "API Response Metrics" })}
							</Space>
						)}
					>
						<Descriptions bordered column={2}>
							{Object.entries(systemMetrics.api_metrics).map(([endpoint, metrics]: [string, any]) => (
								<Descriptions.Item key={endpoint} label={endpoint} span={2}>
									<Space>
										<Tag color="blue">
											{metrics.count}
											{" "}
											requests
										</Tag>
										<Tag color="green">
											{metrics.avg_time}
											ms avg
										</Tag>
										<Tag color="orange">
											{metrics.max_time}
											ms max
										</Tag>
									</Space>
								</Descriptions.Item>
							))}
						</Descriptions>
					</Card>
				)}

				{/* Database Connection Info */}
				{healthCheck?.database_info && (
					<Card
						title={(
							<Space>
								<DatabaseOutlined />
								{t("system.databaseInfo", { defaultValue: "Database Information" })}
							</Space>
						)}
					>
						<Descriptions bordered column={2}>
							<Descriptions.Item label={t("system.connectionPool", { defaultValue: "Connection Pool" })}>
								{healthCheck.database_info.pool_size}
								{" "}
								/
								{healthCheck.database_info.max_connections}
							</Descriptions.Item>
							<Descriptions.Item label={t("system.activeQueries", { defaultValue: "Active Queries" })}>
								{healthCheck.database_info.active_queries}
							</Descriptions.Item>
							<Descriptions.Item label={t("system.dbVersion", { defaultValue: "Version" })}>
								{healthCheck.database_info.version}
							</Descriptions.Item>
							<Descriptions.Item label={t("system.uptime", { defaultValue: "Uptime" })}>
								{healthCheck.database_info.uptime}
							</Descriptions.Item>
						</Descriptions>
					</Card>
				)}
			</Space>
		</BasicContent>
	);
}
