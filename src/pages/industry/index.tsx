import { BasicContent } from "#src/components/basic-content";
import {
	AimOutlined,
	ApiOutlined,
	AppstoreOutlined,
	BlockOutlined,
	GlobalOutlined,
	LockOutlined,
	NodeIndexOutlined,
	RadarChartOutlined,
	RobotOutlined,
	RocketOutlined,
	ShareAltOutlined,
} from "@ant-design/icons";
import { Badge, Card, Col, List, Row, Space, Tabs, Tag, Typography } from "antd";
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

	// ================== 商业航天 产业链数据 ==================
	const aerospaceChainOverview = [
		{
			title: "空间段 (火箭与卫星制造)",
			icon: <RocketOutlined style={{ color: "#d4380d", fontSize: 24 }} />,
			color: "#d4380d",
			desc: "星座建设的基础，以低成本、高可靠、可重复使用的商业火箭及批量化卫星生产为核心。",
			items: ["运载火箭制造/发动机", "卫星平台制造", "星载核心通信载荷", "核心元器件/材料"],
		},
		{
			title: "地面段 (基站与终端)",
			icon: <RadarChartOutlined style={{ color: "#096dd9", fontSize: 24 }} />,
			color: "#096dd9",
			desc: "连接星与地、星与星的关键设施，包括测控站、网关站以及各类用户接收终端。",
			items: ["地面测控/接收站", "核心网与信关站", "消费级直连终端", "特种通信接收装备"],
		},
		{
			title: "应用段 (运营与服务)",
			icon: <GlobalOutlined style={{ color: "#389e0d", fontSize: 24 }} />,
			color: "#389e0d",
			desc: "商业闭环的最终出口。随着低轨星座成网，应用场景从特种行业加速向民用C端拓展。",
			items: ["卫星通信运营(星链)", "高精度遥感/地理测绘", "北斗高精导航定位", "低空经济网联协同"],
		},
	];

	const aerospaceSubModules = [
		{
			id: "aero_manufacture",
			title: "星座建设：星箭制造与发射",
			tag: "景气度：极高",
			tagColor: "red",
			desc: "GW星座与G60星链进入密集发射期，卫星和火箭的总装制造、核心元器件及上游材料迎来确定性业绩兑现。",
			targets: [
				{ category: "卫星制造与载荷", stocks: [
					{ name: "中国卫星", code: "600118", logic: "微小卫星制造国家队" },
					{ name: "上海瀚讯", code: "300487", logic: "G60星链核心通信载荷供应商" },
					{ name: "创意信息", code: "300366", logic: "低轨卫星通信载荷核心算法" },
					{ name: "铖昌科技", code: "001270", logic: "星载相控阵T/R芯片龙头" },
				] },
				{ category: "火箭发射与配套材料", stocks: [
					{ name: "航天电子", code: "600879", logic: "火箭测控系统绝对主力" },
					{ name: "九丰能源", code: "605090", logic: "商业航天特种发射气体/燃料供应" },
					{ name: "斯瑞新材", code: "688102", logic: "商业火箭发动机推力室核心材料" },
					{ name: "航天环宇", code: "688523", logic: "星载天线与航空航天复合材料" },
				] },
			],
		},
		{
			id: "aero_terminal",
			title: "地面设备与卫星应用",
			tag: "景气度：中高",
			tagColor: "orange",
			desc: "手机直连卫星成为高端消费电子标配，北斗导航与遥感应用在低空经济、自动驾驶等领域全面开花。",
			targets: [
				{ category: "地面终端与核心网", stocks: [
					{ name: "震有科技", code: "688418", logic: "卫星核心网与星载核心网系统" },
					{ name: "华力创通", code: "300045", logic: "手机直连卫星通信基带芯片龙头" },
					{ name: "海格通信", code: "002465", logic: "军民两用卫通终端核心供应商" },
				] },
				{ category: "导航遥感与数据运营", stocks: [
					{ name: "华测导航", code: "300627", logic: "高精度卫星导航设备龙头" },
					{ name: "航天宏图", code: "688066", logic: "国内卫星遥感软件与数据运营龙头" },
					{ name: "中科星图", code: "688568", logic: "数字地球与遥感云计算平台" },
				] },
			],
		},
	];

	// ================== 量子经济 产业链数据 ==================
	const quantumChainOverview = [
		{
			title: "量子计算 (算力突围)",
			icon: <ShareAltOutlined style={{ color: "#531dab", fontSize: 24 }} />,
			color: "#531dab",
			desc: "后摩尔时代的算力颠覆者。主要涵盖超导、光量子、离子阱等技术路线的量子计算机整机研发及稀释制冷机等设备。",
			items: ["量子计算机整机", "稀释制冷机/微波测控", "量子控制操作系统", "量子计算云平台"],
		},
		{
			title: "量子通信 (绝对安全)",
			icon: <LockOutlined style={{ color: "#006d75", fontSize: 24 }} />,
			color: "#006d75",
			desc: "基于物理学基本原理的无条件安全通信，已在政务、金融、国防等高度安全敏感领域实现商业化落地。",
			items: ["量子密钥分发(QKD)", "量子保密通信网络", "量子随机数发生器", "安全加密终端服务"],
		},
		{
			title: "量子测量 (极限感知)",
			icon: <AimOutlined style={{ color: "#ad8b00", fontSize: 24 }} />,
			color: "#ad8b00",
			desc: "利用量子态对环境异常敏感的特性，实现对物理量（重力、磁场等）的超高精度测量，应用于军工与前沿科研。",
			items: ["冷原子干涉仪", "量子磁力计/雷达", "超导极微弱信号测量", "国防与地质勘探应用"],
		},
	];

	const quantumSubModules = [
		{
			id: "quantum_comm",
			title: "量子通信与网络建设",
			tag: "景气度：高 (落地期)",
			tagColor: "green",
			desc: "量子通信是目前量子科技中商业化进程最快的领域，京沪干线等国家级骨干网建设与扩容带动了全产业链设备需求。",
			targets: [
				{ category: "量子通信核心设备", stocks: [
					{ name: "国盾量子", code: "688027", logic: "国内量子通信与计算绝对龙头" },
					{ name: "光迅科技", code: "002281", logic: "量子密钥分发核心光器件/光模块" },
					{ name: "神州信息", code: "000555", logic: "承建多条量子保密通信骨干网" },
					{ name: "浙江东方", code: "600120", logic: "参股神州量子等核心企业" },
				] },
				{ category: "量子安全与信息应用", stocks: [
					{ name: "吉大正元", code: "003029", logic: "抗量子密码算法与密码安全龙头" },
					{ name: "格尔软件", code: "603232", logic: "商用密码与量子密码技术应用" },
					{ name: "科华数据", code: "002335", logic: "量子安全数据中心解决方案" },
				] },
			],
		},
		{
			id: "quantum_compute",
			title: "量子计算与测量前沿",
			tag: "景气度：中 (爆发前夜)",
			tagColor: "blue",
			desc: "量子计算处于NISQ(含噪声中等规模量子)时代，正从实验室走向初级商业化；量子测量在军工及高精尖仪器领域率先应用。",
			targets: [
				{ category: "量子计算与软件生态", stocks: [
					{ name: "科大国创", code: "300520", logic: "参股国仪量子，布局量子计算软件" },
					{ name: "中科曙光", code: "603019", logic: "联合本源量子开发量子计算云平台" },
					{ name: "国科微", code: "300672", logic: "参股投资前沿量子计算芯片技术" },
				] },
				{ category: "量子测量与科研设备", stocks: [
					{ name: "普源精电", code: "688337", logic: "高端电子测量仪器支持量子研究" },
					{ name: "皖能电力", code: "000543", logic: "产业基金深度投资量子前沿领域" },
					{ name: "天奥电子", code: "002935", logic: "原子钟龙头，涉足量子时间频率测量" },
				] },
			],
		},
	];

	// ================== 通用渲染函数 ==================
	const renderContent = (overviewData: any[], subModulesData: any[]) => (
		<Space direction="vertical" style={{ width: "100%" }} size="large">
			{/* 1. 产业全景架构 */}
			<div>
				<Title level={4} style={{ marginBottom: 16 }}>产业全景架构</Title>
				<Row gutter={[16, 16]}>
					{overviewData.map((item, idx) => (
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
									renderItem={(li: any) => (
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
					{subModulesData.map(module => (
						<Card key={module.id} style={{ borderRadius: 12 }} styles={{ body: { padding: "20px" } }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
								<Title level={5} style={{ margin: 0 }}>{module.title}</Title>
								<Tag color={module.tagColor} style={{ margin: 0 }}>{module.tag}</Tag>
							</div>
							<Paragraph type="secondary" style={{ marginBottom: 20 }}>{module.desc}</Paragraph>

							<Row gutter={[16, 16]}>
								{module.targets.map((cat: any, cIdx: number) => (
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
												renderItem={(stock: any) => (
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
			children: renderContent(aiChainOverview, aiSubModules),
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
			children: renderContent(aerospaceChainOverview, aerospaceSubModules),
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
			children: renderContent(quantumChainOverview, quantumSubModules),
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
