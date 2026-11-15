import { request, USE_MOCK_API } from '../client'

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
  if (USE_MOCK_API) {
    return { groupId, dataVersion: 'ver20261001', regions: [] }
  }

  return request<VisitMapResponse>(`/visits/map?groupId=${groupId}`, { signal })
}