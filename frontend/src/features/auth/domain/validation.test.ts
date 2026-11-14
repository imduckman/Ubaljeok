import { validateLoginId, validateNickname, validatePassword } from './validation'

describe('회원가입 입력 검사', () => {
  it('아이디는 영문 소문자, 숫자로 4–30자만 허용한다', () => {
    expect(validateLoginId('footprint22')).toBeNull()
    expect(validateLoginId('footprint_22')).not.toBeNull()
    expect(validateLoginId('abc')).not.toBeNull()
    expect(validateLoginId('Footprint')).not.toBeNull()
    expect(validateLoginId('')).not.toBeNull()
  })

  it('비밀번호는 8자 이상이어야 한다', () => {
    expect(validatePassword('12345678')).toBeNull()
    expect(validatePassword('1234567')).not.toBeNull()
  })

  it('닉네임은 공백만으로 만들 수 없다', () => {
    expect(validateNickname('   ')).not.toBeNull()
    expect(validateNickname('승제')).toBeNull()
  })
})
