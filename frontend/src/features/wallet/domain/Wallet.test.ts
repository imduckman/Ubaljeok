import { describe, expect, it } from 'vitest'
import { describeSettlement, formatCoinChange, isFirstVisitReward } from './Wallet'

describe('지갑 정산 문구', () => {
  it('늘어나면 +, 줄어들면 −로 보여준다', () => {
    expect(formatCoinChange(100)).toBe('+100')
    expect(formatCoinChange(-30)).toBe('−30')
    expect(formatCoinChange(0)).toBe('0')
  })

  it('첫 방문과 다시 방문 보상을 구분한다', () => {
    expect(describeSettlement({ reward: 100, tollPaid: 0, balance: 440 }, '매탄1동')).toEqual([
      { title: '+100 코인', description: '매탄1동 첫 방문으로 받았어요' },
    ])
    expect(describeSettlement({ reward: 10, tollPaid: 0, balance: 350 }, '매탄1동')[0].description).toBe(
      '매탄1동에 다시 와서 받았어요',
    )
  })

  it('통행료를 냈으면 알림을 하나 더 만든다', () => {
    const notices = describeSettlement({ reward: 100, tollPaid: 30, balance: 410 }, '행궁동')
    expect(notices).toHaveLength(2)
    expect(notices[1]).toEqual({ title: '−30 코인', description: '행궁동 랜드마크 통행료를 냈어요' })
  })

  it('정산 결과가 없거나 0이면 알림이 없다', () => {
    expect(describeSettlement(undefined, '행궁동')).toEqual([])
    expect(describeSettlement({ reward: 0, tollPaid: 0, balance: 340 }, '행궁동')).toEqual([])
  })

  it('보상이 100 이상일 때만 큰 코인 카드를 띄운다', () => {
    expect(isFirstVisitReward({ reward: 100, tollPaid: 0, balance: 440 })).toBe(true)
    expect(isFirstVisitReward({ reward: 10, tollPaid: 0, balance: 350 })).toBe(false)
    expect(isFirstVisitReward(undefined)).toBe(false)
  })
})
