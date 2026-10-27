import type { UnwindRiskReview } from "#src/api/strategy";
import { fetchUnwindRiskReview, saveUnwindRiskReview } from "#src/api/strategy";
import { Alert, Button, Form, Input, message, Modal, Select, Space } from "antd";
import { useState } from "react";

export default function RiskReview({ watchlistId }: { watchlistId: number }) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [form] = Form.useForm<UnwindRiskReview>();
	const load = async () => {
		setLoading(true);
		try {
			const response = await fetchUnwindRiskReview(watchlistId);
			form.setFieldsValue(response.data || { announcement: "unknown", fundamental: "unknown", sector: "unknown", evidence: "" });
			setOpen(true);
		}
		catch { message.error("风险核验读取失败，请重试"); }
		finally { setLoading(false); }
	};
	const save = async () => {
		try {
			const value = await form.validateFields();
			setLoading(true);
			await saveUnwindRiskReview(watchlistId, value);
			message.success("今日风险核验已保存，下一轮后台检查生效");
			setOpen(false);
		}
		catch (error) {
			if (!(error && typeof error === "object" && "errorFields" in error))
				message.error("保存失败，原核验状态未改变");
		}
		finally { setLoading(false); }
	};
	return (
		<>
			<Button loading={loading} onClick={() => void load()}>补充风险信息（可选）</Button>
			<Modal title="公告、基本面与板块风险核验" open={open} onCancel={() => setOpen(false)} onOk={() => void save()} confirmLoading={loading} okText="保存今日核验">
				<Space direction="vertical" style={{ width: "100%" }}>
					<Alert type="info" showIcon message="基本面与当天情绪由系统自动评估，无需填写此表。你补充的明确风险会暂停本轮操作，当天有效。" />
					<Form form={form} layout="vertical" style={{ width: "100%" }}>
						{([["announcement", "最新公告与交易风险"], ["fundamental", "基本面与持仓逻辑"], ["sector", "板块退潮与市场风险"]] as const).map(([name, label]) => <Form.Item key={name} name={name} label={label} rules={[{ required: true }]}><Select options={[{ value: "unknown", label: "尚未核验" }, { value: "clear", label: "已核验，未发现阻断风险" }, { value: "blocked", label: "存在风险，暂停本轮" }]} /></Form.Item>)}
						<Form.Item name="evidence" label="核验依据、来源与时间" rules={[{ required: true, min: 10, message: "请填写至少10字的具体核验依据" }]}><Input.TextArea rows={4} maxLength={2000} placeholder="注明公告日期及链接、财报或持仓逻辑依据、板块观察时间；不能仅填无风险" /></Form.Item>
					</Form>
				</Space>
			</Modal>
		</>
	);
}
