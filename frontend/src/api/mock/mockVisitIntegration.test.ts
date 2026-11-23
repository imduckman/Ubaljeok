import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./mockRegions', () => ({ loadMockRegions: async () => [
  { regionCode: '4111156000', name: '파장동', sigunguName: '수원시장안구' },
] }))

beforeEach(() => vi.resetModules())
afterEach(() => vi.useRealTimers())

describe('Mock 업로드·지도·동네 상세 연동', () => {
  it('업로드하지 않은 동네는 지도와 상세 모두 방문 0회다', async () => {
    const { getMockVisitMap, mockVisitServer } = await import('./mockVisits')
    expect(getMockVisitMap(1).regions).toEqual([])
    expect(await mockVisitServer.getRegionDetail(1, '4111156000'))
      .toEqual({ region: { regionCode: '4111156000', name: '파장동' }, visitCount: 0, visits: [] })
  })

  it('같은 날의 사진을 한 방문에 모으고 지도·상세·보상 자격을 함께 갱신한다', async () => {
    const { mockPhotoServer } = await import('./mockPhotos')
    const { getMockVisitMap, mockVisitServer } = await import('./mockVisits')
    const first = await mockPhotoServer.uploadPhoto({
      groupId: 1, regionCode: '4111156000', file: new File(['manual'], 'nogps.jpg', { type: 'image/jpeg' }),
    })
    const second = await mockPhotoServer.uploadPhoto({
      groupId: 1, file: new File(['gps'], 'gps.jpg', { type: 'image/jpeg' }),
    })
    const detail = await mockVisitServer.getRegionDetail(1, '4111156000')
    expect(second.visit.id).toBe(first.visit.id)
    expect(second.visit.isNewVisit).toBe(false)
    expect(getMockVisitMap(1).regions[0].visitCount).toBe(detail.visitCount)
    expect(detail.visitCount).toBe(1)
    expect(detail.visits[0].rewardEligible).toBe(true)
    expect(detail.visits[0].photos.map((photo) => photo.id)).toEqual([first.photo.id, second.photo.id])
    expect(detail.visits[0].photos[0].takenAt).toBeNull()
    expect(detail.visits[0].photos[1].takenAt).toBe(second.photo.takenAt)
    expect(detail.visits[0].photos[0].fileUrl).toMatch(/^data:image\/jpeg;base64,/)
    expect((await mockVisitServer.getRegionDetail(2, '4111156000')).visitCount).toBe(0)
    expect((await mockVisitServer.getRegionDetail(1, '4111155000')).visitCount).toBe(0)
  })

  it('다른 날 올린 사진은 별도 방문으로 집계하고 최신 날짜부터 보여준다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-21T15:30:00Z'))
    const { mockPhotoServer } = await import('./mockPhotos')
    const { getMockVisitMap, mockVisitServer } = await import('./mockVisits')
    await mockPhotoServer.uploadPhoto({ groupId: 1, file: new File(['a'], 'first.jpg', { type: 'image/jpeg' }) })
    vi.setSystemTime(new Date('2026-11-22T15:30:00Z'))
    await mockPhotoServer.uploadPhoto({ groupId: 1, file: new File(['b'], 'second.jpg', { type: 'image/jpeg' }) })
    const detail = await mockVisitServer.getRegionDetail(1, '4111156000')
    expect(detail.visits.map((visit) => visit.visitDate)).toEqual(['2026-11-23', '2026-11-22'])
    expect(detail.visitCount).toBe(2)
    expect(getMockVisitMap(1).regions[0]).toMatchObject({ visitCount: 2, level: 2 })
  })

  it('같은 사진을 동시에 올려도 상세에 한 장만 남긴다', async () => {
    const { mockPhotoServer } = await import('./mockPhotos')
    const { mockVisitServer } = await import('./mockVisits')
    const body = { groupId: 1, file: new File(['photo'], 'same.jpg', { type: 'image/jpeg' }) }
    const results = await Promise.allSettled([mockPhotoServer.uploadPhoto(body), mockPhotoServer.uploadPhoto(body)])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const failed = results.find((result) => result.status === 'rejected')
    expect(failed?.reason.code).toBe('DUPLICATE_PHOTO')
    const detail = await mockVisitServer.getRegionDetail(1, '4111156000')
    expect(detail.visits[0].photos).toHaveLength(1)
  })
})
