import type { Collection, Document } from "#src/api/document";
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

	// Fetch collections
	const {
		data: collections = [],
		loading: collectionsLoading,
		refresh: refreshCollections,
	} = useRequest(getCollections);

	// Fetch documents
	const {
		data: documentsData,
		loading: documentsLoading,
		refresh: refreshDocuments,
	} = useRequest(
		() => getDocuments({ collection_name: selectedCollection || undefined }),
		{
			refreshDeps: [selectedCollection],
		},
	);

	// Upload document
	const { run: handleUpload } = useRequest(
		async (file: File, collectionName: string) => {
			return await uploadDocument(file, collectionName, (progress) => {
				setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
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
			title: t("ai.collection", { defaultValue: "Collection" }),
			dataIndex: "collection_name",
			key: "collection_name",
			render: (text: string) => <Tag color="blue">{text}</Tag>,
		},
		{
			title: t("ai.uploadTime", { defaultValue: "Upload Time" }),
			dataIndex: "upload_time",
			key: "upload_time",
			render: (text: string) => new Date(text).toLocaleString(),
		},
		{
			title: t("ai.fileSize", { defaultValue: "File Size" }),
			dataIndex: "file_size",
			key: "file_size",
			render: (size: number) => {
				if (size < 1024)
					return `${size} B`;
				if (size < 1024 * 1024)
					return `${(size / 1024).toFixed(2)} KB`;
				return `${(size / (1024 * 1024)).toFixed(2)} MB`;
			},
		},
		{
			title: t("ai.status", { defaultValue: "Status" }),
			dataIndex: "status",
			key: "status",
			render: (status: string) => {
				const colorMap: { [key: string]: string } = {
					processed: "success",
					processing: "processing",
					failed: "error",
				};
				return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
			},
		},
		{
			title: t("common.action", { defaultValue: "Action" }),
			key: "action",
			render: (_: any, record: Document) => (
				<Popconfirm
					title={t("ai.confirmDelete", { defaultValue: "Are you sure to delete this document?" })}
					onConfirm={() => handleDelete(record.id)}
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
									{col.document_count || 0}
									)
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
						dataSource={documentsData?.data || []}
						loading={documentsLoading}
						rowKey="id"
						pagination={{
							total: documentsData?.total || 0,
							pageSize: documentsData?.page_size || 10,
							current: documentsData?.page || 1,
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
