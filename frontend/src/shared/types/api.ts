/** 모든 API 실패를 같은 모양으로 다루기 위한 오류 타입 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getErrorMessage(error: unknown, fallback = '잠시 후 다시 시도해 주세요.'): string {
  if (error instanceof ApiError) return error.message
  return fallback
}
