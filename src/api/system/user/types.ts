export interface UserItemType {
	id: number
	username: string
	nickname: string
	email: string
	phone: string
	avatar: string
	status: 1 | 0
	roleCodes: string
	remark: string
	createTime: number
	updateTime: number
	password?: string // 仅创建/修改密码时传
}
