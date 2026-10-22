import { PageHeading } from "#src/components/page-heading";
import { applyResearchTheme, researchCatalogUrl } from "#src/research-theme";
import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import "./style.css";

export default function ResearchCenter() {
	return (
		<section className="research-center" aria-label="研究与知识库">
			<PageHeading
				eyebrow="KNOWLEDGE / RESEARCH LIBRARY"
				title="研究与知识库"
				description="每日雷达、个股研究、策略复盘与方法沉淀"
				actions={<Button icon={<ExportOutlined />} href={researchCatalogUrl()} target="_blank" rel="noopener">独立窗口阅读</Button>}
			/>
			<iframe
				className="research-center-frame"
				title="研究与知识库内容中心"
				src={researchCatalogUrl()}
				onLoad={(event) => {
					const target = event.currentTarget.contentDocument;
					if (target)
						target.documentElement.setAttribute("data-library-embedded", "");
					applyResearchTheme(target);
				}}
				sandbox="allow-scripts allow-same-origin allow-popups allow-downloads allow-top-navigation-by-user-activation"
			/>
		</section>
	);
}
