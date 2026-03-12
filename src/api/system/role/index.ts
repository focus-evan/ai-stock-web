import type { RoleItemType } from "./types";
import { request } from "#src/utils/request";

export * from "./types";

/* 获取角色列表 */
export function fetchRoleList(data: any) {
	return request.get<ApiListResponse<RoleItemType>>("system/role-list", { searchParams: data, ignoreLoading: true }).json();
}

/* 新增角色 */
export function fetchAddRoleItem(data: RoleItemType) {
	return request.post<ApiResponse<string>>("system/role-item", { json: data, ignoreLoading: true }).json();
}

/* 修改角色 */
export function fetchUpdateRoleItem(data: RoleItemType) {
	return request.put<ApiResponse<string>>("system/role-item", { json: data, ignoreLoading: true }).json();
}

/* 删除角色 */
export function fetchDeleteRoleItem(id: number) {
	return request.delete<ApiResponse<string>>("system/role-item", { json: id, ignoreLoading: true }).json();
}

/* 获取菜单 */
export function fetchRoleMenu() {
	return request.get<ApiResponse<RoleItemType[]>>("system/role-menu", { ignoreLoading: true }).json();
}

/* 角色绑定的菜单 id */
export function fetchMenuByRoleId(data: { id: number }) {
	return request.get<ApiResponse<string[]>>("system/menu-by-role-id", { searchParams: data, ignoreLoading: false }).json();
}
