import { Tooltip, Typography } from "antd";

const { Text } = Typography;

interface CompanyBasicInfoProps {
	summary?: string
	mainBusiness?: string
	businessTrack?: string
	maxWidth?: number | string
}

export function CompanyBasicInfo({
	summary,
	mainBusiness,
	businessTrack,
	maxWidth = "100%",
}: CompanyBasicInfoProps) {
	const text = summary || (
		mainBusiness || businessTrack
			? `主营业务：${mainBusiness || "待补充"}；所属赛道：${businessTrack || "待补充"}`
			: ""
	);

	if (!text)
		return null;

	return (
		<Tooltip title={text}>
			<Text
				type="secondary"
				style={{
					display: "block",
					maxWidth,
					fontSize: 11,
					lineHeight: "18px",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				{text}
			</Text>
		</Tooltip>
	);
}
