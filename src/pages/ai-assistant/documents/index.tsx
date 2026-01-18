import type { Collection } from "#src/api/document";
import type { UploadProps } from "antd";
import {
	createCollection,
	deleteDocument,
	getCollections,
	getDocumentDetail,
	getDocuments,
	uploadDocument,
} from "#src/api/document";
import { BasicContent } from "#src/components/basic-content";
import {
	DeleteOutlined,
	EyeOutlined,
	FileTextOutlined,
	FolderOutlined,
	PlusOutlined,
	ReloadOutlined,
	UploadOutlined,
} from "@ant-design/icons";
import { useRequest } from "ahooks";
import {
	Button,
	Card,
	Descriptions,
	Drawer,
	Form,
	Input,
	List,
	message,
	Modal,
	Popconfirm,
	Progress,
	Select,
	Space,
	Table,
	Tag,
	Upload,
} from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function DocumentsPage() {
	const { t } = useTranslation();
	const [form] = Form.useForm();
	const [selectedCollection, setSelectedCollection] = useState<string>("");
	const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
	const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

	// Fetch collections
	const {
		data: collectionsResponse,
		loading: collectionsLoading,
		refresh: refreshCollections,
	} = useRequest(getCollections, {
		onError: (error) => {
			console.error("Failed to fetch collections:", error);
			message.error(t("ai.fetchCollectionsFailed", { defaultValue: "Failed to load collections" }));
		},
	});

	const collections = collectionsResponse?.collections || [];

	// Fetch documents
	const {
		data: documentsData,
		loading: documentsLoading,
		refresh: refreshDocuments,
	} = useRequest(
		() => getDocuments({ collection_name: selectedCollection || undefined }),
		{
			ready: !!selectedCollection, // 只有选择了 Collection 才加载文档
			refreshDeps: [selectedCollection],
			onError: (error) => {
				console.error("Failed to fetch documents:", error);
				message.error(t("ai.fetchDocumentsFailed", { defaultValue: "Failed to load documents" }));
			},
		},
	);

	// Upload document
	const { run: handleUpload } = useRequest(
		async (file: File, collectionName: string) => {
			return await uploadDocument(file, collectionName, {
				onProgress: (progress: number) => {
					setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
				},
			});
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("ai.uploadSuccess", { defaultValue: "Upload successful" }));
				refreshDocuments();
			},
			onError: (error) => {
				message.error(t("ai.uploadFailed", { defaultValue: "Upload failed" }));
				console.error("Upload error:", error);
			},
			onFinally: () => {
				setUploadProgress({});
			},
		},
	);

	// Delete document
	const { run: handleDelete } = useRequest(
		async (docId: string) => {
			return await deleteDocument(docId);
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("ai.deleteSuccess", { defaultValue: "Delete successful" }));
				refreshDocuments();
			},
			onError: (error) => {
				message.error(t("ai.deleteFailed", { defaultValue: "Delete failed" }));
				console.error("Delete error:", error);
			},
		},
	);

	// Create collection
	const { run: handleCreateCollection, loading: creatingCollection } = useRequest(
		async (values: {
			name: string
			description?: string
			vector_size?: number
			distance?: "Cosine" | "Euclid" | "Dot"
			on_disk?: boolean
		}) => {
			return await createCollection(values.name, {
				description: values.description,
				vector_size: values.vector_size,
				distance: values.distance,
				on_disk: values.on_disk,
			});
		},
		{
			manual: true,
			onSuccess: () => {
				message.success(t("ai.collectionCreated", { defaultValue: "Collection created" }));
				setIsCollectionModalOpen(false);
				form.resetFields();
				refreshCollections();
			},
			onError: (error) => {
				message.error(t("ai.collectionCreateFailed", { defaultValue: "Failed to create collection" }));
				console.error("Create collection error:", error);
			},
		},
	);

	// Get document detail
	const {
		data: documentDetail,
		loading: detailLoading,
		run: fetchDocumentDetail,
	} = useRequest(
		(docId: string) => getDocumentDetail(docId, selectedCollection),
		{
			manual: true,
			onError: (error) => {
				message.error(t("ai.fetchDetailFailed", { defaultValue: "Failed to load document detail" }));
				console.error("Fetch detail error:", error);
			},
		},
	);

	// Handle view document detail
	const handleViewDetail = (docId: string) => {
		setIsDetailDrawerOpen(true);
		fetchDocumentDetail(docId);
	};

	const uploadProps: UploadProps = {
		beforeUpload: (file) => {
			if (!selectedCollection) {
				message.warning(t("ai.selectCollectionFirst", { defaultValue: "Please select a collection first" }));
				return false;
			}
			handleUpload(file, selectedCollection);
			return false;
		},
		showUploadList: false,
		multiple: true,
	};

	const columns = [
		{
			title: t("ai.fileName", { defaultValue: "File Name" }),
			dataIndex: "file_name",
			key: "file_name",
			render: (text: string) => (
				<Space>
					<FileTextOutlined />
					{text}
				</Space>
			),
		},
		{
			title: t("ai.chunkCount", { defaultValue: "Chunks" }),
			dataIndex: "chunk_count",
			key: "chunk_count",
		},
		{
			title: t("ai.documentId", { defaultValue: "Document ID" }),
			dataIndex: "doc_id",
			key: "doc_id",
			ellipsis: true,
			render: (text: string) => `${text?.substring(0, 20)}...`,
		},
		{
			title: t("common.action", { defaultValue: "Action" }),
			key: "action",
			render: (_: any, record: any) => (
				<Space>
					<Button
						type="link"
						icon={<EyeOutlined />}
						onClick={() => handleViewDetail(record.doc_id)}
					>
						{t("common.view", { defaultValue: "View" })}
					</Button>
					<Popconfirm
						title={t("ai.confirmDelete", { defaultValue: "Are you sure to delete this document?" })}
						onConfirm={() => handleDelete(record.doc_id)}
					>
						<Button type="link" danger icon={<DeleteOutlined />}>
							{t("common.delete", { defaultValue: "Delete" })}
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	return (
		<BasicContent>
			<Card
				title={(
					<Space>
						<FolderOutlined />
						{t("ai.documentManagement", { defaultValue: "Document Management" })}
					</Space>
				)}
				extra={(
					<Space>
						<Button
							icon={<PlusOutlined />}
							onClick={() => setIsCollectionModalOpen(true)}
						>
							{t("ai.newCollection", { defaultValue: "New Collection" })}
						</Button>
						<Button icon={<ReloadOutlined />} onClick={refreshDocuments}>
							{t("common.refresh", { defaultValue: "Refresh" })}
						</Button>
					</Space>
				)}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="large">
					<Space>
						<Select
							style={{ width: 200 }}
							placeholder={t("ai.selectCollection", { defaultValue: "Select Collection" })}
							value={selectedCollection || undefined}
							onChange={setSelectedCollection}
							loading={collectionsLoading}
							allowClear
						>
							{collections.map((col: Collection) => (
								<Select.Option key={col.name} value={col.name}>
									{col.name}
									{" "}
									(
									{col.points_count || 0}
									{" "}
									docs)
								</Select.Option>
							))}
						</Select>

						<Upload {...uploadProps}>
							<Button icon={<UploadOutlined />} disabled={!selectedCollection}>
								{t("ai.uploadDocument", { defaultValue: "Upload Document" })}
							</Button>
						</Upload>
					</Space>

					{Object.keys(uploadProgress).length > 0 && (
						<div>
							{Object.entries(uploadProgress).map(([fileName, progress]) => (
								<div key={fileName} style={{ marginBottom: 8 }}>
									<div>{fileName}</div>
									<Progress percent={progress} status="active" />
								</div>
							))}
						</div>
					)}

					<Table
						columns={columns}
						dataSource={documentsData?.documents || []}
						loading={documentsLoading}
						rowKey="doc_id"
						pagination={{
							total: documentsData?.total_documents || 0,
							pageSize: 10,
							showSizeChanger: true,
							showTotal: total => t("common.total", { defaultValue: `Total ${total} items`, total }),
						}}
					/>
				</Space>
			</Card>

			<Modal
				title={t("ai.createCollection", { defaultValue: "Create Collection" })}
				open={isCollectionModalOpen}
				onOk={() => form.submit()}
				onCancel={() => {
					setIsCollectionModalOpen(false);
					form.resetFields();
				}}
				confirmLoading={creatingCollection}
				width={600}
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={handleCreateCollection}
					initialValues={{
						vector_size: 1024,
						distance: "Cosine",
						on_disk: false,
					}}
				>
					<Form.Item
						name="name"
						label={t("ai.collectionName", { defaultValue: "Collection Name" })}
						rules={[{ required: true, message: t("ai.collectionNameRequired", { defaultValue: "Please enter collection name" }) }]}
					>
						<Input placeholder={t("ai.collectionNamePlaceholder", { defaultValue: "Enter collection name" })} />
					</Form.Item>

					<Form.Item
						name="description"
						label={t("ai.description", { defaultValue: "Description" })}
					>
						<Input.TextArea
							rows={3}
							placeholder={t("ai.descriptionPlaceholder", { defaultValue: "Enter description (optional)" })}
						/>
					</Form.Item>

					<Form.Item
						name="vector_size"
						label={t("ai.vectorSize", { defaultValue: "Vector Size" })}
						tooltip={t("ai.vectorSizeTooltip", { defaultValue: "Dimension of the vector embeddings (default: 1024)" })}
					>
						<Select>
							<Select.Option value={384}>384 (Small models)</Select.Option>
							<Select.Option value={768}>768 (BERT-base)</Select.Option>
							<Select.Option value={1024}>1024 (Recommended)</Select.Option>
							<Select.Option value={1536}>1536 (OpenAI ada-002)</Select.Option>
							<Select.Option value={3072}>3072 (Large models)</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item
						name="distance"
						label={t("ai.distanceMetric", { defaultValue: "Distance Metric" })}
						tooltip={t("ai.distanceMetricTooltip", { defaultValue: "Method to calculate similarity between vectors" })}
					>
						<Select>
							<Select.Option value="Cosine">Cosine (Recommended)</Select.Option>
							<Select.Option value="Euclid">Euclidean</Select.Option>
							<Select.Option value="Dot">Dot Product</Select.Option>
						</Select>
					</Form.Item>

					<Form.Item
						name="on_disk"
						label={t("ai.storageMode", { defaultValue: "Storage Mode" })}
						tooltip={t("ai.storageModeTooltip", { defaultValue: "Store vectors on disk to save memory (slower but more scalable)" })}
					>
						<Select>
							<Select.Option value={false}>In Memory (Faster)</Select.Option>
							<Select.Option value={true}>On Disk (More Scalable)</Select.Option>
						</Select>
					</Form.Item>
				</Form>
			</Modal>

			{/* Document Detail Drawer */}
			<Drawer
				title={t("ai.documentDetail", { defaultValue: "Document Detail" })}
				open={isDetailDrawerOpen}
				onClose={() => setIsDetailDrawerOpen(false)}
				width={800}
				loading={detailLoading}
			>
				{documentDetail && (
					<Space direction="vertical" style={{ width: "100%" }} size="large">
						{/* Document Info */}
						<Card size="small" title={t("ai.basicInfo", { defaultValue: "Basic Information" })}>
							<Descriptions column={1} size="small">
								<Descriptions.Item label={t("ai.fileName", { defaultValue: "File Name" })}>
									{documentDetail.file_name}
								</Descriptions.Item>
								<Descriptions.Item label={t("ai.documentId", { defaultValue: "Document ID" })}>
									<code style={{ fontSize: 12 }}>{documentDetail.doc_id}</code>
								</Descriptions.Item>
								<Descriptions.Item label={t("ai.collection", { defaultValue: "Collection" })}>
									<Tag color="blue">{documentDetail.collection_name}</Tag>
								</Descriptions.Item>
								<Descriptions.Item label={t("ai.chunkCount", { defaultValue: "Chunks" })}>
									<Tag color="green">{documentDetail.chunk_count}</Tag>
								</Descriptions.Item>
								{documentDetail.chunks[0]?.metadata && (
									<>
										<Descriptions.Item label={t("ai.fileSize", { defaultValue: "File Size" })}>
											{(documentDetail.chunks[0].metadata.file_size / 1024).toFixed(2)}
											{" "}
											KB
										</Descriptions.Item>
										<Descriptions.Item label={t("ai.fileType", { defaultValue: "File Type" })}>
											{documentDetail.chunks[0].metadata.file_type}
										</Descriptions.Item>
										<Descriptions.Item label={t("ai.creationDate", { defaultValue: "Creation Date" })}>
											{documentDetail.chunks[0].metadata.creation_date}
										</Descriptions.Item>
									</>
								)}
							</Descriptions>
						</Card>

						{/* Vector Configuration */}
						{documentDetail.vector_config && (
							<Card size="small" title={t("ai.vectorConfig", { defaultValue: "Vector Configuration" })}>
								<Descriptions column={1} size="small">
									<Descriptions.Item label={t("ai.vectorSize", { defaultValue: "Vector Size" })}>
										<Tag color="purple">{documentDetail.vector_config.vector_size}</Tag>
									</Descriptions.Item>
									<Descriptions.Item label={t("ai.distanceMetric", { defaultValue: "Distance Metric" })}>
										<Tag color="cyan">{documentDetail.vector_config.distance}</Tag>
									</Descriptions.Item>
									{documentDetail.vector_config.embedding_model_hint && (
										<Descriptions.Item label={t("ai.embeddingModel", { defaultValue: "Embedding Model" })}>
											<Tag color="orange">{documentDetail.vector_config.embedding_model_hint}</Tag>
										</Descriptions.Item>
									)}
								</Descriptions>
							</Card>
						)}

						{/* Chunks List */}
						<Card
							size="small"
							title={(
								<Space>
									<FileTextOutlined />
									{t("ai.chunks", { defaultValue: "Chunks" })}
									<Tag color="blue">{documentDetail.chunks.length}</Tag>
								</Space>
							)}
						>
							<List
								dataSource={documentDetail.chunks}
								renderItem={(chunk, index) => (
									<List.Item key={chunk.point_id}>
										<List.Item.Meta
											title={(
												<Space>
													<Tag color="purple">
														#
														{index + 1}
													</Tag>
													<span style={{ fontSize: 12, color: "#999" }}>
														ID:
														{" "}
														{chunk.point_id.substring(0, 8)}
														...
													</span>
												</Space>
											)}
											description={(
												<div>
													{chunk.text
														? (
															<div
																style={{
																	padding: 12,
																	background: "#f5f5f5",
																	borderRadius: 4,
																	marginTop: 8,
																	whiteSpace: "pre-wrap",
																	wordBreak: "break-word",
																	maxHeight: 200,
																	overflow: "auto",
																}}
															>
																{chunk.text}
															</div>
														)
														: (
															<div style={{ color: "#999", fontStyle: "italic" }}>
																{t("ai.noContent", { defaultValue: "No content" })}
															</div>
														)}
												</div>
											)}
										/>
									</List.Item>
								)}
								pagination={{
									pageSize: 5,
									size: "small",
									showSizeChanger: true,
									showTotal: total => t("common.total", { defaultValue: `Total ${total} items`, total }),
								}}
							/>
						</Card>
					</Space>
				)}
			</Drawer>
		</BasicContent>
	);
}
