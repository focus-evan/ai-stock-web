import type { UserItemType } from "#src/api/system/user";
import type { ProColumns } from "@ant-design/pro-components";
import type { TFunction } from "i18next";

import { Tag } from "antd";

export function getConstantColumns(t: TFunction<"translation", undefined>): ProColumns<UserItemType>[] {
	return [
		{
			dataIndex: "index",
			title: t("common.index"),
			valueType: "indexBorder",
			width: 80,
		},
		{
			title: t("system.user.username"),
			dataIndex: "username",
			disable: true,
			ellipsis: true,
			width: 120,
			formItemProps: {
				rules: [
					{
						required: true,
						message: t("form.required"),
					},
				],
			},
		},
		{
			title: t("system.user.nickname"),
			dataIndex: "nickname",
			disable: true,
			ellipsis: true,
			width: 120,
			search: false,
		},
		{
			title: t("system.user.email"),
			dataIndex: "email",
			disable: true,
			ellipsis: true,
			width: 180,
			search: false,
		},
		{
			title: t("system.user.phone"),
			dataIndex: "phone",
			disable: true,
			ellipsis: true,
			width: 130,
			search: false,
		},
		{
			title: t("system.user.roleCodes"),
			dataIndex: "roleCodes",
			disable: true,
			ellipsis: true,
			width: 120,
			search: false,
			render: (_, record) => {
				if (!record.roleCodes)
					return "-";
				return record.roleCodes.split(",").map(code => (
					<Tag key={code} color="blue">{code}</Tag>
				));
			},
		},
		{
			disable: true,
			title: t("common.status"),
			dataIndex: "status",
			valueType: "select",
			width: 80,
			render: (text, record) => {
				return <Tag color={record.status === 1 ? "success" : "default"}>{text}</Tag>;
			},
			valueEnum: {
				1: {
					text: t("common.enabled"),
				},
				0: {
					text: t("common.deactivated"),
				},
			},
		},
		{
			title: t("common.remark"),
			dataIndex: "remark",
			search: false,
		},
		{
			title: t("common.createTime"),
			dataIndex: "createTime",
			valueType: "date",
			width: 100,
			search: false,
		},
	];
}
