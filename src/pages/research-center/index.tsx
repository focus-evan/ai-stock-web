import { ExportOutlined } from "@ant-design/icons";
import { Button } from "antd";
import "./style.css";

export default function ResearchCenter() {
	return (
		<section className="research-center" aria-label="研究与知识库">
			<div className="research-center-heading">
				<div>
					<h1>研究与知识库</h1>
					<p>每日雷达、个股研究、策略复盘与方法沉淀</p>
				</div>
				<Button icon={<ExportOutlined />} href="/research-library/index.html" target="_blank" rel="noopener">独立窗口阅读</Button>
			</div>
			<iframe className="research-center-frame" title="研究与知识库内容中心" src="/research-library/index.html" sandbox="allow-scripts allow-same-origin allow-popups allow-downloads allow-top-navigation-by-user-activation" />
		</section>
	);
}
