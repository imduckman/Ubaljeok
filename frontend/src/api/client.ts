import { ApiError } from '../shared/types/api'

const API_BASE_URL = '/api'

/** true면 백엔드 없이 브라우저 안의 가짜 API(api/mock)를 사용한다. .env에서 VITE_USE_MOCK=false로 끈다. */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK !== 'false'

interface ErrorBody {
  error?: { code?: string; message?: string } | null
  detail?: string
}

/**
 * 모든 실제 API 호출은 이 함수를 거친다.
 * 인증은 서버 세션 + HttpOnly 쿠키 방식이라 credentials: 'include'로 쿠키를 함께 보낸다.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody
    const message = body.error?.message ?? body.detail ?? '요청을 처리하지 못했어요.'
    throw new ApiError(response.status, body.error?.code ?? 'UNKNOWN', message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
