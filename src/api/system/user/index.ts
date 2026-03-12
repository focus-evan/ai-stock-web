import type { UserItemType } from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/* 获取用户列表 */
export function fetchUserList(data: any) {
	return request.get<ApiListResponse<UserItemType>>("system/user-list", { searchParams: data, ignoreLoading: true }).json();
}

/* 新增用户 */
export function fetchAddUserItem(data: Partial<UserItemType>) {
	return request.post<ApiResponse<string>>("system/user-item", { json: data, ignoreLoading: true }).json();
}

/* 修改用户 */
export function fetchUpdateUserItem(data: Partial<UserItemType>) {
	return request.put<ApiResponse<string>>("system/user-item", { json: data, ignoreLoading: true }).json();
}

/* 删除用户 */
export function fetchDeleteUserItem(id: number) {
	return request.delete<ApiResponse<string>>("system/user-item", { json: id, ignoreLoading: true }).json();
}
