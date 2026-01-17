import type { ShareholderInfo } from "#src/api/shareholder";
import { getShareholders } from "#src/api/shareholder";
import { BasicContent } from "#src/components/basic-content";
import {
	CrownOutlined,
	ReloadOutlined,
	SearchOutlined,
	TeamOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Button,
	Card,
	Input,
	message,
	Space,
	Table,
	Tag,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const { Search } = Input;

export default function ShareholdersPage() {
	const { t } = useTranslation();
	const [stockCode, setStockCode] = useState<string>("");

	// Fetch shareholders
	const {
		data: shareholdersData,
		loading: shareholdersLoading,
		run: fetchShareholders,
	} = useRequest(
		async (code: string) => {
			return await getShareholders(code);
		},
		{
			manual: true,
			onError: (error) => {
				message.error(t("stock.fetchShareholdersFailed", { defaultValue: "Failed to fetch shareholders" }));
				console.error("Fetch shareholders error:", error);
			},
		},
	);

	const handleSearch = (value: string) => {
		if (!value.trim()) {
			message.warning(t("stock.enterStockCode", { defaultValue: "Please enter stock code" }));
			return;
		}
		setStockCode(value);
		fetchShareholders(value);
	};

	const handleRefresh = () => {
		if (stockCode) {
			fetchShareholders(stockCode);
		}
	};

	const columns = [
		{
			title: t("stock.rank", { defaultValue: "Rank" }),
			dataIndex: "rank",
			key: "rank",
			width: 80,
			render: (rank: number) => {
				if (rank === 1) {
					return (
						<Tag icon={<CrownOutlined />} color="gold">
							{rank}
						</Tag>
					);
				}
				return <Tag>{rank}</Tag>;
			},
		},
		{
			title: t("stock.shareholderName", { defaultValue: "Shareholder Name" }),
			dataIndex: "shareholder_name",
			key: "shareholder_name",
			render: (text: string, record: ShareholderInfo) => {
				if (record.rank === 1) {
					return (
						<Space>
							<CrownOutlined style={{ color: "#faad14" }} />
							<strong>{text}</strong>
						</Space>
					);
				}
				return text;
			},
		},
		{
			title: t("stock.shareholderType", { defaultValue: "Type" }),
			dataIndex: "shareholder_type",
			key: "shareholder_type",
			render: (type: string) => {
				const colorMap: { [key: string]: string } = {
					individual: "blue",
					institutional: "green",
					state: "red",
					foreign: "purple",
				};
				return <Tag color={colorMap[type] || "default"}>{type}</Tag>;
			},
		},
		{
			title: t("stock.shareholdingNumber", { defaultValue: "Shares (万股)" }),
			dataIndex: "shareholding_number",
			key: "shareholding_number",
			align: "right" as const,
			render: (num: number) => num.toLocaleString(),
		},
		{
			title: t("stock.shareholdingRatio", { defaultValue: "Ratio (%)" }),
			dataIndex: "shareholding_ratio",
			key: "shareholding_ratio",
			align: "right" as const,
			render: (ratio: number, record: ShareholderInfo) => {
				const color = record.rank === 1 ? "#faad14" : undefined;
				return (
					<span style={{ color, fontWeight: record.rank === 1 ? "bold" : "normal" }}>
						{ratio.toFixed(2)}
						%
					</span>
				);
			},
		},
	];

	return (
		<BasicContent>
			<Card
				title={(
					<Space>
						<TeamOutlined />
						{t("stock.shareholderInfo", { defaultValue: "Shareholder Information" })}
					</Space>
				)}
				extra={(
					<Button
						icon={<ReloadOutlined />}
						onClick={handleRefresh}
						disabled={!stockCode}
					>
						{t("common.refresh", { defaultValue: "Refresh" })}
					</Button>
				)}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="large">
					<Search
						placeholder={t("stock.enterStockCodePlaceholder", { defaultValue: "Enter stock code (e.g., 600000)" })}
						onSearch={handleSearch}
						style={{ width: 400 }}
						enterButton={(
							<Button type="primary" icon={<SearchOutlined />}>
								{t("common.search", { defaultValue: "Search" })}
							</Button>
						)}
						size="large"
					/>

					{stockCode && (
						<div>
							<Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
								{t("stock.currentStock", { defaultValue: "Current Stock" })}
								:
								{stockCode}
							</Tag>
						</div>
					)}

					<Table
						columns={columns}
						dataSource={shareholdersData?.data || []}
						loading={shareholdersLoading}
						rowKey={record => `${record.shareholder_name}-${record.rank}`}
						pagination={false}
						locale={{
							emptyText: t("stock.noShareholderData", {
								defaultValue: "No shareholder data. Please search for a stock code.",
							}),
						}}
					/>

					{shareholdersData && shareholdersData.data && shareholdersData.data.length > 0 && (
						<div style={{ marginTop: 16, padding: 16, background: "#f0f5ff", borderRadius: 4 }}>
							<Space direction="vertical">
								<div>
									<CrownOutlined style={{ color: "#faad14", marginRight: 8 }} />
									<strong>
										{t("stock.controllingShareholder", { defaultValue: "Controlling Shareholder" })}
										:
									</strong>
									{" "}
									{shareholdersData.data[0]?.shareholder_name}
								</div>
								<div>
									<strong>
										{t("stock.totalTopShareholders", { defaultValue: "Total Top Shareholders" })}
										:
									</strong>
									{" "}
									{shareholdersData.data.length}
								</div>
							</Space>
						</div>
					)}
				</Space>
			</Card>
		</BasicContent>
	);
}
