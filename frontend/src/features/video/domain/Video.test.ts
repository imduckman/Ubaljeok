import { isFinished, pollDelayMs, statusText, stepOf, validateSelection } from './Video'

describe('validateSelection', () => {
  it('3장보다 적으면 몇 장 더 골라야 하는지 알려준다', () => {
    expect(validateSelection([1], 1)).toBe('사진을 2장 더 골라주세요')
  })

  it('5장보다 많으면 막는다', () => {
    expect(validateSelection([1, 2, 3, 4, 5, 6], 1)).toBe('사진은 5장까지 고를 수 있어요')
  })

  it('대표 사진이 고른 사진 안에 있어야 한다', () => {
    expect(validateSelection([1, 2, 3], null)).toBe('대표 사진을 골라주세요')
    expect(validateSelection([1, 2, 3], 9)).toBe('대표 사진을 골라주세요')
    expect(validateSelection([1, 2, 3], 2)).toBeNull()
  })
})

describe('작업 상태', () => {
  it('진행 단계는 queued 1, generating 2, editing 3이고 끝나면 없다', () => {
    expect(stepOf('queued')).toBe(1)
    expect(stepOf('generating')).toBe(2)
    expect(stepOf('editing')).toBe(3)
    expect(stepOf('completed')).toBeNull()
    expect(stepOf('failed')).toBeNull()
  })

  it('완료와 실패만 끝난 상태다', () => {
    expect(isFinished('completed')).toBe(true)
    expect(isFinished('failed')).toBe(true)
    expect(isFinished('editing')).toBe(false)
  })

  it('UI-STATES 문구를 쓴다', () => {
    expect(statusText('queued')).toBe('차례를 기다리는 중이에요')
    expect(statusText('generating')).toBe('대표 사진을 영상으로 만드는 중이에요')
  })

  it('처음 1분은 3초, 그 뒤로 10초마다 조회한다', () => {
    expect(pollDelayMs(0)).toBe(3_000)
    expect(pollDelayMs(59_999)).toBe(3_000)
    expect(pollDelayMs(60_000)).toBe(10_000)
  })
})
