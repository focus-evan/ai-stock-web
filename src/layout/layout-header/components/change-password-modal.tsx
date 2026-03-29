import type { ChangePasswordData } from "#src/api/user";

import { fetchChangePassword } from "#src/api/user";
import { loginPath } from "#src/router/extra-info";
import { useAuthStore } from "#src/store/auth";

import { LockOutlined } from "@ant-design/icons";
import { Form, Input, Modal } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

interface ChangePasswordModalProps {
	open: boolean
	onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
	const { t } = useTranslation();
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const logout = useAuthStore(state => state.logout);

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			setLoading(true);

			const data: ChangePasswordData = {
				current_password: values.currentPassword,
				new_password: values.newPassword,
				confirm_password: values.confirmPassword,
			};

			await fetchChangePassword(data);
			window.$message?.success(t("authority.changePasswordSuccess"));
			form.resetFields();
			onClose();

			// 密码修改成功后退出登录，要求重新登录
			setTimeout(async () => {
				await logout();
				navigate(loginPath);
			}, 1500);
		}
		catch (error: any) {
			if (error?.errorFields)
				return; // form validation error
			window.$message?.error(error?.message || t("authority.changePasswordFailed"));
		}
		finally {
			setLoading(false);
		}
	};

	const handleCancel = () => {
		form.resetFields();
		onClose();
	};

	return (
		<Modal
			title={(
				<span>
					<LockOutlined style={{ marginRight: 8 }} />
					{t("authority.changePassword")}
				</span>
			)}
			open={open}
			onCancel={handleCancel}
			onOk={handleSubmit}
			confirmLoading={loading}
			okText={t("common.confirm")}
			cancelText={t("common.cancel")}
			destroyOnClose
			width={440}
		>
			<div style={{ padding: "16px 0" }}>
				<Form form={form} layout="vertical" autoComplete="off">
					<Form.Item
						name="currentPassword"
						label={t("authority.currentPassword")}
						rules={[
							{ required: true, message: t("form.password.required") },
						]}
					>
						<Input.Password
							placeholder={t("authority.currentPasswordPlaceholder")}
							autoComplete="new-password"
						/>
					</Form.Item>

					<Form.Item
						name="newPassword"
						label={t("authority.newPassword")}
						rules={[
							{ required: true, message: t("form.password.required") },
							{ min: 6, message: t("system.user.passwordMinLength") },
						]}
					>
						<Input.Password
							placeholder={t("authority.newPasswordPlaceholder")}
							autoComplete="new-password"
						/>
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
						<Input.Password
							placeholder={t("form.confirmPassword.required")}
							autoComplete="new-password"
						/>
					</Form.Item>
				</Form>

				<p style={{ color: "#999", fontSize: 12, marginTop: 4 }}>
					{t("authority.changePasswordTip")}
				</p>
			</div>
		</Modal>
	);
}
