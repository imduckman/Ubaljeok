import { request, USE_MOCK_API } from '../client'
import { getMockVisitMap } from '../mock/mockVisits'
import { mockVisitServer } from '../mock/mockVisits'
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

/**
 * 동네 소유 상태. 소유 정보 API(MVP 문서 `GET /api/game/properties`)는 4주차에 연결한다.
 * 그 전까지 실제 서버에서는 늘 '주인 없음'이고, 가짜 API에서만 여러 상태를 보여준다.
 */
export async function getRegionOwnership(groupId: number, regionCode: string): Promise<RegionOwnership> {
  if (USE_MOCK_API) return mockVisitServer.getRegionOwnership(groupId, regionCode)
  return { status: 'unowned' }
}
