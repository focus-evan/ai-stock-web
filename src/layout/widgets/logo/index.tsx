import logo from "#src/assets/svg/logo.svg?url";
import { clsx } from "clsx";
import { useNavigate } from "react-router";
import { headerHeight } from "../../constants";

export interface LogoProps {
	sidebarCollapsed: boolean
	className?: string
}

export function Logo({ sidebarCollapsed, className }: LogoProps) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			aria-label="AI STOCK 首页"
			style={{ height: headerHeight }}
			className={clsx("app-brand", className)}
			onClick={() => navigate(import.meta.env.VITE_BASE_HOME_PATH)}
		>
			<img src={logo} alt="" width={32} height={32} />
			{!sidebarCollapsed && (
				<span className="app-brand-wordmark">
					AI STOCK
					<span>智能投研工作台</span>
				</span>
			)}
		</button>
	);
}
