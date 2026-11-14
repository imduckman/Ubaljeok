import { validateGroupName } from './Group'

describe('그룹 이름 검사', () => {
  it('빈 이름과 12자를 넘는 이름은 막는다', () => {
    expect(validateGroupName('')).not.toBeNull()
    expect(validateGroupName('가'.repeat(13))).not.toBeNull()
    expect(validateGroupName('밥친구들')).toBeNull()
  })
})
