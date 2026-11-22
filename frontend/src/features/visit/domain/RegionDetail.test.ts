import { describe, expect, it } from 'vitest'
import { formatVisitDate, visiblePhotos, type RegionPhoto } from './RegionDetail'

const photo = (id: number): RegionPhoto => ({ id, takenAt: null, fileUrl: `/api/photos/${id}/file` })

describe('동네 상세', () => {
  it('방문 날짜를 "11월 16일"로 보여준다', () => {
    expect(formatVisitDate('2026-11-16')).toBe('11월 16일')
    expect(formatVisitDate('2026-01-03')).toBe('1월 3일')
  })

  it('사진이 8장 이하면 모두 보여준다', () => {
    expect(visiblePhotos([1, 2, 3].map(photo))).toEqual({ shown: [1, 2, 3].map(photo), moreCount: 0 })
  })

  it('사진이 8장보다 많으면 8칸만 보이고 마지막 칸에 나머지 장수를 붙인다', () => {
    const result = visiblePhotos(Array.from({ length: 12 }, (_, index) => photo(index + 1)))
    expect(result.shown).toHaveLength(8)
    // 8번째 칸이 "+5"로 덮이므로 보이는 사진은 7장, 나머지는 5장
    expect(result.moreCount).toBe(5)
  })
})
