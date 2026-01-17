import type { StockInfo, StockQueryParams } from "#src/api/stock";
import { getStockDetail, getStocks } from "#src/api/stock";
import { BasicContent } from "#src/components/basic-content";
import {
	EyeOutlined,
	ReloadOutlined,
	SearchOutlined,
	StockOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Button,
	Card,
	Descriptions,
	Input,
	message,
	Modal,
	Select,
	Space,
	Table,
	Tag,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const { Search } = Input;

export default function StocksPage() {
	const { t } = useTranslation();
	const [searchParams, setSearchParams] = useState<StockQueryParams>({
		page: 1,
		page_size: 10,
	});
	const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

	// Fetch stocks
	const {
		data: stocksData,
		loading: stocksLoading,
		refresh: refreshStocks,
	} = useRequest(
		() => getStocks(searchParams),
		{
			refreshDeps: [searchParams],
		},
	);

	// Fetch stock detail
	const { run: fetchStockDetail, loading: detailLoading } = useRequest(
		async (stockCode: string) => {
			return await getStockDetail(stockCode);
		},
		{
			manual: true,
			onSuccess: (data) => {
				setSelectedStock(data);
				setIsDetailModalOpen(true);
			},
			onError: (error) => {
				message.error(t("stock.fetchDetailFailed", { defaultValue: "Failed to fetch stock detail" }));
				console.error("Fetch stock detail error:", error);
			},
		},
	);

	const handleSearch = (value: string) => {
		setSearchParams(prev => ({ ...prev, keyword: value, page: 1 }));
	};

	const handleFilterChange = (key: string, value: any) => {
		setSearchParams(prev => ({ ...prev, [key]: value, page: 1 }));
	};

	const handleTableChange = (pagination: any) => {
		setSearchParams(prev => ({
			...prev,
			page: pagination.current,
			page_size: pagination.pageSize,
		}));
	};

	const handleViewDetail = (stockCode: string) => {
		fetchStockDetail(stockCode);
	};

	const columns = [
		{
			title: t("stock.stockCode", { defaultValue: "Stock Code" }),
			dataIndex: "stock_code",
			key: "stock_code",
			render: (text: string) => <Tag color="blue">{text}</Tag>,
		},
		{
			title: t("stock.stockName", { defaultValue: "Stock Name" }),
			dataIndex: "stock_name",
			key: "stock_name",
		},
		{
			title: t("stock.exchange", { defaultValue: "Exchange" }),
			dataIndex: "exchange",
			key: "exchange",
			render: (text: string) => {
				const colorMap: { [key: string]: string } = {
					SSE: "red",
					SZSE: "green",
					BSE: "orange",
				};
				return <Tag color={colorMap[text] || "default"}>{text}</Tag>;
			},
		},
		{
			title: t("stock.industry", { defaultValue: "Industry" }),
			dataIndex: "industry",
			key: "industry",
		},
		{
			title: t("stock.listingStatus", { defaultValue: "Status" }),
			dataIndex: "listing_status",
			key: "listing_status",
			render: (status: string) => {
				const colorMap: { [key: string]: string } = {
					listed: "success",
					delisted: "error",
					suspended: "warning",
				};
				return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
			},
		},
		{
			title: t("stock.listingDate", { defaultValue: "Listing Date" }),
			dataIndex: "listing_date",
			key: "listing_date",
		},
		{
			title: t("common.action", { defaultValue: "Action" }),
			key: "action",
			render: (_: any, record: StockInfo) => (
				<Button
					type="link"
					icon={<EyeOutlined />}
					onClick={() => handleViewDetail(record.stock_code)}
				>
					{t("common.detail", { defaultValue: "Detail" })}
				</Button>
			),
		},
	];

	return (
		<BasicContent>
			<Card
				title={(
					<Space>
						<StockOutlined />
						{t("stock.stockQuery", { defaultValue: "Stock Query" })}
					</Space>
				)}
				extra={(
					<Button icon={<ReloadOutlined />} onClick={refreshStocks}>
						{t("common.refresh", { defaultValue: "Refresh" })}
					</Button>
				)}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="large">
					<Space wrap>
						<Search
							placeholder={t("stock.searchPlaceholder", { defaultValue: "Search by code or name" })}
							onSearch={handleSearch}
							style={{ width: 300 }}
							enterButton={<SearchOutlined />}
						/>
						<Select
							style={{ width: 150 }}
							placeholder={t("stock.selectStatus", { defaultValue: "Status" })}
							onChange={value => handleFilterChange("listing_status", value)}
							allowClear
						>
							<Select.Option value="listed">{t("stock.listed", { defaultValue: "Listed" })}</Select.Option>
							<Select.Option value="delisted">{t("stock.delisted", { defaultValue: "Delisted" })}</Select.Option>
							<Select.Option value="suspended">{t("stock.suspended", { defaultValue: "Suspended" })}</Select.Option>
						</Select>
						<Select
							style={{ width: 150 }}
							placeholder={t("stock.selectExchange", { defaultValue: "Exchange" })}
							onChange={value => handleFilterChange("exchange", value)}
							allowClear
						>
							<Select.Option value="SSE">{t("stock.sse", { defaultValue: "SSE" })}</Select.Option>
							<Select.Option value="SZSE">{t("stock.szse", { defaultValue: "SZSE" })}</Select.Option>
							<Select.Option value="BSE">{t("stock.bse", { defaultValue: "BSE" })}</Select.Option>
						</Select>
						<Input
							style={{ width: 200 }}
							placeholder={t("stock.industry", { defaultValue: "Industry" })}
							onChange={e => handleFilterChange("industry", e.target.value)}
							allowClear
						/>
					</Space>

					<Table
						columns={columns}
						dataSource={stocksData?.data || []}
						loading={stocksLoading}
						rowKey="stock_code"
						onChange={handleTableChange}
						pagination={{
							total: stocksData?.total || 0,
							pageSize: searchParams.page_size,
							current: searchParams.page,
							showSizeChanger: true,
							showTotal: total => t("common.total", { defaultValue: `Total ${total} items`, total }),
						}}
					/>
				</Space>
			</Card>

			<Modal
				title={t("stock.stockDetail", { defaultValue: "Stock Detail" })}
				open={isDetailModalOpen}
				onCancel={() => setIsDetailModalOpen(false)}
				footer={null}
				width={800}
				loading={detailLoading}
			>
				{selectedStock && (
					<Descriptions bordered column={2}>
						<Descriptions.Item label={t("stock.stockCode", { defaultValue: "Stock Code" })}>
							<Tag color="blue">{selectedStock.stock_code}</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.stockName", { defaultValue: "Stock Name" })}>
							{selectedStock.stock_name}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.companyName", { defaultValue: "Company Name" })}>
							{selectedStock.company_name || "-"}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.exchange", { defaultValue: "Exchange" })}>
							<Tag color={selectedStock.exchange === "SSE" ? "red" : "green"}>
								{selectedStock.exchange}
							</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.listingStatus", { defaultValue: "Status" })}>
							<Tag color={selectedStock.listing_status === "listed" ? "success" : "error"}>
								{selectedStock.listing_status}
							</Tag>
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.listingDate", { defaultValue: "Listing Date" })}>
							{selectedStock.listing_date}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.industry", { defaultValue: "Industry" })}>
							{selectedStock.industry || "-"}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.registeredCapital", { defaultValue: "Registered Capital" })}>
							{selectedStock.registered_capital || "-"}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.legalRepresentative", { defaultValue: "Legal Representative" })} span={2}>
							{selectedStock.legal_representative || "-"}
						</Descriptions.Item>
						<Descriptions.Item label={t("stock.businessScope", { defaultValue: "Business Scope" })} span={2}>
							{selectedStock.business_scope || "-"}
						</Descriptions.Item>
					</Descriptions>
				)}
			</Modal>
		</BasicContent>
	);
}
