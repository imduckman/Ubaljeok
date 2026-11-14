export const LOGIN_ID_PATTERN = /^[a-z0-9_]{4,20}$/
export const PASSWORD_MIN_LENGTH = 8
export const NICKNAME_MAX_LENGTH = 10

export function validateLoginId(loginId: string): string | null {
  if (!loginId) return '아이디를 입력하세요.'
  if (!LOGIN_ID_PATTERN.test(loginId)) return '영문 소문자, 숫자, _로 4–20자를 입력하세요.'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return '비밀번호를 입력하세요.'
  if (password.length < PASSWORD_MIN_LENGTH) return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이에요.`
  return null
}

export function validateNickname(nickname: string): string | null {
  const trimmed = nickname.trim()
  if (!trimmed) return '닉네임을 입력하세요.'
  if (trimmed.length > NICKNAME_MAX_LENGTH) return `닉네임은 ${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요.`
  return null
}
