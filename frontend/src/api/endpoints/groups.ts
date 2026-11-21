import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../../features/group/domain/Group'

interface GroupDetail {
  id: number
  name: string
  inviteCode: string
  members: { userId: number; nickname: string; role: 'owner' | 'member' }[]
}

function toGroup(group: GroupDetail): Group {
  return {
    groupId: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    members: group.members.map(({ userId, nickname, role }) => ({
      userId: userId,
      nickname,
      role: role === 'owner' ? 'OWNER' : 'MEMBER',
    })),
  }
}

export async function listMyGroups(): Promise<Group[]> {
  if (USE_MOCK_API) return mockServer.listMyGroups()
  const { groups } = await request<{ groups: GroupDetail[] }>('/groups')
  return groups.map(toGroup)
}

export async function createGroup(body: CreateGroupRequest): Promise<Group> {
  if (USE_MOCK_API) return mockServer.createGroup(body)
  const { group } = await request<{ group: GroupDetail }>('/groups', { method: 'POST', body: JSON.stringify(body) })
  return toGroup(group)
}

/** 그룹 나가기. 혼자 남은 그룹이면 서버가 그룹을 삭제한다. */
export async function leaveGroup(groupId: number): Promise<void> {
  if (USE_MOCK_API) return mockServer.leaveGroup(groupId)
  await request<void>(`/groups/${groupId}/members/me`, { method: 'DELETE' })
}

/** 그룹 삭제. 그룹장만 할 수 있다. */
export async function deleteGroup(groupId: number): Promise<void> {
  if (USE_MOCK_API) return mockServer.deleteGroup(groupId)
  await request<void>(`/groups/${groupId}`, { method: 'DELETE' })
}

export async function joinGroup({ inviteCode }: JoinGroupRequest): Promise<Group> {
  if (USE_MOCK_API) return mockServer.joinGroup({ inviteCode })
  const { group } = await request<{ group: GroupDetail }>('/groups/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
  return toGroup(group)
}
