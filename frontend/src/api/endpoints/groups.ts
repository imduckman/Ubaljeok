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

export async function joinGroup({ inviteCode }: JoinGroupRequest): Promise<Group> {
  if (USE_MOCK_API) return mockServer.joinGroup({ inviteCode })
  const { group } = await request<{ group: GroupDetail }>('/groups/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  })
  return toGroup(group)
}
