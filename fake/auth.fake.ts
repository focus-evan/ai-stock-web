import { defineFakeRoute } from "vite-plugin-fake-server/client";

import { COUNTRIES_CODE } from "./constants";
import { resultSuccess } from "./utils";

// login / logout / refresh-token 已迁移到真实后端 API (system_endpoints.py)
// 只保留不冲突的路由

export default defineFakeRoute([
	{
		url: "/country-calling-codes",
		timeout: 1000,
		method: "get",
		response: () => {
			return resultSuccess(COUNTRIES_CODE);
		},
	},
]);
