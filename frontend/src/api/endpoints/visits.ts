import { request, USE_MOCK_API } from '../client'
import { getMockVisitMap } from '../mock/mockVisits'
import { mockVisitServer } from '../mock/mockVisits'
import { listProperties } from './game'
import { toOwnership } from '../../features/game/domain/Property'
import type { RegionDetail, RegionOwnership } from '../../features/visit/domain/RegionDetail'

export type VisitMapResponse = {
  groupId: number
  dataVersion: string
  regions: {
    regionCode: string
    visitCount: number
    level: 1 | 2 | 3 | 4 | 5
  }[]
}

export async function getVisitMap(
  groupId: number,
  signal: AbortSignal,
): Promise<VisitMapResponse> {
  signal.throwIfAborted()

  if (USE_MOCK_API) {
    return getMockVisitMap(groupId)
  }

  return request<VisitMapResponse>(`/visits/map?groupId=${groupId}`, { signal })
}


/** 동네 상세: 우리 그룹의 방문 횟수와 날짜별 사진 (API.md) */
export async function getRegionDetail(groupId: number, regionCode: string, signal?: AbortSignal): Promise<RegionDetail> {
  if (USE_MOCK_API) return mockVisitServer.getRegionDetail(groupId, regionCode, signal)
  return request<RegionDetail>(`/visits/regions/${encodeURIComponent(regionCode)}?groupId=${groupId}`, { signal })
}

/** 동네 소유 상태 (우리 그룹 기준). 소유 정보 API에서 그 동네를 찾아 바꾼다. */
export async function getRegionOwnership(groupId: number, regionCode: string): Promise<RegionOwnership> {
  const properties = await listProperties(groupId)
  return toOwnership(properties.find((property) => property.regionCode === regionCode), groupId)
}
