import { afterEach, expect, it, vi } from 'vitest'
import { getMe, login } from './auth'
import { joinGroup, listMyGroups } from './groups'

vi.mock('../client', () => ({
  USE_MOCK_API: false,
  request: vi.fn(),
}))

import { request } from '../client'
import { ApiError } from '../../shared/types/api'

const http = vi.mocked(request)
const group = {
  id: 10, name: '우발적', inviteCode: 'K7Q2M9',
  members: [{ userId: 1, nickname: '승민', role: 'owner' }],
}

afterEach(() => http.mockReset())

it('sends loginId and reads the user envelope', async () => {
  http.mockResolvedValueOnce({ user: { id: 1, loginId: 'demo', nickname: '승민' } })
  await expect(login({ loginId: 'demo', password: 'demo1234' })).resolves.toEqual({
    userId: 1, loginId: 'demo', nickname: '승민',
  })
  expect(http).toHaveBeenCalledWith('/auth/login', {
    method: 'POST', body: JSON.stringify({ loginId: 'demo', password: 'demo1234' }),
  })
})

it('treats only a 401 as a missing session', async () => {
  http.mockRejectedValueOnce(new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.'))
  await expect(getMe()).resolves.toBeNull()
  http.mockRejectedValueOnce(new ApiError(503, 'UNAVAILABLE', '서비스 오류'))
  await expect(getMe()).rejects.toMatchObject({ status: 503 })
})

it('maps members included in the group list', async () => {
  http.mockResolvedValueOnce({ groups: [group] })
  await expect(listMyGroups()).resolves.toEqual([{
    groupId: 10, name: '우발적', inviteCode: 'K7Q2M9',
    members: [{ userId: 1, nickname: '승민', role: 'OWNER' }],
  }])
  expect(http).toHaveBeenCalledTimes(1)
})

it('sends inviteCode and reads the joined group', async () => {
  http.mockResolvedValueOnce({ group })
  await expect(joinGroup({ inviteCode: group.inviteCode })).resolves.toMatchObject({ groupId: 10 })
  expect(http).toHaveBeenNthCalledWith(1, '/groups/join', {
    method: 'POST', body: JSON.stringify({ inviteCode: group.inviteCode }),
  })
})
