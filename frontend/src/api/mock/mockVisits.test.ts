import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('Mock 방문 집계', () => {
  it('방문 기록이 없으면 빈 목록을 반환한다', async () => {
    const { getMockVisitMap } = await import('./mockVisits')
    expect(getMockVisitMap(1).regions).toEqual([])
  })

  it('같은 그룹·날짜·동네는 방문 한 번으로 집계한다', async () => {
    const { recordMockVisit, getMockVisitMap } = await import('./mockVisits')
    const first = recordMockVisit(1, '4111156000', '2026-11-22', false)
    const second = recordMockVisit(1, '4111156000', '2026-11-22', false)

    expect(first.isNewVisit).toBe(true)
    expect(second.isNewVisit).toBe(false)
    expect(second.id).toBe(first.id)
    expect(getMockVisitMap(1).regions).toEqual([
      { regionCode: '4111156000', visitCount: 1, level: 1 },
    ])
  })

  it('다른 날짜는 별도 방문이며 다른 그룹의 기록은 섞이지 않는다', async () => {
    const { recordMockVisit, getMockVisitMap } = await import('./mockVisits')
    recordMockVisit(1, '4111156000', '2026-11-21', true)
    recordMockVisit(1, '4111156000', '2026-11-22', true)
    recordMockVisit(2, '4111156000', '2026-11-22', true)

    expect(getMockVisitMap(1).regions[0].visitCount).toBe(2)
    expect(getMockVisitMap(2).regions[0].visitCount).toBe(1)
  })

  it('수동 방문에 유효한 사진이 추가되면 자격을 유지하며 전환한다', async () => {
    const { recordMockVisit, getMockVisitMap } = await import('./mockVisits')
    const first = recordMockVisit(1, '4111156000', '2026-11-22', false)
    const upgraded = recordMockVisit(1, '4111156000', '2026-11-22', true)
    const manual = recordMockVisit(1, '4111156000', '2026-11-22', false)

    expect(upgraded.id).toBe(first.id)
    expect(upgraded.rewardEligible).toBe(true)
    expect(upgraded.isNewVisit).toBe(false)
    expect(manual.rewardEligible).toBe(true)
    expect(getMockVisitMap(1).regions[0].visitCount).toBe(1)
  })

  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 3],
    [5, 4],
    [9, 4],
    [10, 5],
    [11, 5],
  ])('방문 %i회는 단계 %i로 반환한다', async (count, level) => {
    const { recordMockVisit, getMockVisitMap } = await import('./mockVisits')

    for (let day = 1; day <= count; day++) {
      const date = `2026-11-${String(day).padStart(2, '0')}`
      recordMockVisit(1, '4111156000', date, true)
    }

    expect(getMockVisitMap(1).regions).toEqual([
      { regionCode: '4111156000', visitCount: count, level },
    ])
  })
})
