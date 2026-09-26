import { BasicContent } from "#src/components/basic-content";
import { FormAvatarItem } from "#src/components/basic-form";
import { useUserStore } from "#src/store/user";

import { UserOutlined } from "@ant-design/icons";
import {
	ProForm,
	ProFormDigit,
	ProFormText,
	ProFormTextArea,
} from "@ant-design/pro-components";
import { Card, Form, Input, Space, Typography } from "antd";
import "#src/pages/home/business.css";
import "../style.css";

export default function Profile() {
	const currentUser = useUserStore();
	const getAvatarURL = () => {
		if (currentUser) {
			if (currentUser.avatar) {
				return currentUser.avatar;
			}
		}
		return "";
	};

	const handleFinish = async () => {
		window.$message?.success("更新基本信息成功");
	};

	return (
		<BasicContent className="personal-center-page">
			<Card
				className="business-section-card personal-profile-card"
				title={(
					<Space>
						<UserOutlined />
						<span>我的资料</span>
					</Space>
				)}
			>
				<Typography.Paragraph type="secondary" className="personal-center-intro">头像与基本资料</Typography.Paragraph>
				<div className="personal-profile-form">
					<ProForm
						layout="vertical"
						onFinish={handleFinish}
						initialValues={{
							...currentUser,
							avatar: getAvatarURL(),
						}}
						requiredMark
					>
						<Form.Item
							name="avatar"
							label="头像"
							rules={[
								{
									required: true,
									message: "请输入您的昵称!",
								},
							]}
						>
							<FormAvatarItem />
						</Form.Item>
						<ProFormText
							name="username"
							label="用户名"
							rules={[
								{
									required: true,
									message: "请输入您的用户名!",
								},
							]}
						/>
						<ProFormText
							name="email"
							label="邮箱"
							rules={[
								{
									required: true,
									message: "请输入您的邮箱!",
								},
							]}
						/>
						<ProFormDigit
							name="phoneNumber"
							label="联系电话"
							rules={[
								{
									required: true,
									message: "请输入您的联系电话!",
								},
							]}
						>
							<Input type="tel" allowClear />
						</ProFormDigit>
						<ProFormTextArea
							allowClear
							name="description"
							label="个人简介"
							placeholder="个人简介"
						/>
					</ProForm>
				</div>
			</Card>
		</BasicContent>
	);
};
