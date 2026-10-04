import type { MenuItemType } from "#src/layout/layout-menu/types";

import { CloseOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { clsx } from "clsx";
import { cloneElement, isValidElement } from "react";
import { useTranslation } from "react-i18next";

interface SearchPanelProps {
	menuItem: MenuItemType
	setActiveKey: (activeKey: string) => void
	enter: (isLink?: boolean) => void
	removeHistoryItem: (key: string) => void
	active: boolean
	showCloseButton: boolean
}

export function SearchPanel({ menuItem, active, enter, setActiveKey, showCloseButton, removeHistoryItem }: SearchPanelProps) {
	const { t } = useTranslation();

	const isExternalLink = isValidElement(menuItem?.label);

	function handleMouseEnter(key: string) {
		setActiveKey(key);
	}

	return (
		<>
			<li
				data-search-item={menuItem.key}
				role="button"
				tabIndex={0}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						event.stopPropagation();
						enter(isExternalLink);
					}
				}}
				onMouseEnter={() => {
					handleMouseEnter(menuItem.key);
				}}
				onClick={() => enter(isExternalLink)}
				className={clsx(
					"flex flex-col bg-colorBgLayout cursor-pointer px-4 py-4 rounded-md mb-2",
					active ? "text-colorBgContainer" : "text-colorText",
					{ "bg-primaryActive": active },
				)}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						{menuItem.icon && <div className="mr-3">{menuItem.icon}</div>}
						<span>{isValidElement(menuItem?.label) ? cloneElement(menuItem.label, {}, t(menuItem.label.props.children)) : t(`${menuItem?.label}`)}</span>
					</div>
					<div className="flex items-center gap-2">
						<div className="opacity-50">{menuItem.key}</div>
						<Button
							aria-label="删除这条搜索历史"
							className={clsx(
								{ hidden: !showCloseButton },
								active ? "text-colorBgContainer!" : "text-colorText!",
							)}
							size="small"
							ghost={false}
							type="text"
							shape="circle"
							icon={<CloseOutlined />}
							onClick={(e) => {
								e.stopPropagation();
								removeHistoryItem(menuItem.key);
							}}
						/>
					</div>
				</div>
			</li>
		</>
	);
}
