import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../../features/group/domain/Group'

export function listMyGroups(): Promise<Group[]> {
  if (USE_MOCK_API) return mockServer.listMyGroups()
  return request<Group[]>('/groups')
}

export function createGroup(body: CreateGroupRequest): Promise<Group> {
  if (USE_MOCK_API) return mockServer.createGroup(body)
  return request<Group>('/groups', { method: 'POST', body: JSON.stringify(body) })
}

export function joinGroup(body: JoinGroupRequest): Promise<Group> {
  if (USE_MOCK_API) return mockServer.joinGroup(body)
  return request<Group>('/groups/join', { method: 'POST', body: JSON.stringify(body) })
}
