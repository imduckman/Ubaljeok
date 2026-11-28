import type { VisitMapResponse } from '../endpoints/visits'
import type { RegionDetail, RegionPhoto, RegionVisit } from '../../features/visit/domain/RegionDetail'
import { loadMockRegions } from './mockRegions'

type MockVisit = {
  id: number
  groupId: number
  regionCode: string
  visitDate: string
  rewardEligible: boolean
  photos: RegionPhoto[]
}

const visits = new Map<string, MockVisit>()
let nextVisitId = 70

export function recordMockVisit(
  groupId: number,
  regionCode: string,
  visitDate: string,
  rewardEligible: boolean,
  photo?: RegionPhoto,
) {
  const key = `${groupId}:${visitDate}:${regionCode}`
  const existing = visits.get(key)

  if (existing) {
    existing.rewardEligible ||= rewardEligible
    if (photo) existing.photos.push({ ...photo })
    return { id: existing.id, rewardEligible: existing.rewardEligible, isNewVisit: false }
  }

  const visit = { id: nextVisitId++, groupId, regionCode, visitDate, rewardEligible, photos: photo ? [{ ...photo }] : [] }
  visits.set(key, visit)
  return { id: visit.id, rewardEligible: visit.rewardEligible, isNewVisit: true }
}

/** 구매 조건: 이 그룹이 이 동네에 코인을 받을 수 있는(보상 대상) 방문을 했는지 */
export function hasEligibleMockVisit(groupId: number, regionCode: string): boolean {
  return [...visits.values()].some(
    (visit) => visit.groupId === groupId && visit.regionCode === regionCode && visit.rewardEligible,
  )
}

function visitLevel(count: number): 1 | 2 | 3 | 4 | 5 {
  if (count >= 10) return 5
  if (count >= 5) return 4
  if (count >= 3) return 3
  if (count >= 2) return 2
  return 1
}

export function getMockVisitMap(groupId: number): VisitMapResponse {
  const counts = new Map<string, number>()

  for (const visit of visits.values()) {
    if (visit.groupId !== groupId) continue
    counts.set(visit.regionCode, (counts.get(visit.regionCode) ?? 0) + 1)
  }

  return {
    groupId,
    dataVersion: 'ver20261001',
    regions: Array.from(counts, ([regionCode, visitCount]) => ({
      regionCode,
      visitCount,
      level: visitLevel(visitCount),
    })),
  }
}

/**
 * 지도와 동네 상세가 업로드로 기록한 같은 방문·사진을 조회한다.
 * 소유 정보는 mockProperties.ts에서 따로 관리한다.
 * 방문·사진은 메모리에서 관리하며 새로고침하면 초기화된다.
 */

const NETWORK_DELAY_MS = 400

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockVisitServer = {
  async getRegionDetail(groupId: number, regionCode: string, signal?: AbortSignal): Promise<RegionDetail> {
    await delay()
    signal?.throwIfAborted()
    const regions = await loadMockRegions()
    signal?.throwIfAborted()
    const name = regions.find((region) => region.regionCode === regionCode)?.name ?? '이 동네'
    const regionVisits: RegionVisit[] = [...visits.values()]
      .filter((visit) => visit.groupId === groupId && visit.regionCode === regionCode)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate) || b.id - a.id)
      .map((visit) => ({
        id: visit.id,
        visitDate: visit.visitDate,
        rewardEligible: visit.rewardEligible,
        photos: visit.photos.map((photo) => ({ ...photo })),
      }))
    return { region: { regionCode, name }, visitCount: regionVisits.length, visits: regionVisits }
  },
}
