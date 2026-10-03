import type { IndustryAnalysisBatch } from "./quant-analysis";
import { BasicContent } from "#src/components/basic-content";
import {
	ApiOutlined,
	AppstoreOutlined,
	BlockOutlined,
	BulbOutlined,
	CheckCircleOutlined,
	ClockCircleOutlined,
	DollarOutlined,
	ExperimentOutlined,
	FireOutlined,
	LineChartOutlined,
	RiseOutlined,
	RobotOutlined,
	RocketOutlined,
	SafetyOutlined,
	StarOutlined,
	TeamOutlined,
	ThunderboltOutlined,
	TrophyOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Badge,
	Card,
	Col,
	Divider,
	Empty,
	Progress,
	Row,
	Space,
	Spin,
	Statistic,
	Tabs,
	Tag,
	Timeline,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";
import QuantAnalysis from "./quant-analysis";
import "#src/pages/home/business.css";

const { Title, Text, Paragraph } = Typography;

// 类型定义
interface TechSpec {
	id: number
	spec_name: string
	spec_value: string
	unit: string
	description: string
	release_year: number
	adoption_rate: number
	status: string
	sort_order: number
}

interface Company {
	id: number
	stock_code: string
	stock_name: string
	company_name: string
	market: string
	market_cap: number
	position: "leader" | "challenger" | "follower" | "niche"
	market_share: number
	strength_score: number
	investment_level: "high" | "medium" | "low"
	key_products: string
	competitive_advantage: string
	logic: string
	spec_name?: string
}

interface Competition {
	id: number
	spec_id?: number
	pattern_type: "monopoly" | "oligopoly" | "competitive" | "fragmented"
	description: string
	key_factors: string
	barriers: string
	trends: string
}

interface Technology {
	id: number
	name: string
	code: string
	description: string
	market_size: number
	growth_rate: number
	maturity: string
	sort_order: number
	specs: TechSpec[]
	companies: Company[]
	competition: Competition[]
}

interface IndustryLayer {
	id: number
	name: string
	code: string
	description: string
	icon: string
	color: string
	sort_order: number
	technologies: Technology[]
}

interface IndustryChain {
	id: number
	name: string
	code: string
	description: string
	layers: IndustryLayer[]
	analysis?: IndustryAnalysisBatch | null
}

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
	ApiOutlined: <ApiOutlined />,
	AppstoreOutlined: <AppstoreOutlined />,
	RocketOutlined: <RocketOutlined />,
	BlockOutlined: <BlockOutlined />,
	NodeIndexOutlined: <ApiOutlined />,
	RobotOutlined: <RobotOutlined />,
	RadarChartOutlined: <LineChartOutlined />,
	LockOutlined: <SafetyOutlined />,
	AimOutlined: <BulbOutlined />,
	ShareAltOutlined: <ThunderboltOutlined />,
	GlobalOutlined: <AppstoreOutlined />,
};

// 状态映射
const statusConfig = {
	research: { text: "研发中", color: "blue", icon: <ExperimentOutlined /> },
	development: { text: "开发中", color: "cyan", icon: <ClockCircleOutlined /> },
	production: { text: "量产中", color: "green", icon: <CheckCircleOutlined /> },
	mass_production: { text: "大规模量产", color: "success", icon: <FireOutlined /> },
	obsolete: { text: "已淘汰", color: "default", icon: <ClockCircleOutlined /> },
};

// 市场地位映射
const positionConfig = {
	leader: { text: "领导者", color: "red", icon: <TrophyOutlined /> },
	challenger: { text: "挑战者", color: "orange", icon: <ThunderboltOutlined /> },
	follower: { text: "跟随者", color: "blue", icon: <TeamOutlined /> },
	niche: { text: "细分市场", color: "purple", icon: <StarOutlined /> },
};

// 竞争格局映射
const patternConfig = {
	monopoly: { text: "垄断", color: "red", desc: "单一企业主导市场" },
	oligopoly: { text: "寡头竞争", color: "orange", desc: "少数企业占据主要份额" },
	competitive: { text: "充分竞争", color: "green", desc: "多家企业激烈竞争" },
	fragmented: { text: "分散竞争", color: "blue", desc: "市场格局未定" },
};

export default function IndustryAnalysis() {
	const [activeTab, setActiveTab] = useState("ai");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [chainData, setChainData] = useState<IndustryChain | null>(null);
	const [chains, setChains] = useState<{ code: string, name: string }[]>([]);

	const fetchIndustryChain = async (chainCode: string, signal: AbortSignal) => {
		setLoading(true);
		setError(null);
		setChainData(null);

		try {
			const response = await fetch(`/api/industry/chains/${encodeURIComponent(chainCode)}`, { signal });
			if (!response.ok)
				throw new Error(`HTTP ${response.status}`);
			const data = await response.json();
			if (signal.aborted)
				return;

			if (data.success) {
				setChainData(data.data);
			}
			else {
				setError("获取数据失败");
			}
		}
		catch (err) {
			if (!signal.aborted)
				setError(`请求失败: ${err}`);
		}
		finally {
			if (!signal.aborted)
				setLoading(false);
		}
	};

	useEffect(() => {
		const controller = new AbortController();
		fetchIndustryChain(activeTab, controller.signal);
		return () => controller.abort();
	}, [activeTab]);

	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/industry/chains", { signal: controller.signal })
			.then(async (response) => {
				if (!response.ok)
					throw new Error(`HTTP ${response.status}`);
				return response.json();
			})
			.then((result) => {
				if (!controller.signal.aborted && result.success)
					setChains(result.data);
			})
			.catch(() => {});
		return () => controller.abort();
	}, []);

	// 渲染技术规格时间线
	const renderSpecsTimeline = (specs: TechSpec[]) => {
		const sortedSpecs = [...specs].sort((a, b) => a.sort_order - b.sort_order);

		return (
			<Timeline
				mode="left"
				items={sortedSpecs.map((spec) => {
					const statusInfo = statusConfig[spec.status as keyof typeof statusConfig] || statusConfig.development;
					return {
						color: statusInfo.color,
						dot: statusInfo.icon,
						label: (
							<Space direction="vertical" size={0}>
								<Text strong style={{ fontSize: 16 }}>{spec.spec_name}</Text>
								{spec.release_year && (
									<Text type="secondary" style={{ fontSize: 12 }}>
										发布:
										{spec.release_year}
										年
									</Text>
								)}
							</Space>
						),
						children: (
							<Card size="small" style={{ background: "#fafafa" }}>
								<Space direction="vertical" style={{ width: "100%" }} size="small">
									<Space wrap>
										<Tag color={statusInfo.color} icon={statusInfo.icon}>
											{statusInfo.text}
										</Tag>
										{spec.spec_value && (
											<Tag color="blue">
												{spec.spec_value}
												{spec.unit}
											</Tag>
										)}
									</Space>
									<div>
										<Text type="secondary" style={{ fontSize: 13 }}>{spec.description}</Text>
									</div>
									<div>
										<Text strong style={{ fontSize: 12 }}>市场采用率</Text>
										<Progress
											percent={spec.adoption_rate}
											size="small"
											strokeColor={{
												"0%": "#108ee9",
												"100%": "#87d068",
											}}
										/>
									</div>
								</Space>
							</Card>
						),
					};
				})}
			/>
		);
	};

	// 渲染竞争格局
	const renderCompetition = (competition: Competition[]) => {
		if (!competition || competition.length === 0)
			return null;

		return (
			<Space direction="vertical" style={{ width: "100%" }} size="middle">
				{competition.map((comp) => {
					const patternInfo = patternConfig[comp.pattern_type];
					return (
						<Card
							key={comp.id}
							size="small"
							style={{
								background: "var(--app-accent-soft)",
								border: "none",
							}}
							styles={{ body: { padding: "16px" } }}
						>
							<Space direction="vertical" style={{ width: "100%" }} size="small">
								<Space>
									<Tag color={patternInfo.color} style={{ fontSize: 14, padding: "4px 12px" }}>
										{patternInfo.text}
									</Tag>
									<Text style={{ color: "var(--app-text)", fontSize: 13 }}>
										{patternInfo.desc}
									</Text>
								</Space>
								<Paragraph style={{ color: "var(--app-text)", margin: 0, fontSize: 13 }}>
									{comp.description}
								</Paragraph>
								{comp.key_factors && (
									<div>
										<Text strong style={{ color: "var(--app-text)", fontSize: 12 }}>关键要素：</Text>
										<Text style={{ color: "var(--app-text)", fontSize: 12 }}>{comp.key_factors}</Text>
									</div>
								)}
								{comp.trends && (
									<div>
										<Text strong style={{ color: "var(--app-text)", fontSize: 12 }}>发展趋势：</Text>
										<Text style={{ color: "var(--app-text)", fontSize: 12 }}>{comp.trends}</Text>
									</div>
								)}
							</Space>
						</Card>
					);
				})}
			</Space>
		);
	};

	// 渲染公司卡片
	const renderCompanyCard = (company: Company) => {
		const posInfo = positionConfig[company.position];

		return (
			<Card
				key={company.id}
				hoverable
				style={{
					height: "100%",
					borderRadius: 12,
					borderTop: `4px solid ${posInfo.color}`,
				}}
				styles={{ body: { padding: "20px" } }}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="middle">
					{/* 公司头部 */}
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
						<Space direction="vertical" size={0}>
							<Space>
								<Text strong style={{ fontSize: 18 }}>{company.stock_name}</Text>
								<Text type="secondary" style={{ fontSize: 14 }}>{company.stock_code}</Text>
							</Space>
							{company.spec_name && (
								<Tag color="blue" style={{ marginTop: 4 }}>
									{company.spec_name}
								</Tag>
							)}
						</Space>
						<Tag color={posInfo.color} icon={posInfo.icon} style={{ fontSize: 13, padding: "4px 12px" }}>
							{posInfo.text}
						</Tag>
					</div>

					{/* 核心指标 */}
					<Row gutter={16}>
						<Col span={12}>
							<Statistic
								title="市场份额"
								value={company.market_share == null ? "待核验" : company.market_share}
								suffix={company.market_share == null ? undefined : "%"}
								valueStyle={{ fontSize: 20, color: "var(--app-accent-text)" }}
							/>
						</Col>
						<Col span={12}>
							<Statistic
								title="实力评分"
								value={company.strength_score == null ? "待核验" : company.strength_score}
								suffix={company.strength_score == null ? undefined : "/ 10"}
								valueStyle={{ fontSize: 20, color: "#52c41a" }}
							/>
						</Col>
					</Row>

					<Divider style={{ margin: "8px 0" }} />

					{/* 核心产品 */}
					{company.key_products && (
						<div>
							<Text strong style={{ fontSize: 13, color: "#666" }}>核心产品</Text>
							<Paragraph style={{ margin: "4px 0 0 0", fontSize: 13 }}>
								{company.key_products}
							</Paragraph>
						</div>
					)}

					{/* 竞争优势 */}
					{company.competitive_advantage && (
						<div>
							<Text strong style={{ fontSize: 13, color: "#666" }}>竞争优势</Text>
							<Paragraph style={{ margin: "4px 0 0 0", fontSize: 13 }}>
								{company.competitive_advantage}
							</Paragraph>
						</div>
					)}

					{/* 投资逻辑 */}
					{company.logic && (
						<div
							style={{
								background: "var(--app-accent-soft)",
								padding: "12px",
								borderRadius: 8,
								borderLeft: "3px solid var(--app-accent)",
							}}
						>
							<Text strong style={{ fontSize: 13, color: "var(--app-accent-text)" }}>💡 投资逻辑</Text>
							<Paragraph style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--app-text)" }}>
								{company.logic}
							</Paragraph>
						</div>
					)}
				</Space>
			</Card>
		);
	};

	// 渲染技术模块
	const renderTechnology = (tech: Technology) => {
		// 按市场地位分组公司
		const groupedCompanies = {
			leader: tech.companies.filter(c => c.position === "leader"),
			challenger: tech.companies.filter(c => c.position === "challenger"),
			follower: tech.companies.filter(c => c.position === "follower"),
			niche: tech.companies.filter(c => c.position === "niche"),
		};

		return (
			<Card
				key={tech.id}
				style={{
					marginBottom: 24,
					borderRadius: 16,
					boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
				}}
				styles={{ body: { padding: "32px" } }}
			>
				<Space direction="vertical" style={{ width: "100%" }} size="large">
					{/* 技术头部 */}
					<div>
						<Space align="start" size="large">
							<div style={{ flex: 1 }}>
								<Title level={3} style={{ margin: 0, marginBottom: 8 }}>
									{tech.name}
								</Title>
								<Paragraph style={{ fontSize: 15, color: "#666", marginBottom: 16 }}>
									{tech.description}
								</Paragraph>
								<Space wrap size="middle">
									{tech.market_size && (
										<Statistic
											title="市场规模"
											value={tech.market_size}
											suffix="亿元"
											prefix={<DollarOutlined />}
											valueStyle={{ fontSize: 24, color: "var(--app-accent-text)" }}
										/>
									)}
									{tech.growth_rate && (
										<Statistic
											title="增长率"
											value={tech.growth_rate}
											suffix="%"
											prefix={<RiseOutlined />}
											valueStyle={{ fontSize: 24, color: "#52c41a" }}
										/>
									)}
									{tech.maturity && (
										<div>
											<Text type="secondary" style={{ fontSize: 12 }}>成熟度</Text>
											<div>
												<Tag color="orange" style={{ fontSize: 14, padding: "4px 12px", marginTop: 4 }}>
													{tech.maturity}
												</Tag>
											</div>
										</div>
									)}
								</Space>
							</div>
						</Space>
					</div>

					{/* 技术规格演进 */}
					{tech.specs && tech.specs.length > 0 && (
						<div>
							<Title level={4} style={{ marginBottom: 16 }}>
								<ThunderboltOutlined style={{ marginRight: 8, color: "var(--app-accent-text)" }} />
								技术规格演进
							</Title>
							{renderSpecsTimeline(tech.specs)}
						</div>
					)}

					{/* 竞争格局 */}
					{tech.competition && tech.competition.length > 0 && (
						<div>
							<Title level={4} style={{ marginBottom: 16 }}>
								<LineChartOutlined style={{ marginRight: 8, color: "#722ed1" }} />
								竞争格局分析
							</Title>
							{renderCompetition(tech.competition)}
						</div>
					)}

					{/* 核心公司 */}
					{tech.companies && tech.companies.length > 0 && (
						<div>
							<Title level={4} style={{ marginBottom: 16 }}>
								<TeamOutlined style={{ marginRight: 8, color: "#52c41a" }} />
								核心公司布局
							</Title>

							{/* 领导者 */}
							{groupedCompanies.leader.length > 0 && (
								<div style={{ marginBottom: 24 }}>
									<Badge.Ribbon text={`领导者 (${groupedCompanies.leader.length})`} color="red">
										<div style={{ paddingTop: 8 }}>
											<Row gutter={[16, 16]}>
												{groupedCompanies.leader.map(company => (
													<Col xs={24} md={12} lg={8} key={company.id}>
														{renderCompanyCard(company)}
													</Col>
												))}
											</Row>
										</div>
									</Badge.Ribbon>
								</div>
							)}

							{/* 挑战者 */}
							{groupedCompanies.challenger.length > 0 && (
								<div style={{ marginBottom: 24 }}>
									<Badge.Ribbon text={`挑战者 (${groupedCompanies.challenger.length})`} color="orange">
										<div style={{ paddingTop: 8 }}>
											<Row gutter={[16, 16]}>
												{groupedCompanies.challenger.map(company => (
													<Col xs={24} md={12} lg={8} key={company.id}>
														{renderCompanyCard(company)}
													</Col>
												))}
											</Row>
										</div>
									</Badge.Ribbon>
								</div>
							)}

							{/* 跟随者和细分市场 */}
							{(groupedCompanies.follower.length > 0 || groupedCompanies.niche.length > 0) && (
								<div>
									<Badge.Ribbon
										text={`其他参与者 (${groupedCompanies.follower.length + groupedCompanies.niche.length})`}
										color="blue"
									>
										<div style={{ paddingTop: 8 }}>
											<Row gutter={[16, 16]}>
												{[...groupedCompanies.follower, ...groupedCompanies.niche].map(company => (
													<Col xs={24} md={12} lg={8} key={company.id}>
														{renderCompanyCard(company)}
													</Col>
												))}
											</Row>
										</div>
									</Badge.Ribbon>
								</div>
							)}
						</div>
					)}
				</Space>
			</Card>
		);
	};

	// 渲染层级内容
	const renderLayerContent = (layer: IndustryLayer) => {
		return (
			<div key={layer.id} style={{ marginBottom: 32 }}>
				<Card
					style={{
						background: `linear-gradient(135deg, ${layer.color}15 0%, ${layer.color}05 100%)`,
						border: `2px solid ${layer.color}30`,
						borderRadius: 16,
						marginBottom: 24,
					}}
					styles={{ body: { padding: "24px" } }}
				>
					<Space align="start" size="large">
						<div
							style={{
								width: 64,
								height: 64,
								borderRadius: 16,
								background: layer.color,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 32,
								color: "#fff",
							}}
						>
							{iconMap[layer.icon] || <AppstoreOutlined />}
						</div>
						<div style={{ flex: 1 }}>
							<Title level={3} style={{ margin: 0, marginBottom: 8, color: layer.color }}>
								{layer.name}
							</Title>
							<Paragraph style={{ fontSize: 15, color: "#666", margin: 0 }}>
								{layer.description}
							</Paragraph>
						</div>
					</Space>
				</Card>

				{layer.technologies && layer.technologies.length > 0
					? (
						layer.technologies.map(tech => renderTechnology(tech))
					)
					: (
						<Empty description="暂无技术数据" />
					)}
			</div>
		);
	};

	const fallbackChains = [
		{ code: "ai", name: "AI产业链" },
		{ code: "aerospace", name: "商业航天" },
		{ code: "quantum", name: "量子经济" },
		{ code: "humanoid_robot", name: "人形机器人" },
	];
	const tabItems = (chains.length ? chains : fallbackChains).map(chain => ({
		key: chain.code,
		label: (
			<span aria-label={chain.name}>
				<Space>
					{chain.code === "humanoid_robot" ? <RobotOutlined aria-hidden /> : <AppstoreOutlined aria-hidden />}
					{chain.name}
				</Space>
			</span>
		),
	}));

	return (
		<BasicContent>
			{/* 页面头部 */}
			<Card
				style={{
					borderRadius: 16,
					marginBottom: 24,
					background: "var(--app-hero)",
					border: "none",
				}}
				styles={{ body: { padding: "32px" } }}
			>
				<div className="business-inline-hero">
					<div>
						<Title level={2} style={{ margin: 0, color: "#fff" }}>
							产业调研与分析
						</Title>
						<Text style={{ fontSize: 16, color: "rgba(255,255,255,0.85)" }}>
							利润池与产业映射 · 季度五维数据验证 · 同行PK与减法
						</Text>
					</div>
					<Tag
						color="gold"
						icon={<AppstoreOutlined />}
						style={{ fontSize: 14, padding: "8px 16px", border: "none" }}
					>
						核心主线跟踪
					</Tag>
				</div>
			</Card>

			{/* Tab 切换 */}
			<div style={{ background: "#fff", padding: "0 24px", borderRadius: 16, marginBottom: 24 }}>
				<Tabs
					activeKey={activeTab}
					onChange={setActiveTab}
					items={tabItems}
					size="large"
				/>
			</div>

			{/* 请求失败和空数据时保留产业切换入口 */}
			{loading
				? <div style={{ textAlign: "center", padding: "60px 0" }}><Spin size="large" /></div>
				: error
					? <Alert type="error" showIcon message="加载失败" description={error} />
					: chainData
						? (
							<>
								<QuantAnalysis key={activeTab} analysis={chainData.analysis} />
								<Alert type="info" showIcon message="产业链研究映射" description="以下静态技术规格、市场份额与实力分保留为历史研究资料，尚未核验当前有效性；不进入本批S量化评分。" style={{ marginBottom: 24 }} />
								{chainData.layers?.length ? chainData.layers.map(layer => renderLayerContent(layer)) : <Empty description="该产业尚无公司映射" />}
							</>
						)
						: <Empty description="暂无数据" />}

		</BasicContent>
	);
}
