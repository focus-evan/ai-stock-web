import type { FormComponentMapType } from "./form-mode-context";

// import hero from "#src/assets/svg/hero.svg?url";
import logo from "#src/assets/svg/logo.svg?url";
import { useLayoutMenu } from "#src/hooks/use-layout-menu";
import LayoutFooter from "#src/layout/layout-footer";
import { LanguageButton } from "#src/layout/layout-header/components/language-button";
import { ThemeButton } from "#src/layout/layout-header/components/theme-button";

import {
	Col,
	Grid,
	Row,
	theme,
} from "antd";
import { clsx } from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { FORM_COMPONENT_MAP } from "./constants";
import { FormModeContext } from "./form-mode-context";

export default function Login() {
	const { token } = theme.useToken();
	const screens = Grid.useBreakpoint();
	const [formMode, setFormMode] = useState<FormComponentMapType>("login");
	const { pageLayout, layoutButtonTrigger } = useLayoutMenu();
	const isALignLeft = useMemo(() => pageLayout === "layout-left", [pageLayout]);
	const isAlignCenter = useMemo(() => pageLayout === "layout-center", [pageLayout]);

	const providedValue = useMemo(() => ({ formMode, setFormMode }), [formMode, setFormMode]);
	return (
		<div
			className="app-login"
			style={{
				backgroundColor: token.colorBgContainer,
			}}
		>
			<header className="z-10 absolute flex items-center right-3 top-3 left-3">
				<div
					className="text-colorText flex flex-1 items-center"
				>
					<img alt="App Logo" src={logo} className="mr-2 w-11" />
					<h1 className="m-0 text-xl font-medium">
						{import.meta.env.VITE_GLOB_APP_TITLE}
					</h1>
				</div>
				<div className="flex items-center">
					{layoutButtonTrigger}
					<ThemeButton size="large" />
					<LanguageButton size="large" className="px-2.75" />
				</div>
			</header>
			<div
				className="flex items-center overflow-hidden h-full"
			>
				<Row
					className={clsx("h-screen w-full", { "flex-row-reverse": isALignLeft },
					)}
				>
					<Col
						xs={0}
						sm={0}
						lg={15}
						style={{
							background: "var(--app-hero)",
						}}
						className={clsx("app-login-visual", { hidden: isAlignCenter })}
					>
						<div className="flex flex-col items-center justify-center h-full gap-3">
							<div className="app-login-intro">
								<span className="app-login-eyebrow">AI STOCK / INTELLIGENCE</span>
								<h2>
									洞察先一步。
									<br />
									决策更清晰。
								</h2>
								<p>
									聚合行情、策略与研究，
									<br />
									把复杂信息，化为有依据的判断。
								</p>
								<div className="app-login-flow" aria-label="研究流程">
									{["市场情报", "个股研究", "策略跟踪", "交易复盘"].map((label, index) => (
										<div key={label}>
											<span>
												0
												{index + 1}
											</span>
											<strong>{label}</strong>
										</div>
									))}
								</div>
							</div>
						</div>
					</Col>

					<Col
						xs={24}
						sm={24}
						lg={isAlignCenter ? 24 : 9}
						className="app-login-form relative flex flex-col justify-center px-6 py-10 xl:px-8"
						style={isAlignCenter || (!screens.xl && !screens.xxl && !screens.lg)
							? {
								backgroundImage: `radial-gradient(${token.colorBgContainer}, ${token.colorPrimaryBg})`,
							}
							: {}}
					>
						<LayoutFooter className="w-full absolute bottom-3 left-1/2 -translate-x-1/2" />
						<div className="w-full sm:mx-auto md:max-w-md">
							<FormModeContext.Provider value={providedValue}>
								<AnimatePresence mode="wait" initial={false}>
									<motion.div
										key={formMode}
										initial={{ x: 30, opacity: 0 }}
										animate={{ x: 0, opacity: 1 }}
										exit={{ x: 0, opacity: 0 }}
										transition={{ duration: 0.3 }}
									>
										{FORM_COMPONENT_MAP[formMode]}
									</motion.div>
								</AnimatePresence>
							</FormModeContext.Provider>
						</div>
					</Col>
				</Row>
			</div>
		</div>
	);
}
