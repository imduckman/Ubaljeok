import type { VisitMapResponse } from '../endpoints/visits'

type MockVisit = {
  id: number
  groupId: number
  regionCode: string
  visitDate: string
  rewardEligible: boolean
}

const visits = new Map<string, MockVisit>()
let nextVisitId = 70

export function recordMockVisit(
  groupId: number,
  regionCode: string,
  visitDate: string,
  rewardEligible: boolean,
) {
  const key = `${groupId}:${visitDate}:${regionCode}`
  const existing = visits.get(key)

  if (existing) {
    existing.rewardEligible ||= rewardEligible
    return { id: existing.id, rewardEligible: existing.rewardEligible, isNewVisit: false }
  }

  const visit = { id: nextVisitId++, groupId, regionCode, visitDate, rewardEligible }
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
