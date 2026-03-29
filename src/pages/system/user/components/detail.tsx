import type { UserItemType } from "#src/api/system/user";
import { fetchRoleList } from "#src/api/system/role";
import { fetchAddUserItem, fetchUpdateUserItem } from "#src/api/system/user";
import { fetchResetUserPassword } from "#src/api/user";

import { KeyOutlined } from "@ant-design/icons";
import {
	DrawerForm,
	ProFormRadio,
	ProFormSelect,
	ProFormText,
	ProFormTextArea,
} from "@ant-design/pro-components";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal } from "antd";
import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

interface DetailProps {
	title: React.ReactNode
	open: boolean
	detailData: Partial<UserItemType>
	onCloseChange: () => void
	refreshTable?: () => void
}

export function Detail({ title, open, onCloseChange, detailData, refreshTable }: DetailProps) {
	const { t } = useTranslation();
	const [form] = Form.useForm<UserItemType>();
	const [resetPwdOpen, setResetPwdOpen] = useState(false);
	const [resetPwdForm] = Form.useForm();
	const [resetPwdLoading, setResetPwdLoading] = useState(false);

	const { data: roleOptions = [] } = useQuery({
		queryKey: ["role-options-for-user"],
		staleTime: 0,
		queryFn: async () => {
			const res = await fetchRoleList({ pageSize: 100 });
			return res.result.list.map((r: any) => ({
				label: r.name,
				value: r.code,
			}));
		},
		placeholderData: [],
	});

	const addMutation = useMutation({
		mutationFn: fetchAddUserItem,
	});
	const updateMutation = useMutation({
		mutationFn: fetchUpdateUserItem,
	});

	const onFinish = async (values: UserItemType) => {
		// 处理角色: 如果是数组转成逗号分隔
		if (Array.isArray(values.roleCodes)) {
			values.roleCodes = (values.roleCodes as unknown as string[]).join(",");
		}
		if (detailData.id) {
			await updateMutation.mutateAsync({ ...values, id: detailData.id });
			window.$message?.success(t("common.updateSuccess"));
		}
		else {
			await addMutation.mutateAsync(values);
			window.$message?.success(t("common.addSuccess"));
		}
		refreshTable?.();
		return true;
	};

	useEffect(() => {
		if (open) {
			const formData = { ...detailData };
			// 角色编码转数组给 select
			if (typeof formData.roleCodes === "string" && formData.roleCodes) {
				(formData as any).roleCodes = formData.roleCodes.split(",");
			}
			form.setFieldsValue(formData);
		}
	}, [open]);

	const isEdit = !!detailData.id;

	const handleResetPassword = async () => {
		try {
			const values = await resetPwdForm.validateFields();
			if (!detailData.id)
				return;
			setResetPwdLoading(true);
			await fetchResetUserPassword(detailData.id, values.newPassword);
			window.$message?.success(t("system.user.resetPasswordSuccess"));
			setResetPwdOpen(false);
			resetPwdForm.resetFields();
		}
		catch (error: any) {
			if (error?.errorFields)
				return; // form validation error
			window.$message?.error(t("system.user.resetPasswordFailed"));
		}
		finally {
			setResetPwdLoading(false);
		}
	};

	return (
		<>
			<DrawerForm<UserItemType>
				title={title}
				open={open}
				onOpenChange={(visible) => {
					if (visible === false) {
						onCloseChange();
					}
				}}
				resize={{
					onResize() {},
					maxWidth: window.innerWidth * 0.8,
					minWidth: 500,
				}}
				labelCol={{ span: 6 }}
				wrapperCol={{ span: 24 }}
				layout="horizontal"
				form={form}
				autoFocusFirstInput
				drawerProps={{
					destroyOnHidden: true,
				}}
				onFinish={onFinish}
				initialValues={{
					status: 1,
					roleCodes: [],
				}}
			>
				<ProFormText
					allowClear
					rules={[{ required: true, message: t("form.required") }]}
					width="md"
					name="username"
					label={t("system.user.username")}
					disabled={isEdit}
				/>

				{!isEdit && (
					<ProFormText.Password
						allowClear
						rules={[{ required: !isEdit, message: t("form.required") }]}
						width="md"
						name="password"
						label={t("system.user.password")}
						placeholder={t("system.user.defaultPasswordHint")}
					/>
				)}

				{isEdit && (
					<Form.Item label={t("system.user.password")}>
						<Button
							icon={<KeyOutlined />}
							onClick={() => {
								resetPwdForm.resetFields();
								setResetPwdOpen(true);
							}}
						>
							{t("system.user.resetPassword")}
						</Button>
					</Form.Item>
				)}

				<ProFormText
					allowClear
					width="md"
					name="nickname"
					label={t("system.user.nickname")}
				/>

				<ProFormText
					allowClear
					width="md"
					name="email"
					label={t("system.user.email")}
				/>

				<ProFormText
					allowClear
					width="md"
					name="phone"
					label={t("system.user.phone")}
				/>

				<ProFormSelect
					mode="multiple"
					width="md"
					name="roleCodes"
					label={t("system.user.roleCodes")}
					options={roleOptions}
				/>

				<ProFormRadio.Group
					name="status"
					label={t("common.status")}
					radioType="button"
					options={[
						{
							label: t("common.enabled"),
							value: 1,
						},
						{
							label: t("common.deactivated"),
							value: 0,
						},
					]}
				/>

				<ProFormTextArea
					allowClear
					width="md"
					name="remark"
					label={t("common.remark")}
				/>
			</DrawerForm>

			<Modal
				title={t("system.user.resetPassword")}
				open={resetPwdOpen}
				onCancel={() => {
					setResetPwdOpen(false);
					resetPwdForm.resetFields();
				}}
				onOk={handleResetPassword}
				confirmLoading={resetPwdLoading}
				okText={t("common.confirm")}
				cancelText={t("common.cancel")}
				destroyOnClose
			>
				<div style={{ padding: "16px 0" }}>
					<p style={{ marginBottom: 16, color: "#666" }}>
						{t("system.user.resetPasswordDesc", { username: detailData.username })}
					</p>
					<Form form={resetPwdForm} layout="vertical">
						<Form.Item
							name="newPassword"
							label={t("system.user.newPassword")}
							rules={[
								{ required: true, message: t("form.password.required") },
								{ min: 6, message: t("system.user.passwordMinLength") },
							]}
						>
							<Input.Password placeholder={t("system.user.newPasswordPlaceholder")} />
						</Form.Item>
						<Form.Item
							name="confirmPassword"
							label={t("authority.confirmPassword")}
							dependencies={["newPassword"]}
							rules={[
								{ required: true, message: t("form.confirmPassword.required") },
								({ getFieldValue }) => ({
									validator(_, value) {
										if (!value || getFieldValue("newPassword") === value) {
											return Promise.resolve();
										}
										return Promise.reject(new Error(t("form.confirmPassword.invalid")));
									},
								}),
							]}
						>
							<Input.Password placeholder={t("form.confirmPassword.required")} />
						</Form.Item>
					</Form>
				</div>
			</Modal>
		</>
	);
}
