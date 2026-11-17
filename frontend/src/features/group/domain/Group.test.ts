import { getNextOwner, removeMember, validateGroupName, type Group } from './Group'

describe('그룹 이름 검사', () => {
  it('빈 이름과 30자를 넘는 이름은 막는다', () => {
    expect(validateGroupName('')).not.toBeNull()
    expect(validateGroupName('가'.repeat(31))).not.toBeNull()
    expect(validateGroupName('밥친구들')).toBeNull()
  })
})

const group: Group = {
  groupId: 1,
  name: '밥친구들',
  inviteCode: 'WK7Q2M',
  members: [
    { userId: 1, nickname: '승제', role: 'OWNER' },
    { userId: 2, nickname: '윤하', role: 'MEMBER' },
    { userId: 3, nickname: '희재', role: 'MEMBER' },
  ],
}

describe('그룹 나가기', () => {
  it('멤버가 나가면 그 멤버만 빠진다', () => {
    const next = removeMember(group, 3)
    expect(next?.members.map((member) => member.nickname)).toEqual(['승제', '윤하'])
    expect(next?.members[0].role).toBe('OWNER')
  })

  it('그룹장이 나가면 가장 먼저 들어온 멤버가 그룹장이 된다', () => {
    expect(getNextOwner(group, 1)?.nickname).toBe('윤하')
    const next = removeMember(group, 1)
    expect(next?.members).toEqual([
      { userId: 2, nickname: '윤하', role: 'OWNER' },
      { userId: 3, nickname: '희재', role: 'MEMBER' },
    ])
  })

  it('혼자 남은 그룹에서 나가면 그룹이 없어진다', () => {
    const alone: Group = { ...group, members: [group.members[0]] }
    expect(removeMember(alone, 1)).toBeNull()
  })
})
