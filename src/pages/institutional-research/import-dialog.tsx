import type { ResearchReport } from "#src/api/institutional-research";
import { importInstitutionalReport } from "#src/api/institutional-research";
import { Alert, App, Checkbox, Form, Input, InputNumber, Modal, Select } from "antd";
import { useEffect, useState } from "react";

export function ImportDialog({ open, sources, draft, onClose, onSaved }: { open: boolean, sources: { id: string, name: string }[], draft?: ResearchReport | null, onClose: () => void, onSaved: () => void }) {
	const [form] = Form.useForm();
	const [saving, setSaving] = useState(false);
	const { message } = App.useApp();
	useEffect(() => {
		if (!open)
			return;
		form.resetFields();
		if (draft) {
			form.setFieldsValue({ ...draft.payload, institution: draft.institution, published_at: new Date(new Date(draft.published_at).getTime() + 8 * 3600000).toISOString().slice(0, 16), report_key: `${draft.payload.report_key} · 核验版`, supersedes: draft.id, time_precision: "date", verified: false });
		}
	}, [open, draft, form]);
	async function save() {
		try {
			const values = await form.validateFields();
			setSaving(true);
			await importInstitutionalReport({
				...values,
				published_at: `${values.published_at}:00+08:00`,
				target_price: values.target_price || null,
				target_basis_date: values.target_basis_date || null,
				target_deadline: values.target_deadline || null,
				supersedes: values.supersedes || null,
				impacts: draft?.payload.impacts || [],
			});
			message.success("已保存原始观点，下次运行时检验历史表现");
			form.resetFields();
			onSaved();
			onClose();
		}
		catch (error) {
			if (!(error && typeof error === "object" && "errorFields" in error))
				message.error("导入失败：请检查报告是否重复、时间及目标价口径是否完整");
		}
		finally { setSaving(false); }
	}
	return (
		<Modal title="录入历史研报" open={open} onCancel={onClose} onOk={save} confirmLoading={saving} width={720} okText="保存原始观点">
			<Alert type="info" showIcon message="保存后保留原始版本；修订稿使用新的报告编号。确认原始观点、日期和标的后才能计入统计。" style={{ marginBottom: 16 }} />
			<Form form={form} layout="vertical" initialValues={{ institution: "morgan_stanley", scope: "stock", direction: "uncertain", evidence_level: "reprint", time_precision: "date", benchmark: "sh000300", verified: false }}>
				<Form.Item name="institution" label="发布机构" rules={[{ required: true }]}><Select options={sources.map(s => ({ value: s.id, label: s.name }))} /></Form.Item>
				<Form.Item name="report_key" label="原始报告编号或原始标题＋日期（同一报告转载共用）" rules={[{ required: true, min: 3 }]}><Input /></Form.Item>
				<Form.Item name="title" label="报告标题" rules={[{ required: true, min: 3 }]}><Input /></Form.Item>
				<Form.Item name="source_url" label="来源链接" rules={[{ required: true, type: "url" }]}><Input /></Form.Item>
				<Form.Item name="published_at" label="首次发布时间（北京时间，仅知日期可填 00:00）" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
				<Form.Item name="time_precision" label="时间依据"><Select options={[{ value: "minute", label: "已核对具体时刻" }, { value: "date", label: "仅有日期，下一交易日开盘起算" }, { value: "unknown", label: "仅知转载时间，不计命中率" }]} /></Form.Item>
				<Form.Item name="evidence_level" label="证据类型"><Select options={[{ value: "original", label: "原始研报" }, { value: "reprint", label: "可追溯转载" }, { value: "summary", label: "摘要线索" }]} /></Form.Item>
				<Form.Item name="content" label="原文或转载正文" rules={[{ required: true, min: 20 }]}><Input.TextArea rows={5} maxLength={80000} /></Form.Item>
				<Form.Item name="summary" label="当时观点与验证条件" rules={[{ required: true, min: 5 }]}><Input.TextArea rows={2} /></Form.Item>
				<Form.Item name="scope" label="研究范围"><Select options={[{ value: "stock", label: "个股" }, { value: "sector", label: "板块（代表股不计板块命中率）" }, { value: "market", label: "A股大盘" }]} /></Form.Item>
				<Form.Item name="evaluation_symbol" label="检验标的代码（如 sz300502 / sh000300）" rules={[{ required: true, pattern: /^(sh|sz|bj)\d{6}$/ }]}><Input /></Form.Item>
				<Form.Item name="direction" label="原始方向"><Select options={[{ value: "bullish", label: "看多" }, { value: "bearish", label: "看空" }, { value: "mixed", label: "分化" }, { value: "uncertain", label: "不明确" }]} /></Form.Item>
				<Form.Item name="direction_basis" label="评级口径" initialValue="absolute"><Select options={[{ value: "absolute", label: "绝对涨跌方向" }, { value: "relative", label: "相对对照指数表现（如跑赢大盘）" }]} /></Form.Item>
				<Form.Item name="benchmark" label="对照指数"><Select options={[{ value: "sh000300", label: "沪深300" }, { value: "sh000001", label: "上证指数" }, { value: "sz399006", label: "创业板指" }]} /></Form.Item>
				<Form.Item name="rating" label="原始评级（可空）"><Input /></Form.Item>
				<Form.Item name="target_price" label="原始目标价（可空）"><InputNumber min={0.001} /></Form.Item>
				<Form.Item name="target_basis_date" label="目标价股本口径日期（填目标价时必填）"><Input type="date" /></Form.Item>
				<Form.Item name="target_deadline" label="目标截止日期（填目标价时必填）"><Input type="date" /></Form.Item>
				<Form.Item name="supersedes" label="修订前报告 ID（可空）"><Input /></Form.Item>
				<Form.Item name="verified" valuePropName="checked"><Checkbox>已逐项核对原始观点、时间、证券和目标价口径</Checkbox></Form.Item>
			</Form>
		</Modal>
	);
}
