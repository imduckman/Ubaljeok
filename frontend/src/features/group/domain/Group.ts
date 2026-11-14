export type GroupRole = 'OWNER' | 'MEMBER'

export interface GroupMember {
  userId: number
  nickname: string
  role: GroupRole
}

export interface Group {
  groupId: number
  name: string
  inviteCode: string
  members: GroupMember[]
  walletBalance: number
  visitedRegionCount: number
  createdAt: string
}

export interface CreateGroupRequest {
  name: string
}

export interface JoinGroupRequest {
  inviteCode: string
}

export const MAX_GROUP_MEMBERS = 6
export const INVITE_CODE_LENGTH = 6
export const GROUP_NAME_MAX_LENGTH = 12

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return '그룹 이름을 입력하세요.'
  if (trimmed.length > GROUP_NAME_MAX_LENGTH) return `그룹 이름은 ${GROUP_NAME_MAX_LENGTH}자까지 쓸 수 있어요.`
  return null
}

export function getOwner(group: Group): GroupMember | undefined {
  return group.members.find((member) => member.role === 'OWNER')
}
