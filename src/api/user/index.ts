import type { AppRouteRecordRaw } from "#src/router/types";
import type { AuthType, LoginInfo, UserInfoType } from "./types";

import { request } from "#src/utils/request";

export * from "./types";

export function fetchLogin(data: LoginInfo) {
	return request
		.post("system/login", { json: data })
		.json<ApiResponse<AuthType>>();
}

export function fetchLogout() {
	return request.post("system/logout").json();
}

export function fetchAsyncRoutes() {
	return request.get("get-async-routes").json<ApiResponse<AppRouteRecordRaw[]>>();
}

export function fetchUserInfo() {
	return request.get("system/user-info").json<ApiResponse<UserInfoType>>();
}

export interface RefreshTokenResult {
	token: string
	refreshToken: string
}

export function fetchRefreshToken(data: { readonly refreshToken: string }) {
	return request.post("system/refresh-token", { json: data }).json<ApiResponse<RefreshTokenResult>>();
}

export interface ChangePasswordData {
	current_password: string
	new_password: string
	confirm_password: string
}

export function fetchChangePassword(data: ChangePasswordData) {
	return request.post("system/change-password", { json: data }).json<ApiResponse<any>>();
}

export function fetchResetUserPassword(userId: number, newPassword: string) {
	return request.post(`system/user-item/${userId}/reset-password`, { searchParams: { new_password: newPassword } }).json<ApiResponse<any>>();
}
