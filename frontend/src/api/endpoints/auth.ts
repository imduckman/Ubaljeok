import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import { ApiError } from '../../shared/types/api'
import type { LoginRequest, SignupRequest, User } from '../../features/auth/domain/User'

interface UserResponse {
  user: { id: number; loginId: string; nickname: string }
}

function toUser({ user }: UserResponse): User {
  return { userId: user.id, loginId: user.loginId, nickname: user.nickname }
}

export async function login({ loginId, password }: LoginRequest): Promise<User> {
  if (USE_MOCK_API) return mockServer.login({ loginId, password })
  return toUser(await request<UserResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password }),
  }))
}

export async function signup({ loginId, password, nickname }: SignupRequest): Promise<User> {
  if (USE_MOCK_API) return mockServer.signup({ loginId, password, nickname })
  await request<UserResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ loginId, password, nickname }),
  })
  return login({ loginId, password })
}

export function logout(): Promise<void> {
  if (USE_MOCK_API) return mockServer.logout()
  return request<void>('/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<User | null> {
  if (USE_MOCK_API) return mockServer.getMe()
  try {
    return toUser(await request<UserResponse>('/auth/me'))
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
