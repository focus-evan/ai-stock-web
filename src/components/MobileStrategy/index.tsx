import { ReloadOutlined } from "@ant-design/icons";
import {
	Badge,
	Button,
	Empty,
	Skeleton,
	Space,
	Tag,
	Typography,
} from "antd";
import React from "react";

const { Text } = Typography;

// ===== 通用工具函数 =====

export function fmtPrice(v: any): string {
	if (!v && v !== 0)
		return "-";
	if (typeof v === "number")
		return `¥${v.toFixed(2)}`;
	return String(v);
}

export function fmtAmount(val: number): string {
	if (!val)
		return "-";
	if (val >= 1e12)
		return `${(val / 1e12).toFixed(2)}万亿`;
	if (val >= 1e8)
		return `${(val / 1e8).toFixed(2)}亿`;
	if (val >= 1e4)
		return `${(val / 1e4).toFixed(2)}万`;
	return val.toFixed(2);
}

export function getLevelStyle(level: string): { border: string, bg: string, tag: string } {
	switch (level) {
		case "强烈推荐": return { border: "#ff4d4f", bg: "#fff1f0", tag: "red" };
		case "推荐": return { border: "#ff7a00", bg: "#fff7e6", tag: "orange" };
		case "关注": return { border: "#1677ff", bg: "#e6f4ff", tag: "blue" };
		case "回避": return { border: "#d9d9d9", bg: "#fafafa", tag: "default" };
		default: return { border: "#1677ff", bg: "#e6f4ff", tag: "blue" };
	}
}

// ===== 移动端通用 Loading Skeleton =====
export function MobilePageSkeleton() {
	return (
		<div style={{ padding: "12px 16px" }}>
			<Skeleton active paragraph={{ rows: 3 }} />
			<div style={{ marginTop: 16 }}>
				{[1, 2, 3].map(i => (
					<div key={i} style={{ marginBottom: 12, borderRadius: 12, overflow: "hidden", background: "#fff", padding: "12px 16px" }}>
						<Skeleton active paragraph={{ rows: 2 }} />
					</div>
				))}
			</div>
		</div>
	);
}

// ===== 移动端通用页面头部 =====
interface MobilePageHeaderProps {
	icon: React.ReactNode
	title: string
	subtitle?: string
	date?: string
	count?: number
	refreshing: boolean
	refreshSeconds?: number
	onRefresh: () => void
}

export function MobilePageHeader({
	icon,
	title,
	subtitle,
	date,
	count,
	refreshing,
	refreshSeconds = 0,
	onRefresh,
}: MobilePageHeaderProps) {
	return (
		<div style={{
			background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
			padding: "16px",
			paddingTop: "env(safe-area-inset-top, 16px)",
		}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
				<div>
					<Space size={8} align="center">
						<span style={{ fontSize: 22 }}>{icon}</span>
						<Text strong style={{ fontSize: 18, color: "#fff" }}>{title}</Text>
						{count !== undefined && (
							<Badge
								count={count}
								style={{ backgroundColor: "#ff4d4f" }}
								overflowCount={99}
							/>
						)}
					</Space>
					{subtitle && (
						<Text style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", display: "block", marginTop: 4, marginLeft: 30 }}>
							{subtitle}
						</Text>
					)}
					{date && (
						<Tag
							color="geekblue"
							style={{ marginTop: 8, marginLeft: 30, fontSize: 12 }}
						>
							📅
							{" "}
							{date}
						</Tag>
					)}
				</div>
				<Button
					type="primary"
					ghost
					size="small"
					icon={<ReloadOutlined spin={refreshing} />}
					loading={refreshing}
					onClick={onRefresh}
					style={{ fontSize: 12, borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}
				>
					{refreshing ? `${refreshSeconds}s...` : "刷新"}
				</Button>
			</div>
		</div>
	);
}

// ===== 推荐等级 Badge =====
interface LevelBadgeProps {
	level: string
}

export function LevelBadge({ level }: LevelBadgeProps) {
	const { tag } = getLevelStyle(level);
	return (
		<Tag color={tag} style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>
			{level}
		</Tag>
	);
}

// ===== 涨跌幅显示 =====
interface ChangePctProps {
	value: number
	prefix?: string
}

export function ChangePct({ value, prefix = "" }: ChangePctProps) {
	const isUp = value >= 0;
	return (
		<Text style={{ color: isUp ? "#ff4d4f" : "#52c41a", fontWeight: 700, fontSize: 16 }}>
			{prefix}
			{isUp ? "+" : ""}
			{value.toFixed(2)}
			%
		</Text>
	);
}

// ===== 单个股票移动端卡片 =====
interface MobileStockCardProps {
	stock: any
	extraContent?: React.ReactNode
}

export function MobileStockCard({ stock, extraContent }: MobileStockCardProps) {
	const code = stock.code || stock.stock_code || stock.symbol || "";
	const name = stock.name || stock.stock_name || "未知";
	const changePct: number = stock.change_pct ?? 0;
	const bp = stock.suggested_buy_price || stock.buy_price_range || "";
	const sp = stock.suggested_sell_price || stock.target_price || "";
	const sl = stock.stop_loss_price || "";
	const advice = stock.operation_advice || stock.operation_suggestion || stock.llm_operation || "";
	const reason = stock.buy_reason || stock.llm_reason || (stock.reasons || []).join("；") || "";
	const level: string = stock.recommendation_level || "";
	const ls = getLevelStyle(level);

	return (
		<div style={{
			borderRadius: 14,
			border: `1.5px solid ${ls.border}`,
			background: "#fff",
			marginBottom: 12,
			overflow: "hidden",
		}}
		>
			{/* 卡片头部 */}
			<div style={{
				background: ls.bg,
				padding: "12px 14px 10px",
				borderBottom: `1px solid ${ls.border}33`,
			}}
			>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<div>
						<Text strong style={{ fontSize: 17, color: "#1a1a1a" }}>{name}</Text>
						<Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{code}</Text>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						{level && <LevelBadge level={level} />}
						{changePct !== 0 && <ChangePct value={changePct} prefix="涨" />}
					</div>
				</div>
				{/* 特殊标签 */}
				<div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
					{stock.in_main_theme && <Tag color="volcano" style={{ fontSize: 11, margin: 0 }}>🔥 主线</Tag>}
					{stock.limit_up_days > 0 && (
						<Tag
							color={stock.limit_up_days >= 3 ? "red" : "orange"}
							style={{ fontSize: 11, margin: 0, fontWeight: 700 }}
						>
							{stock.limit_up_days}
							连板
						</Tag>
					)}
					{stock.score !== undefined && (
						<Tag color="purple" style={{ fontSize: 11, margin: 0 }}>
							评分
							{typeof stock.score === "number" ? stock.score.toFixed(1) : stock.score}
						</Tag>
					)}
					{stock.first_limit_time && (
						<Tag color="green" style={{ fontSize: 11, margin: 0 }}>
							⏰
							{stock.first_limit_time}
							封板
						</Tag>
					)}
				</div>
			</div>

			{/* 价格区 */}
			{(bp || sp || sl) && (
				<div style={{
					padding: "10px 14px",
					display: "flex",
					gap: 8,
					flexWrap: "wrap",
					borderBottom: "1px solid #f0f0f0",
				}}
				>
					{bp && (
						<div style={{ textAlign: "center", flex: 1, minWidth: 70 }}>
							<Text style={{ fontSize: 11, color: "#8c8c8c", display: "block" }}>买入价</Text>
							<Text style={{ fontSize: 15, fontWeight: 700, color: "#389e0d" }}>{fmtPrice(bp)}</Text>
						</div>
					)}
					{sp && (
						<div style={{ textAlign: "center", flex: 1, minWidth: 70 }}>
							<Text style={{ fontSize: 11, color: "#8c8c8c", display: "block" }}>目标价</Text>
							<Text style={{ fontSize: 15, fontWeight: 700, color: "#cf1322" }}>{fmtPrice(sp)}</Text>
						</div>
					)}
					{sl && (
						<div style={{ textAlign: "center", flex: 1, minWidth: 70 }}>
							<Text style={{ fontSize: 11, color: "#8c8c8c", display: "block" }}>止损价</Text>
							<Text style={{ fontSize: 15, fontWeight: 700, color: "#8c8c8c" }}>{fmtPrice(sl)}</Text>
						</div>
					)}
				</div>
			)}

			{/* 推荐理由 */}
			{reason && (
				<div style={{ padding: "10px 14px", borderBottom: advice ? "1px solid #f0f0f0" : undefined }}>
					<Text style={{ fontSize: 12, color: "#595959", lineHeight: "18px", display: "block" }}>
						💡
						{" "}
						{reason}
					</Text>
				</div>
			)}

			{/* 操作建议 */}
			{advice && (
				<div style={{
					padding: "10px 14px",
					background: "linear-gradient(90deg, #eef2ff 0%, #e0e7ff 100%)",
				}}
				>
					<Text style={{ fontSize: 12, color: "#4338ca", lineHeight: "18px", display: "block" }}>
						📋
						{" "}
						{advice}
					</Text>
				</div>
			)}

			{/* 额外内容（各策略定制） */}
			{extraContent && (
				<div style={{ padding: "10px 14px" }}>
					{extraContent}
				</div>
			)}
		</div>
	);
}

// ===== 移动端统计数字行 =====
interface MobileStatItem {
	label: string
	value: string | number
	color?: string
}

interface MobileStatRowProps {
	items: MobileStatItem[]
}

export function MobileStatRow({ items }: MobileStatRowProps) {
	return (
		<div style={{
			display: "flex",
			background: "#fff",
			borderRadius: 12,
			padding: "12px 0",
			margin: "0 16px 12px",
			boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
		}}
		>
			{items.map((item, i) => (
				<div
					key={i}
					style={{
						flex: 1,
						textAlign: "center",
						borderRight: i < items.length - 1 ? "1px solid #f0f0f0" : undefined,
					}}
				>
					<Text style={{ fontSize: 20, fontWeight: 700, color: item.color || "#1677ff", display: "block", lineHeight: 1.2 }}>
						{item.value}
					</Text>
					<Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: "block" }}>
						{item.label}
					</Text>
				</div>
			))}
		</div>
	);
}

// ===== 移动端提示 Alert 区 =====
interface MobileAlertBannerProps {
	type: "success" | "warning" | "error" | "info"
	message: string
	description?: string
}

export function MobileAlertBanner({ type, message, description }: MobileAlertBannerProps) {
	const colors: Record<string, { bg: string, border: string, text: string }> = {
		success: { bg: "#f6ffed", border: "#b7eb8f", text: "#389e0d" },
		warning: { bg: "#fffbe6", border: "#ffe58f", text: "#d48806" },
		error: { bg: "#fff1f0", border: "#ffa39e", text: "#cf1322" },
		info: { bg: "#e6f7ff", border: "#91d5ff", text: "#096dd9" },
	};
	const c = colors[type] || colors.info;
	return (
		<div style={{
			margin: "0 16px 12px",
			padding: "10px 14px",
			background: c.bg,
			border: `1px solid ${c.border}`,
			borderRadius: 10,
		}}
		>
			<Text strong style={{ color: c.text, display: "block", fontSize: 13 }}>{message}</Text>
			{description && (
				<Text style={{ color: c.text, fontSize: 12, marginTop: 4, display: "block", opacity: 0.8 }}>
					{description}
				</Text>
			)}
		</div>
	);
}

// ===== 空状态 =====
export function MobileEmpty({ description }: { description?: string }) {
	return (
		<div style={{ padding: "60px 20px", textAlign: "center" }}>
			<Empty description={description || "暂无数据"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
		</div>
	);
}

// ===== 通用数据加载容器 =====
interface MobileStrategyContainerProps {
	loading: boolean
	children: React.ReactNode
}

export function MobileStrategyContainer({ loading, children }: MobileStrategyContainerProps) {
	return (
		<div style={{
			minHeight: "100vh",
			background: "#f5f7fa",
			overflowY: "auto",
			WebkitOverflowScrolling: "touch",
		}}
		>
			{loading
				? <MobilePageSkeleton />
				: children}
		</div>
	);
}

// ===== 通用信息行显示（key-value） =====
interface MobileInfoRowProps {
	label: string
	value: React.ReactNode
}

export function MobileInfoRow({ label, value }: MobileInfoRowProps) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
			<Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
			<div style={{ maxWidth: "65%", textAlign: "right" }}>{value}</div>
		</div>
	);
}

// ===== 卡片内Section标题 =====
export function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<div style={{
			display: "flex",
			alignItems: "center",
			margin: "8px 16px 8px",
		}}
		>
			<div style={{ width: 3, height: 14, background: "#1677ff", borderRadius: 2, marginRight: 8 }} />
			<Text strong style={{ fontSize: 13, color: "#262626" }}>{children}</Text>
		</div>
	);
}

// ===== 分割线 =====
export function MobileDivider({ label }: { label?: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", margin: "8px 16px 8px", gap: 8 }}>
			<div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />
			{label && <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>{label}</Text>}
			<div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />
		</div>
	);
}
