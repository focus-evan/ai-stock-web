import { applyResearchTheme, researchCatalogUrl } from "#src/research-theme";
import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import "./style.css";

export default function ResearchCenter() {
	return (
		<section className="research-center" aria-label="研究与知识库">
			<div className="research-center-heading app-page-hero">
				<div>
					<h1>研究与知识库</h1>
					<p>每日雷达、个股研究、策略复盘与方法沉淀</p>
				</div>
				<Button icon={<ExportOutlined />} href={researchCatalogUrl()} target="_blank" rel="noopener">独立窗口阅读</Button>
			</div>
			<iframe className="research-center-frame" title="研究与知识库内容中心" src={researchCatalogUrl()} onLoad={event => applyResearchTheme(event.currentTarget.contentDocument)} sandbox="allow-scripts allow-same-origin allow-popups allow-downloads allow-top-navigation-by-user-activation" />
		</section>
	);
}
