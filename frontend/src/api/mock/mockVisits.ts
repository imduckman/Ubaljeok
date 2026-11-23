import type { VisitMapResponse } from '../endpoints/visits'
import type { RegionDetail, RegionOwnership, RegionPhoto, RegionVisit } from '../../features/visit/domain/RegionDetail'
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
 * - 소유 상태는 주인 없음 / 우리 건물 / 우리 랜드마크 / 다른 그룹이 골고루 나온다
 * 방문·사진은 메모리에서 관리하며 새로고침하면 초기화된다.
 */

const NETWORK_DELAY_MS = 400

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
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

  async getRegionOwnership(groupId: number, regionCode: string): Promise<RegionOwnership> {
    await delay(150)
    // 방문하지 않은 동네는 우리 땅일 수 없다
    const isVisited = [...visits.values()].some((visit) => visit.groupId === groupId && visit.regionCode === regionCode)
    switch (hash(`${groupId}:${regionCode}:owner`) % 4) {
      case 1:
        return isVisited ? { status: 'ours', level: 'building' } : { status: 'unowned' }
      case 2:
        return isVisited ? { status: 'ours', level: 'landmark' } : { status: 'unowned' }
      case 3:
        return { status: 'theirs', ownerGroupName: '과동기 탐험대', level: hash(regionCode) % 2 ? 'landmark' : 'building' }
      default:
        return { status: 'unowned' }
    }
  },
}
