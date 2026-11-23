/** 동네 상세 (API.md `GET /api/visits/regions/{regionCode}?groupId=`) */
export interface RegionDetail {
  region: { regionCode: string; name: string }
  /** 우리 그룹이 이 동네를 방문한 횟수 (같은 날은 1번) */
  visitCount: number
  /** 최신 날짜부터 */
  visits: RegionVisit[]
}

export interface RegionVisit {
  id: number
  /** YYYY-MM-DD */
  visitDate: string
  rewardEligible: boolean
  photos: RegionPhoto[]
}

export interface RegionPhoto {
  id: number
  takenAt: string | null
  fileUrl: string
}

/**
 * 동네 소유 상태. 지도판은 모든 그룹이 함께 쓰고 동네마다 주인은 한 그룹이다.
 * 소유 정보 API가 생기기 전(3주차)에는 실제 화면에서 늘 'unowned'다.
 */
export type RegionOwnership =
  | { status: 'unowned' }
  | { status: 'ours'; level: 'building' | 'landmark' }
  | { status: 'theirs'; ownerGroupName: string; level: 'building' | 'landmark' }

/** 랜드마크를 지날 때 내는 통행료 상한 (기획: min(잔액, 30)) */
export const MAX_TOLL = 30

/** 한 날짜에 보여줄 사진 칸 수. 넘치면 마지막 칸이 "+N"이 된다. */
export const MAX_PHOTOS_PER_VISIT = 8

/** '2026-11-16' → '11월 16일' */
export function formatVisitDate(visitDate: string): string {
  const [, month, day] = visitDate.split('-').map(Number)
  if (!month || !day) return visitDate
  return `${month}월 ${day}일`
}

/** 사진 칸 목록. 사진이 많으면 마지막 칸에 남은 장수를 붙인다. */
export function visiblePhotos(photos: RegionPhoto[], limit = MAX_PHOTOS_PER_VISIT) {
  if (photos.length <= limit) return { shown: photos, moreCount: 0 }
  return { shown: photos.slice(0, limit), moreCount: photos.length - limit + 1 }
}
