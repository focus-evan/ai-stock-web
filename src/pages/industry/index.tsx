import { BasicContent } from "#src/components/basic-content";
import {
	ApiOutlined,
	AppstoreOutlined,
	BlockOutlined,
	NodeIndexOutlined,
	RobotOutlined,
	RocketOutlined,
} from "@ant-design/icons";
import { Badge, Card, Col, Empty, List, Row, Space, Tabs, Tag, Typography } from "antd";
import React, { useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function IndustryAnalysis() {
	const [activeTab, setActiveTab] = useState("ai");

	// ================== AI 产业链数据 ==================
	const aiChainOverview = [
		{
			title: "基础层 (算力基建)",
			icon: <NodeIndexOutlined style={{ color: "#1890ff", fontSize: 24 }} />,
			color: "#1890ff",
			desc: "大模型运行的物理底座，2026年核心从训练向推理倾斜，强调国产化替代与液冷高密散热。",
			items: ["AI芯片/算力卡", "AI服务器/智算中心", "光模块/高速连接", "先进封装/HBM存储"],
		},
		{
			title: "技术层 (模型引擎)",
			icon: <ApiOutlined style={{ color: "#722ed1", fontSize: 24 }} />,
			color: "#722ed1",
			desc: "产业的中枢大脑，已从单纯对话语言模型进化为世界模型与多智能体(Agent)协同。",
			items: ["通用大模型基座", "垂直行业模型", "多模态交互平台", "智能体(Agent)开发生态"],
		},
		{
			title: "应用层 (场景落地)",
			icon: <RobotOutlined style={{ color: "#52c41a", fontSize: 24 }} />,
			color: "#52c41a",
			desc: "AI从工具升级为'AI队友'，深度融入B端制造/办公及C端消费电子终端。",
			items: ["具身智能/机器人", "AI终端 (PC/手机)", "企业级 SaaS/办公", "自动驾驶/智能座舱"],
		},
	];

	const aiSubModules = [
		{
			id: "compute",
			title: "算力核心与通信链路",
			tag: "景气度：极高",
			tagColor: "red",
			desc: "2026年算力建设依然是确定性最强的环节。国内芯片产能爬坡加速，光模块继续受益于全球AI数据中心集群扩建带来的网络升级（向1.6T/3.2T演进）。",
			targets: [
				{ category: "AI芯片 / 服务器", stocks: [
					{ name: "海光信息", code: "688041", logic: "国产CPU/DCU龙头，信创核心" },
					{ name: "寒武纪", code: "688256", logic: "云端智能芯片引领者" },
					{ name: "工业富联", code: "601138", logic: "全球AI服务器代工巨头" },
					{ name: "浪潮信息", code: "000977", logic: "国内智算中心整机龙头" },
				] },
				{ category: "光模块 / 高速互联", stocks: [
					{ name: "中际旭创", code: "300308", logic: "全球光模块出货第一梯队" },
					{ name: "新易盛", code: "300502", logic: "高速光模块核心供应商" },
					{ name: "天孚通信", code: "300394", logic: "光引擎与无源器件龙头" },
					{ name: "沪电股份", code: "002463", logic: "AI服务器高多层PCB核心标的" },
				] },
			],
		},
		{
			id: "models",
			title: "大模型与 Agent 生态",
			tag: "景气度：中高",
			tagColor: "orange",
			desc: "随着底层模型能力趋同，竞争焦点转向'模型变现'与'智能体生态'的建设。具有庞大用户基数和场景数据的企业更具优势。",
			targets: [
				{ category: "基础大模型平台", stocks: [
					{ name: "科大讯飞", code: "002230", logic: "星火大模型，多模态交互领先" },
					{ name: "三六零", code: "601360", logic: "智脑大模型，主打安全与搜索" },
					{ name: "昆仑万维", code: "300418", logic: "天工大模型，C端娱乐/搜索矩阵" },
				] },
				{ category: "垂直模型与营销", stocks: [
					{ name: "蓝色光标", code: "300058", logic: "AI营销平台，内容生成变现" },
					{ name: "万兴科技", code: "300624", logic: "AI视频/创意软件出海龙头" },
					{ name: "中文在线", code: "300364", logic: "IP语料库+AI网文/短剧生成" },
				] },
			],
		},
		{
			id: "applications",
			title: "具身智能与终端应用",
			tag: "景气度：爆发期",
			tagColor: "green",
			desc: "AI技术跨越虚拟边界进入物理世界。人形机器人步入量产元年，AI PC和AI手机渗透率突破50%，端侧推理需求引爆。",
			targets: [
				{ category: "机器人产业链", stocks: [
					{ name: "拓普集团", code: "601689", logic: "特斯拉Bot执行器总成供应商" },
					{ name: "三花智控", code: "002050", logic: "机器人机电执行器核心配套" },
					{ name: "绿的谐波", code: "688017", logic: "精密减速器龙头" },
					{ name: "鸣志电器", code: "603728", logic: "空心杯电机/控制系统" },
				] },
				{ category: "AI 端侧与行业软件", stocks: [
					{ name: "金山办公", code: "688111", logic: "WPS AI，企业级生产力落地" },
					{ name: "同花顺", code: "300033", logic: "AI+金融投顾变现最畅通" },
					{ name: "中科创达", code: "300496", logic: "端侧AI OS与智能汽车操作系统" },
				] },
			],
		},
	];

	// ================== Tabs 渲染逻辑 ==================
	const renderAIContent = () => (
		<Space direction="vertical" style={{ width: "100%" }} size="large">
			{/* 1. 产业全景架构 */}
			<div>
				<Title level={4} style={{ marginBottom: 16 }}>产业全景架构</Title>
				<Row gutter={[16, 16]}>
					{aiChainOverview.map((item, idx) => (
						<Col xs={24} md={8} key={idx}>
							<Card
								style={{ height: "100%", borderRadius: 12, borderTop: `4px solid ${item.color}` }}
								styles={{ body: { padding: "20px" } }}
							>
								<Space align="start" style={{ marginBottom: 12 }}>
									{item.icon}
									<Title level={5} style={{ margin: 0 }}>{item.title}</Title>
								</Space>
								<Paragraph type="secondary" style={{ minHeight: 44, fontSize: 13 }}>
									{item.desc}
								</Paragraph>
								<List
									size="small"
									split={false}
									dataSource={item.items}
									renderItem={li => (
										<List.Item style={{ padding: "4px 0", border: "none" }}>
											<Badge color={item.color} text={<Text style={{ fontSize: 13 }}>{li}</Text>} />
										</List.Item>
									)}
								/>
							</Card>
						</Col>
					))}
				</Row>
			</div>

			{/* 2. 模块逐级拆解 */}
			<div>
				<Title level={4} style={{ marginBottom: 16, marginTop: 16 }}>模块逐级拆解与A股标的</Title>
				<Space direction="vertical" style={{ width: "100%" }} size="middle">
					{aiSubModules.map(module => (
						<Card key={module.id} style={{ borderRadius: 12 }} styles={{ body: { padding: "20px" } }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
								<Title level={5} style={{ margin: 0 }}>{module.title}</Title>
								<Tag color={module.tagColor} style={{ margin: 0 }}>{module.tag}</Tag>
							</div>
							<Paragraph type="secondary" style={{ marginBottom: 20 }}>{module.desc}</Paragraph>

							<Row gutter={[16, 16]}>
								{module.targets.map((cat, cIdx) => (
									<Col xs={24} md={12} key={cIdx}>
										<Card
											size="small"
											title={<Text strong style={{ color: "#1890ff" }}>{cat.category}</Text>}
											style={{ background: "#fafafa", borderRadius: 8 }}
										>
											<List
												size="small"
												split={true}
												dataSource={cat.stocks}
												renderItem={stock => (
													<List.Item style={{ padding: "8px 0" }}>
														<div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
															<div>
																<Text strong>{stock.name}</Text>
																<Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{stock.code}</Text>
															</div>
															<Text type="secondary" style={{ fontSize: 12, textAlign: "right", flex: 1, paddingLeft: 16 }}>
																{stock.logic}
															</Text>
														</div>
													</List.Item>
												)}
											/>
										</Card>
									</Col>
								))}
							</Row>
						</Card>
					))}
				</Space>
			</div>
		</Space>
	);

	const tabItems = [
		{
			key: "ai",
			label: (
				<span>
					<ApiOutlined />
					{" "}
					AI 产业链
				</span>
			),
			children: renderAIContent(),
		},
		{
			key: "aerospace",
			label: (
				<span>
					<RocketOutlined />
					{" "}
					商业航天
				</span>
			),
			children: <Card style={{ borderRadius: 12, textAlign: "center", padding: "40px 0" }}><Empty description="商业航天产业梳理正在生成中..." /></Card>,
		},
		{
			key: "quantum",
			label: (
				<span>
					<BlockOutlined />
					{" "}
					量子经济
				</span>
			),
			children: <Card style={{ borderRadius: 12, textAlign: "center", padding: "40px 0" }}><Empty description="量子经济产业梳理正在生成中..." /></Card>,
		},
	];

	return (
		<BasicContent>
			<Card style={{ borderRadius: 12, marginBottom: 16 }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div>
						<Title level={3} style={{ margin: 0 }}>产业调研与分析</Title>
						<Text type="secondary">2026年最新主线赛道全景图谱与核心标的映射</Text>
					</div>
					<Tag color="blue" icon={<AppstoreOutlined />}>核心主线跟踪</Tag>
				</div>
			</Card>

			<div style={{ background: "#fff", padding: "0 24px 24px", borderRadius: 12 }}>
				<Tabs
					activeKey={activeTab}
					onChange={setActiveTab}
					items={tabItems}
					size="large"
				/>
			</div>
		</BasicContent>
	);
}
