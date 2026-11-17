import { validateGroupName } from './Group'

describe('그룹 이름 검사', () => {
  it('빈 이름과 30자를 넘는 이름은 막는다', () => {
    expect(validateGroupName('')).not.toBeNull()
    expect(validateGroupName('가'.repeat(31))).not.toBeNull()
    expect(validateGroupName('밥친구들')).toBeNull()
  })
})
