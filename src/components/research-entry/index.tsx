import { Link } from "react-router";
import "#src/pages/research-center/style.css";

export default function ResearchEntry() {
	return (
		<Link to="/research-center" className="research-entry">
			<div>
				<span className="research-entry-label">RESEARCH & KNOWLEDGE</span>
				<strong>研究与知识库</strong>
				<p>每日雷达 · 个股深度 · 策略复盘 · S老师方法论 · 系统文档</p>
			</div>
			<span className="research-entry-action">打开内容中心 →</span>
		</Link>
	);
}
