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
  walletBalance?: number
  visitedRegionCount?: number
  createdAt?: string
}

export interface CreateGroupRequest {
  name: string
}

export interface JoinGroupRequest {
  inviteCode: string
}

export const MAX_GROUP_MEMBERS = 6
export const INVITE_CODE_LENGTH = 6
export const GROUP_NAME_MAX_LENGTH = 30

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return '그룹 이름을 입력하세요.'
  if (trimmed.length > GROUP_NAME_MAX_LENGTH) return `그룹 이름은 ${GROUP_NAME_MAX_LENGTH}자까지 쓸 수 있어요.`
  return null
}

export function getOwner(group: Group): GroupMember | undefined {
  return group.members.find((member) => member.role === 'OWNER')
}

export function isGroupOwner(group: Group, userId: number | undefined): boolean {
  return getOwner(group)?.userId === userId
}

/** 그룹장이 나가면 남은 멤버 중 가장 먼저 들어온 사람이 그룹장이 된다. members는 들어온 순서다. */
export function getNextOwner(group: Group, leavingUserId: number): GroupMember | undefined {
  return group.members.find((member) => member.userId !== leavingUserId)
}

/**
 * 멤버 한 명이 나간 뒤의 그룹. 아무도 안 남으면 null(그룹 삭제).
 * 그룹장이 나가면 가장 먼저 들어온 멤버에게 그룹장을 넘긴다.
 */
export function removeMember(group: Group, leavingUserId: number): Group | null {
  const leavingMember = group.members.find((member) => member.userId === leavingUserId)
  const remaining = group.members.filter((member) => member.userId !== leavingUserId)
  if (remaining.length === 0) return null
  if (leavingMember?.role !== 'OWNER') return { ...group, members: remaining }
  const [nextOwner, ...others] = remaining
  return { ...group, members: [{ ...nextOwner, role: 'OWNER' }, ...others] }
}
