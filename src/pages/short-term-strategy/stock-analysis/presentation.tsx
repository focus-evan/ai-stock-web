import type { StockAnalysisData } from "#src/api/strategy/types";
import type { CSSProperties, ReactNode } from "react";
import { Tag, theme } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type AnalysisData = StockAnalysisData & {
	market?: string
};
export function ResultSource({ value }: {
	value: unknown
}) {
	const result = value === true || value === 1
		? { color: "blue", label: "模型分析" }
		: value === false || value === 0
			? { color: "orange", label: "规则降级" }
			: { color: "default", label: "来源未标注" };
	return <Tag color={result.color}>{result.label}</Tag>;
}
export function AnalysisSurface({ children, className = "" }: {
	children: ReactNode
	className?: string
}) {
	const { token } = theme.useToken();
	const style = {
		"--sa-bg": token.colorBgContainer,
		"--sa-canvas": token.colorBgLayout,
		"--sa-text": token.colorText,
		"--sa-muted": token.colorTextSecondary,
		"--sa-border": token.colorBorderSecondary,
		"--sa-soft": token.colorFillAlter,
		"--sa-danger": token.colorError,
		"--sa-success": token.colorSuccess,
		"--sa-warning": token.colorWarning,
		"--sa-accent": token.colorPrimary,
	} as CSSProperties;
	return <div className={`sa-surface ${className}`} style={style}>{children}</div>;
}
export function Copy({ text }: {
	text?: string | null
}) {
	return text
		? <div className="sa-copy"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: props => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{text}</ReactMarkdown></div>
		: <p className="sa-muted">本次分析未提供</p>;
}
export function TextList({ items }: {
	items?: string[]
}) {
	return items?.length
		? <ul className="sa-list">{items.map((item, index) => <li key={`${index}-${item}`}><Copy text={item} /></li>)}</ul>
		: <p className="sa-muted">本次分析未提供</p>;
}
export function Section({ title, subtitle, children }: {
	title: string
	subtitle?: string
	children: ReactNode
}) {
	return (
		<section className="sa-panel">
			<div className="sa-section-heading">
				<h3>{title}</h3>
				{subtitle && <span>{subtitle}</span>}
			</div>
			{children}
		</section>
	);
}
