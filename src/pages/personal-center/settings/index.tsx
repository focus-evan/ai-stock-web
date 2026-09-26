import { BasicContent } from "#src/components/basic-content";
import { Animation, SiteTheme } from "#src/layout/widgets/preferences/blocks";
import { BulbOutlined, SettingOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Card, Col, Row, Space, Typography } from "antd";
import "../style.css";

export default function Settings() {
	return (
		<BasicContent className="personal-center-page">
			<section className="app-page-hero personal-settings-hero">
				<Space size={12}>
					<SettingOutlined />
					<h1>外观设置</h1>
				</Space>
				<p>调整明暗模式、圆角与页面动效。修改即时应用，并保存在当前浏览器。</p>
			</section>
			<Row gutter={[20, 20]}>
				<Col xs={24} xl={12}>
					<Card
						className="personal-settings-card"
						title={(
							<Space>
								<BulbOutlined />
								<span>显示与阅读</span>
							</Space>
						)}
					>
						<Typography.Paragraph type="secondary">选择适合当前环境的显示方式。</Typography.Paragraph>
						<div className="personal-settings-theme">
							<SiteTheme />
						</div>
					</Card>
				</Col>
				<Col xs={24} xl={12}>
					<Card
						className="personal-settings-card"
						title={(
							<Space>
								<ThunderboltOutlined />
								<span>动效与加载</span>
							</Space>
						)}
					>
						<Typography.Paragraph type="secondary">按使用习惯调整页面切换、加载提示与进度条。</Typography.Paragraph>
						<Animation />
					</Card>
				</Col>
			</Row>
		</BasicContent>
	);
}
