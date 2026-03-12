import type { UserItemType } from "#src/api/system/user";
import type { ActionType, ProColumns, ProCoreActionType } from "@ant-design/pro-components";

import { fetchDeleteUserItem, fetchUserList } from "#src/api/system/user";
import { BasicButton } from "#src/components/basic-button";
import { BasicContent } from "#src/components/basic-content";
import { BasicTable } from "#src/components/basic-table";
import { accessControlCodes, useAccess } from "#src/hooks/use-access";

import { PlusCircleOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { Button, Popconfirm } from "antd";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Detail } from "./components/detail";
import { getConstantColumns } from "./constants";

export default function User() {
	const { t } = useTranslation();
	const { hasAccessByCodes } = useAccess();
	const deleteUserItemMutation = useMutation({
		mutationFn: fetchDeleteUserItem,
	});
	/* Detail Data */
	const [isOpen, setIsOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [detailData, setDetailData] = useState<Partial<UserItemType>>({});

	const actionRef = useRef<ActionType>(null);

	const handleDeleteRow = async (id: number, action?: ProCoreActionType<object>) => {
		const responseData = await deleteUserItemMutation.mutateAsync(id);
		await action?.reload?.();
		window.$message?.success(`${t("common.deleteSuccess")} id = ${responseData.result}`);
	};

	const columns: ProColumns<UserItemType>[] = [
		...getConstantColumns(t),
		{
			title: t("common.action"),
			valueType: "option",
			key: "option",
			width: 120,
			fixed: "right",
			render: (text, record, _, action) => {
				return [
					<BasicButton
						key="editable"
						type="link"
						size="small"
						disabled={!hasAccessByCodes(accessControlCodes.update)}
						onClick={async () => {
							setIsOpen(true);
							setTitle(t("system.user.editUser"));
							setDetailData({ ...record });
						}}
					>
						{t("common.edit")}
					</BasicButton>,
					<Popconfirm
						key="delete"
						title={t("common.confirmDelete")}
						onConfirm={() => handleDeleteRow(record.id, action)}
						okText={t("common.confirm")}
						cancelText={t("common.cancel")}
					>
						<BasicButton type="link" size="small" disabled={!hasAccessByCodes(accessControlCodes.delete)}>{t("common.delete")}</BasicButton>
					</Popconfirm>,
				];
			},
		},
	];

	const onCloseChange = () => {
		setIsOpen(false);
		setDetailData({});
	};

	const refreshTable = () => {
		actionRef.current?.reload();
	};
	return (
		<BasicContent className="h-full">
			<BasicTable<UserItemType>
				adaptive
				columns={columns}
				actionRef={actionRef}
				request={async (params) => {
					const responseData = await fetchUserList(params);
					return {
						...responseData,
						data: responseData.result.list,
						total: responseData.result.total,
					};
				}}
				headerTitle={t("common.menu.user")}
				toolBarRender={() => [
					<Button
						key="add-user"
						icon={<PlusCircleOutlined />}
						type="primary"
						disabled={!hasAccessByCodes(accessControlCodes.add)}
						onClick={() => {
							setIsOpen(true);
							setTitle(t("system.user.addUser"));
						}}
					>
						{t("common.add")}
					</Button>,
				]}
			/>
			<Detail
				title={title}
				open={isOpen}
				onCloseChange={onCloseChange}
				detailData={detailData}
				refreshTable={refreshTable}
			/>
		</BasicContent>
	);
}
