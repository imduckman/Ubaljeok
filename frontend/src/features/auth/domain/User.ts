export interface User {
  userId: number
  loginId: string
  nickname: string
}

export interface LoginRequest {
  loginId: string
  password: string
}

export interface SignupRequest {
  nickname: string
  loginId: string
  password: string
}
