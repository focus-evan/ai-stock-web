import type { Collection } from "#src/api/document";
import type { UploadProps } from "antd";
import {
	createCollection,
	deleteDocument,
	getCollections,
	getDocuments,
	uploadDocument,

} from "#src/api/document";
import { BasicContent } from "#src/components/basic-content";
import {
	DeleteOutlined,
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
	Form,
	Input,
	message,
	Modal,
	Popconfirm,
	Progress,
	Select,
	Space,
	Table,
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
		async (values: { name: string, description?: string }) => {
			return await createCollection(values.name, values.description);
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
				<Popconfirm
					title={t("ai.confirmDelete", { defaultValue: "Are you sure to delete this document?" })}
					onConfirm={() => handleDelete(record.doc_id)}
				>
					<Button type="link" danger icon={<DeleteOutlined />}>
						{t("common.delete", { defaultValue: "Delete" })}
					</Button>
				</Popconfirm>
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
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={handleCreateCollection}
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
				</Form>
			</Modal>
		</BasicContent>
	);
}
