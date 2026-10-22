import type { ReactNode } from "react";

interface PageHeadingProps {
	eyebrow: string
	title: string
	description: string
	actions?: ReactNode
}

/** A consistent entry point: page purpose first, primary action beside it. */
export function PageHeading({ eyebrow, title, description, actions }: PageHeadingProps) {
	return (
		<header className="app-page-hero app-section-heading">
			<div>
				<span className="app-section-eyebrow">{eyebrow}</span>
				<h1>{title}</h1>
				<p>{description}</p>
			</div>
			{actions && <div className="app-section-actions">{actions}</div>}
		</header>
	);
}
