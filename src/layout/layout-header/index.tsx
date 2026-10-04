import type { ButtonProps } from "antd";
import { useDeviceType } from "#src/hooks/use-device-type";
import { usePreferences } from "#src/hooks/use-preferences";
import { useLayout } from "#src/layout/hooks/use-layout";
import { GlobalSearch } from "#src/layout/widgets/global-search";
import { NotificationContainer } from "#src/layout/widgets/notification/notification-container";
import { Preferences } from "#src/layout/widgets/preferences";
import { useTabsStore } from "#src/store/tabs";
import { cn } from "#src/utils/cn";

import { MenuFoldOutlined, MenuUnfoldOutlined, MoreOutlined } from "@ant-design/icons";
import { theme as antdTheme, Button, ConfigProvider, Popover, Space, theme } from "antd";

import { headerHeight } from "../constants";
import { BranchBadge } from "./components/branch-badge";
import { FullscreenButton } from "./components/fullscreen-button";
import { LanguageButton } from "./components/language-button";
import { ThemeButton } from "./components/theme-button";
import { UserMenu } from "./components/user-menu";

export interface LayoutHeaderProps {
	className?: string
	children?: React.ReactNode
}

const buttonProps: ButtonProps = {
	size: "large",
	className: "px-[11px]",
};

export default function LayoutHeader({ className, children }: LayoutHeaderProps) {
	const {
		token: { Menu },
	} = theme.useToken();
	const {
		sidebarCollapsed,
		setPreferences,
		isDark,
		sidebarTheme,
	} = usePreferences();
	const { isMobile } = useDeviceType();
	const isMaximize = useTabsStore(state => state.isMaximize);
	const { isTopNav, isMixedNav } = useLayout();
	const isFixedDarkTheme = isDark || (sidebarTheme === "dark" && (isMixedNav || isTopNav));

	return (
		<ConfigProvider
			theme={{
				algorithm: isFixedDarkTheme
					? antdTheme.darkAlgorithm
					: antdTheme.defaultAlgorithm,
			}}
		>
			<header
				data-shell-theme={isFixedDarkTheme ? "dark" : "light"}
				className={cn(
					"app-header flex-shrink-0 flex gap-2 md:gap-5 justify-between items-center transition-all px-2 md:px-4",
					{ "overflow-hidden": isMaximize },
					className,
				)}
				style={{
					background: isFixedDarkTheme ? Menu?.darkItemBg : Menu?.itemBg,
					height: isMaximize ? 0 : headerHeight,
				}}
			>

				{
					isMobile
						? (
							<Button
								aria-label={sidebarCollapsed ? "关闭功能导航" : "打开功能导航"}
								aria-expanded={sidebarCollapsed}
								type="text"
								icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
								onClick={() => setPreferences("sidebarCollapsed", !sidebarCollapsed)}
								className="h-full"
							/>
						)
						: null
				}

				<div className="flex items-center grow h-full overflow-hidden">
					{children}
				</div>

				<div className="app-header-tools flex items-center">
					{!isMobile && <BranchBadge />}
					<GlobalSearch />
					{!isMobile && <Preferences {...buttonProps} />}
					<ThemeButton {...buttonProps} />
					{!isMobile && <LanguageButton {...buttonProps} />}
					{!isMobile && <FullscreenButton {...buttonProps} target={document.documentElement} />}
					{isMobile && (
						<Popover
							trigger="click"
							placement="bottomRight"
							title="更多工具"
							content={(
								<Space>
									<Preferences {...buttonProps} />
									<LanguageButton {...buttonProps} />
								</Space>
							)}
						>
							<Button aria-label="更多工具" type="text" icon={<MoreOutlined />} {...buttonProps} />
						</Popover>
					)}
					<NotificationContainer {...buttonProps} />
					<UserMenu {...buttonProps} />
				</div>
			</header>
		</ConfigProvider>
	);
}
