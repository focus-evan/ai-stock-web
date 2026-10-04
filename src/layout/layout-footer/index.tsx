import { usePreferencesStore } from "#src/store/preferences";
import { cn } from "#src/utils/cn";

interface LayoutFooterProps {
	className?: string
}
export default function LayoutFooter({ className }: LayoutFooterProps) {
	const {
		enableFooter,
		companyName,
		companyWebsite,
		copyrightDate,
		ICPNumber,
		ICPLink,
	} = usePreferencesStore();
	if (!enableFooter)
		return null;
	const isTemplateFooter = companyName === "Condor Hero" && companyWebsite === "http://github.com/condorheroblog/";
	if (isTemplateFooter) {
		return <footer className={cn("h-10 flex shrink-0 items-center justify-center text-xs text-colorTextSecondary", className)}>AI Stock · 研究、验证与复盘</footer>;
	}

	return (
		<footer
			className={cn(
				"h-10 flex flex-wrap shrink-0 items-center justify-center text-xs md:text-sm text-colorTextSecondary",
				className,
			)}
		>
			{
				ICPNumber
					? (
						<span>
							<a href={ICPLink} rel="noreferrer noopener" target="_blank">{ICPNumber}</a>
							&nbsp;
						</span>
					)
					: null
			}
			Copyright &copy;&nbsp;
			{copyrightDate}
			{copyrightDate ? <>&nbsp;</> : ""}
			{
				companyName
					? (
						<span>
							<a href={companyWebsite} rel="noreferrer noopener" target="_blank">
								{companyName}
								&nbsp;
							</a>
						</span>
					)
					: null
			}
			All right reserved
		</footer>
	);
}
