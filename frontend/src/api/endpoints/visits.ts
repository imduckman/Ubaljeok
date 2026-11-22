import { request, USE_MOCK_API } from '../client'
import { getMockVisitMap } from '../mock/mockVisits'

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
