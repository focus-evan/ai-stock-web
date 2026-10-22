import type { UnwindPortfolioRisk } from "#src/api/strategy/unwind-extra";
import { fetchUnwindPortfolioRisk, saveUnwindPortfolioRisk } from "#src/api/strategy/unwind-extra";
import { Alert, Button, Form, InputNumber, message, Modal } from "antd";
import { useState } from "react";

const fields: [keyof UnwindPortfolioRisk, string, boolean][] = [
	["net_assets", "今日账户净资产（人民币）", false],
	["available_cash", "今日可用现金（包含滚动资金池）", false],
	["cash_floor", "必须保留的现金", false],
	["total_add_budget", "累计补仓总预算（包含已登记补仓）", false],
	["max_single_weight_pct", "单股最高仓位", true],
	["max_group_weight_pct", "同产业链最高仓位", true],
	["stress_drop_pct", "新增仓位压力测试跌幅", true],
	["max_stress_loss_pct", "新增资金累计压力损失上限／净资产", true],
];

export default function PortfolioRisk({ onSaved }: { onSaved: () => void }) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form] = Form.useForm<UnwindPortfolioRisk>();
	const show = async () => {
		try {
			const { data } = await fetchUnwindPortfolioRisk();
			form.setFieldsValue(data);
			setOpen(true);
		}
		catch { message.error("读取组合资金失败"); }
	};
	const save = async () => {
		try {
			const values = await form.validateFields();
			setSaving(true);
			await saveUnwindPortfolioRisk(values);
			setOpen(false);
			message.success("今日资金已确认，请刷新全部持仓统一分配预算");
			onSaved();
		}
		catch (error: any) {
			if (!error?.errorFields) {
				const body = await error?.response?.clone().json().catch(() => null);
				message.error(typeof body?.detail === "string" ? body.detail : "保存失败，请核对资金数值");
			}
		}
		finally { setSaving(false); }
	};
	return (
		<>
			<Button onClick={show}>组合资金与风险上限</Button>
			<Modal open={open} title="确认今日组合资金" onCancel={() => setOpen(false)} onOk={save} confirmLoading={saving} okText="确认今日资金">
				<Alert type="info" showIcon message="补仓预算默认关闭，每个交易日重新确认资金后生效" description="请先补齐已发生的成交，再确认券商当前余额。请确保自选持仓覆盖账户全部股票，并给各股设置产业链分组。缺行情、未分组或混合港币持仓时暂停补仓；本功能不读取券商余额。" style={{ marginBottom: 16 }} />
				<Form form={form} layout="vertical">
					{fields.map(([name, label, percent]) => (
						<Form.Item key={name} name={name} label={label} rules={[{ required: true, message: "请填写数值" }]}>
							<InputNumber min={percent ? 0.01 : 0} max={percent ? 100 : 1e12} precision={2} addonAfter={percent ? "%" : "元"} style={{ width: "100%" }} />
						</Form.Item>
					))}
				</Form>
			</Modal>
		</>
	);
}
