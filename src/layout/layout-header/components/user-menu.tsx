import type { ButtonProps, MenuProps } from "antd";

import { BasicButton } from "#src/components/basic-button";
import { RiAccountCircleLine } from "#src/icons";
import { loginPath } from "#src/router/extra-info";
import { useAuthStore } from "#src/store/auth";
import { useUserStore } from "#src/store/user";
import { cn } from "#src/utils/cn";
import { isWindowsOs } from "#src/utils/is-windows-os";

import { KeyOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useKeyPress } from "ahooks";
import { Avatar, Dropdown } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { ChangePasswordModal } from "./change-password-modal";

export function UserMenu({ ...restProps }: ButtonProps) {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const avatar = useUserStore(state => state.avatar);
	const username = useUserStore(state => state.username);
	const logout = useAuthStore(state => state.logout);
	const [changePwdOpen, setChangePwdOpen] = useState(false);

	const onClick: MenuProps["onClick"] = async ({ key }) => {
		if (key === "logout") {
			await logout();
			navigate(loginPath);
		}
		if (key === "personal-center") {
			navigate("/personal-center/my-profile");
		}
		if (key === "change-password") {
			setChangePwdOpen(true);
		}
	};

	const altView = useMemo(() => isWindowsOs() ? "Alt" : "⌥", [isWindowsOs]);
	const items: MenuProps["items"] = [
		{
			label: t("common.menu.personalCenter"),
			key: "personal-center",
			icon: <RiAccountCircleLine />,
			extra: `${altView}P`,
		},
		{
			label: t("authority.changePassword"),
			key: "change-password",
			icon: <KeyOutlined />,
		},
		{
			type: "divider",
		},
		{
			label: t("authority.logout"),
			key: "logout",
			icon: <LogoutOutlined />,
			extra: `${altView}Q`,
		},
	];

	useKeyPress(["alt.P"], () => {
		navigate("/personal-center/my-profile");
	});

	useKeyPress(["alt.Q"], () => {
		onClick({ key: "logout" } as any);
	});

	// 头像颜色：根据用户名生成一个稳定色
	const avatarColor = useMemo(() => {
		const colors = ["#1890ff", "#722ed1", "#eb2f96", "#fa8c16", "#52c41a", "#13c2c2"];
		const idx = (username || "").charCodeAt(0) % colors.length;
		return colors[idx] || "#1890ff";
	}, [username]);

	return (
		<>
			<Dropdown
				menu={{ items, onClick }}
				arrow={false}
				placement="bottomRight"
				trigger={["click"]}
			>
				<BasicButton
					type="text"
					{...restProps}
					className={cn(restProps.className, "rounded-full px-1")}
				>
					{avatar
						? <Avatar src={avatar} />
						: (
							<Avatar
								style={{ backgroundColor: avatarColor }}
								icon={!username ? <UserOutlined /> : undefined}
							>
								{username ? username.charAt(0).toUpperCase() : null}
							</Avatar>
						)}
				</BasicButton>
			</Dropdown>

			<ChangePasswordModal
				open={changePwdOpen}
				onClose={() => setChangePwdOpen(false)}
			/>
		</>
	);
}
