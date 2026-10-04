import { Scrollbar } from "#src/components/scrollbar";
import { useDeviceType } from "#src/hooks/use-device-type";
import { usePreferences } from "#src/hooks/use-preferences";
import { cn } from "#src/utils/cn";

import { theme as antdTheme, Drawer } from "antd";
import { createUseStyles } from "react-jss";

import LayoutMenu from "../layout-menu";
import { useMenu } from "../layout-menu/use-menu";

const useStyles = createUseStyles({
	drawerStyles: {
		"& .ant-drawer-body": {
			"padding": 0,
			"&>ul": {
				paddingTop: "1em",
			},
		},
	},
});

export default function LayoutMobileMenu() {
	const classes = useStyles();
	const { token: { Menu } } = antdTheme.useToken();
	const { sidebarCollapsed, setPreferences, isDark, sidebarTheme } = usePreferences();
	const { isMobile } = useDeviceType();
	const { sideNavItems, handleMenuSelect } = useMenu();
	const isFixedDarkTheme = isDark || sidebarTheme === "dark";

	return (
		isMobile
			? (
				<Drawer
					title="功能导航"
					styles={{
						body: {
							backgroundColor: isFixedDarkTheme ? Menu?.darkItemBg : Menu?.itemBg,
						},
					}}
					open={sidebarCollapsed}
					placement="left"
					width="min(300px, 86vw)"
					className={cn(classes.drawerStyles)}
					onClose={() => setPreferences("sidebarCollapsed", false)}
				>
					<Scrollbar>
						<LayoutMenu
							autoExpandCurrentMenu
							menus={sideNavItems}
							handleMenuSelect={(key, mode) => {
								handleMenuSelect(key, mode);
								setPreferences("sidebarCollapsed", false);
							}}
						/>
					</Scrollbar>
				</Drawer>
			)
			: null
	);
}
