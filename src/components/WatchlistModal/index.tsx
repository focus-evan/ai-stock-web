import type { WatchlistAddPayload } from "#src/api/strategy";
import { addToWatchlist } from "#src/api/strategy";
import { StarOutlined } from "@ant-design/icons";
import {
	Form,
	Input,
	InputNumber,
	message,
	Modal,
	Tag,
	Typography,
} from "antd";
import React, { useEffect, useState } from "react";

const { Text } = Typography;

interface Props {
	open: boolean
	onClose: () => void
	onSuccess?: () => void
	stockCode: string
	stockName: string
	strategies?: string[]
	strategyNames?: string[]
	overlapCount?: number
	suggestedBuyPrice?: number
	sourceDate?: string
	sourceSession?: string
}

const WatchlistModal: React.FC<Props> = ({
	open,
	onClose,
	onSuccess,
	stockCode,
	stockName,
	strategies = [],
	strategyNames = [],
	overlapCount = 1,
	suggestedBuyPrice,
	sourceDate = "",
	sourceSession = "",
}) => {
	const [form] = Form.useForm();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) {
			form.setFieldsValue({
				buy_price: suggestedBuyPrice || undefined,
				buy_shares: undefined,
				note: "",
			});
		}
	}, [open, suggestedBuyPrice, form]);

	const buyPrice = Form.useWatch("buy_price", form);
	const buyShares = Form.useWatch("buy_shares", form);
	const totalCost
		= buyPrice && buyShares ? (buyPrice * buyShares).toFixed(2) : "—";

	const handleSubmit = async () => {
		try {
			const values = await form.validateFields();
			setLoading(true);
			const payload: WatchlistAddPayload = {
				stock_code: stockCode,
				stock_name: stockName,
				buy_price: values.buy_price,
				buy_shares: values.buy_shares,
				strategies,
				strategy_names: strategyNames,
				overlap_count: overlapCount,
				source_date: sourceDate,
				source_session: sourceSession,
				note: values.note || "",
			};
			const resp = await addToWatchlist(payload);
			if (resp.status === "success") {
				message.success(resp.message || `${stockName} 已加入自选`);
				onClose();
				onSuccess?.();
			}
			else {
				message.error("加入自选失败");
			}
		}
		catch (e: any) {
			if (e?.errorFields)
				return; // validation error
			message.error("加入自选失败");
		}
		finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			open={open}
			onCancel={onClose}
			onOk={handleSubmit}
			confirmLoading={loading}
			title={(
				<span>
					<StarOutlined style={{ color: "#faad14", marginRight: 8 }} />
					加入自选盯盘
				</span>
			)}
			okText="确认加入"
			cancelText="取消"
			width={440}
			destroyOnClose
		>
			{/* 股票信息 */}
			<div
				style={{
					background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
					borderRadius: 8,
					padding: "12px 16px",
					marginBottom: 16,
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div>
						<Text strong style={{ fontSize: 16 }}>
							{stockName}
						</Text>
						<Text
							type="secondary"
							style={{ fontSize: 12, marginLeft: 8 }}
						>
							{stockCode}
						</Text>
					</div>
					{overlapCount >= 2 && (
						<Tag color="volcano" style={{ fontWeight: 600 }}>
							{overlapCount}
							战法共振
						</Tag>
					)}
				</div>
				{strategyNames.length > 0 && (
					<div
						style={{
							display: "flex",
							gap: 4,
							flexWrap: "wrap",
							marginTop: 8,
						}}
					>
						{strategyNames.map(sn => (
							<Tag
								key={sn}
								color="purple"
								style={{
									margin: 0,
									fontSize: 11,
									borderRadius: 3,
								}}
							>
								{sn}
							</Tag>
						))}
					</div>
				)}
			</div>

			<Form form={form} layout="vertical" size="middle">
				<Form.Item
					name="buy_price"
					label="买入股价（元/股）"
					rules={[
						{ required: true, message: "请输入买入股价" },
						{
							type: "number",
							min: 0.01,
							message: "股价必须大于0",
						},
					]}
				>
					<InputNumber
						style={{ width: "100%" }}
						placeholder="请输入买入时的股价"
						precision={3}
						min={0.01}
						addonAfter="元"
					/>
				</Form.Item>

				<Form.Item
					name="buy_shares"
					label="买入股数"
					rules={[
						{ required: true, message: "请输入买入股数" },
						{
							type: "number",
							min: 100,
							message: "最少100股",
						},
					]}
				>
					<InputNumber
						style={{ width: "100%" }}
						placeholder="请输入买入股数（建议100的整数倍）"
						min={100}
						step={100}
						addonAfter="股"
					/>
				</Form.Item>

				{/* 自动计算总成本 */}
				<div
					style={{
						background: "#fafafa",
						borderRadius: 6,
						padding: "10px 14px",
						marginBottom: 16,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<Text type="secondary">总成本</Text>
					<Text
						strong
						style={{
							fontSize: 18,
							color: "#722ed1",
						}}
					>
						¥
						{totalCost}
					</Text>
				</div>

				<Form.Item name="note" label="备注（可选）">
					<Input.TextArea
						placeholder="可记录买入原因、计划持仓天数等"
						rows={2}
						maxLength={200}
						showCount
					/>
				</Form.Item>
			</Form>

			<div
				style={{
					background: "#fff7e6",
					borderRadius: 6,
					padding: "8px 12px",
					fontSize: 12,
					color: "#d46b08",
					lineHeight: "18px",
				}}
			>
				💡 加入自选后，系统将在交易时间每小时自动根据命中战法生成操作指导
			</div>
		</Modal>
	);
};

export default WatchlistModal;
