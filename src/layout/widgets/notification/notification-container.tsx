import type { ButtonProps } from "antd";
import type { NotificationItem } from "./types";

import { useEffect, useState } from "react";
import { NotificationPopup } from "./index";

export function NotificationContainer({ ...restProps }: ButtonProps) {
	const [notifications, _setNotifications] = useState<NotificationItem[]>([]);

	useEffect(() => {
		// TODO: 后端暂未实现 notifications 接口，暂不请求
		// fetchNotifications().then((res) => {
		// 	setNotifications(
		// 		Array.from({ length: 20 }).flatMap(() => res.result),
		// 	);
		// });
	}, []);

	return (
		<NotificationPopup
			notifications={notifications}
			{...restProps}
		/>
	);
}
