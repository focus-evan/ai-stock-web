import {
	getSyncHistory,
	getSyncStatus,
	triggerIPOCrawl,
	triggerStockSync,

} from "#src/api/system";
import { BasicContent } from "#src/components/basic-content";
import {
	ClockCircleOutlined,
	CloudSyncOutlined,
	PlayCircleOutlined,
	ReloadOutlined,
	SyncOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
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
} from "antd";
import { useTranslation } from "react-i18next";

export default function SyncPage() {
	const { t } = useTranslation();

	// Fetch sync status
	const {
		data: syncStatus,
		refresh: refreshStatus,
	} = useRequest(getSyncStatus, {
		pollingInterval: 5000, // Poll every 5 seconds
	});

	// Fetch sync history
	const {
		data: syncHistory,
		loading: historyLoading,
		refresh: refreshHistory,
	} = useRequest(getSyncHistory);

	// Trigger stock sync
	const { run: handleStockSync, loading: stockSyncLoading } = useRequest(
		async () => {
			return await triggerStockSync();
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("system.stockSyncTriggered", { defaultValue: "Stock sync triggered" }));
				refreshStatus();
				refreshHistory();
			},
			onError: (error) => {
				message.error(t("system.stockSyncFailed", { defaultValue: "Failed to trigger stock sync" }));
				console.error("Stock sync error:", error);
			},
		},
	);

	// Trigger IPO crawl
	const { run: handleIPOCrawl, loading: ipoCrawlLoading } = useRequest(
		async () => {
			return await triggerIPOCrawl();
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("system.ipoCrawlTriggered", { defaultValue: "IPO crawl triggered" }));
				refreshStatus();
				refreshHistory();
			},
			onError: (error) => {
				message.error(t("system.ipoCrawlFailed", { defaultValue: "Failed to trigger IPO crawl" }));
				console.error("IPO crawl error:", error);
			},
		},
	);

	const historyColumns = [
		{
			title: t("system.taskType", { defaultValue: "Task Type" }),
			dataIndex: "task_type",
			key: "task_type",
			render: (type: string) => {
				const colorMap: { [key: string]: string } = {
					stock_sync: "blue",
					ipo_crawl: "green",
				};
				return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
			},
		},
		{
			title: t("system.status", { defaultValue: "Status" }),
			dataIndex: "status",
			key: "status",
			render: (status: string) => {
				const colorMap: { [key: string]: string } = {
					running: "processing",
					completed: "success",
					failed: "error",
					pending: "default",
				};
				return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
			},
		},
		{
			title: t("system.startTime", { defaultValue: "Start Time" }),
			dataIndex: "start_time",
			key: "start_time",
			render: (text: string) => new Date(text).toLocaleString(),
		},
		{
			title: t("system.endTime", { defaultValue: "End Time" }),
			dataIndex: "end_time",
			key: "end_time",
			render: (text: string) => text ? new Date(text).toLocaleString() : "-",
		},
		{
			title: t("system.duration", { defaultValue: "Duration" }),
			dataIndex: "duration",
			key: "duration",
			render: (duration: number) => {
				if (!duration)
					return "-";
				const minutes = Math.floor(duration / 60);
				const seconds = duration % 60;
				return `${minutes}m ${seconds}s`;
			},
		},
		{
			title: t("system.recordsProcessed", { defaultValue: "Records" }),
			dataIndex: "records_processed",
			key: "records_processed",
			align: "right" as const,
			render: (num: number) => num?.toLocaleString() || "-",
		},
	];

	return (
		<BasicContent>
			<Space direction="vertical" style={{ width: "100%" }} size="large">
				{/* Sync Controls */}
				<Card
					title={(
						<Space>
							<CloudSyncOutlined />
							{t("system.syncControl", { defaultValue: "Sync Control" })}
						</Space>
					)}
					extra={(
						<Button icon={<ReloadOutlined />} onClick={refreshStatus}>
							{t("common.refresh", { defaultValue: "Refresh" })}
						</Button>
					)}
				>
					<Row gutter={[16, 16]}>
						<Col xs={24} sm={12}>
							<Card>
								<Space direction="vertical" style={{ width: "100%" }}>
									<div style={{ fontSize: 16, fontWeight: 500 }}>
										{t("system.stockDataSync", { defaultValue: "Stock Data Sync" })}
									</div>
									<div style={{ color: "#666" }}>
										{t("system.stockSyncDesc", { defaultValue: "Sync stock information from external sources" })}
									</div>
									<Button
										type="primary"
										icon={<PlayCircleOutlined />}
										onClick={handleStockSync}
										loading={stockSyncLoading}
										disabled={syncStatus?.stock_sync_status === "running"}
									>
										{t("system.triggerSync", { defaultValue: "Trigger Sync" })}
									</Button>
									{syncStatus?.stock_sync_status === "running" && (
										<Progress
											percent={syncStatus.stock_sync_progress || 0}
											status="active"
										/>
									)}
								</Space>
							</Card>
						</Col>
						<Col xs={24} sm={12}>
							<Card>
								<Space direction="vertical" style={{ width: "100%" }}>
									<div style={{ fontSize: 16, fontWeight: 500 }}>
										{t("system.ipoCrawl", { defaultValue: "IPO Data Crawl" })}
									</div>
									<div style={{ color: "#666" }}>
										{t("system.ipoCrawlDesc", { defaultValue: "Crawl latest IPO data from web sources" })}
									</div>
									<Button
										type="primary"
										icon={<PlayCircleOutlined />}
										onClick={handleIPOCrawl}
										loading={ipoCrawlLoading}
										disabled={syncStatus?.ipo_crawl_status === "running"}
									>
										{t("system.triggerCrawl", { defaultValue: "Trigger Crawl" })}
									</Button>
									{syncStatus?.ipo_crawl_status === "running" && (
										<Progress
											percent={syncStatus.ipo_crawl_progress || 0}
											status="active"
										/>
									)}
								</Space>
							</Card>
						</Col>
					</Row>
				</Card>

				{/* Current Status */}
				{syncStatus && (
					<Card
						title={(
							<Space>
								<SyncOutlined spin={syncStatus.stock_sync_status === "running" || syncStatus.ipo_crawl_status === "running"} />
								{t("system.currentStatus", { defaultValue: "Current Status" })}
							</Space>
						)}
					>
						<Row gutter={16}>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.stockSyncStatus", { defaultValue: "Stock Sync Status" })}
									value={syncStatus.stock_sync_status}
									valueStyle={{
										color: syncStatus.stock_sync_status === "running" ? "#1890ff" : "#52c41a",
									}}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.ipoCrawlStatus", { defaultValue: "IPO Crawl Status" })}
									value={syncStatus.ipo_crawl_status}
									valueStyle={{
										color: syncStatus.ipo_crawl_status === "running" ? "#1890ff" : "#52c41a",
									}}
								/>
							</Col>
							<Col xs={24} sm={8}>
								<Statistic
									title={t("system.lastSyncTime", { defaultValue: "Last Sync Time" })}
									value={syncStatus.last_sync_time ? new Date(syncStatus.last_sync_time).toLocaleString() : "-"}
									prefix={<ClockCircleOutlined />}
								/>
							</Col>
						</Row>
					</Card>
				)}

				{/* Sync History */}
				<Card
					title={(
						<Space>
							<ClockCircleOutlined />
							{t("system.syncHistory", { defaultValue: "Sync History" })}
						</Space>
					)}
					extra={(
						<Button icon={<ReloadOutlined />} onClick={refreshHistory}>
							{t("common.refresh", { defaultValue: "Refresh" })}
						</Button>
					)}
				>
					<Table
						columns={historyColumns}
						dataSource={syncHistory?.data || []}
						loading={historyLoading}
						rowKey="id"
						pagination={{
							total: syncHistory?.total || 0,
							pageSize: syncHistory?.page_size || 10,
							current: syncHistory?.page || 1,
							showSizeChanger: true,
							showTotal: total => t("common.total", { defaultValue: `Total ${total} items`, total }),
						}}
					/>
				</Card>
			</Space>
		</BasicContent>
	);
}
