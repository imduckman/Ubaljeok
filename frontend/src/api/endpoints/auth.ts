import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import type { LoginRequest, SignupRequest, User } from '../../features/auth/domain/User'

export function login(body: LoginRequest): Promise<User> {
  if (USE_MOCK_API) return mockServer.login(body)
  return request<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export function signup(body: SignupRequest): Promise<User> {
  if (USE_MOCK_API) return mockServer.signup(body)
  return request<User>('/auth/signup', { method: 'POST', body: JSON.stringify(body) })
}

export function logout(): Promise<void> {
  if (USE_MOCK_API) return mockServer.logout()
  return request<void>('/auth/logout', { method: 'POST' })
}

/** 로그인 상태면 사용자, 아니면 null */
export async function getMe(): Promise<User | null> {
  if (USE_MOCK_API) return mockServer.getMe()
  try {
    return await request<User>('/auth/me')
  } catch {
    return null
  }
}
