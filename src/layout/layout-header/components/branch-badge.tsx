import { getBranchInfo } from "#src/api/system";
import { BranchesOutlined } from "@ant-design/icons";
import { Tag, Tooltip } from "antd";
import { useEffect, useState } from "react";

interface BranchData {
	branch: string
	database: string
	scheduler_enabled: boolean
	api_port: number
}

/**
 * 分支标识徽章 — 显示在顶部栏，区分 main / dev 部署环境
 */
export function BranchBadge() {
	const [info, setInfo] = useState<BranchData | null>(null);

	useEffect(() => {
		getBranchInfo()
			.then((res) => {
				if (res?.data) {
					setInfo(res.data);
				}
			})
			.catch(() => {
				// ignore — API not available
			});
	}, []);

	if (!info)
		return null;

	const isMain = info.branch === "main";
	const color = isMain ? "blue" : "green";
	const label = isMain ? "MAIN" : "DEV";

	return (
		<Tooltip
			title={(
				<div>
					<div>
						分支:
						{info.branch}
					</div>
					<div>
						数据库:
						{info.database}
					</div>
					<div>
						调度器:
						{info.scheduler_enabled ? "运行中" : "已停用"}
					</div>
					<div>
						API端口:
						{info.api_port}
					</div>
				</div>
			)}
		>
			<Tag
				icon={<BranchesOutlined />}
				color={color}
				style={{
					marginRight: 8,
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: 1,
					cursor: "pointer",
					borderRadius: 4,
				}}
			>
				{label}
			</Tag>
		</Tooltip>
	);
}
