import { useCallback, useEffect, useState } from 'react'
import { getRegionDetail, getRegionOwnership } from '../../../api/endpoints/visits'
import { getErrorMessage } from '../../../shared/types/api'
import type { RegionDetail, RegionOwnership } from '../domain/RegionDetail'

export type RegionDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detail: RegionDetail; ownership: RegionOwnership }

/**
 * 고른 동네의 상세와 소유 상태를 불러온다. 대표 카드와 세부 시트가 같은 결과를 같이 쓴다.
 * 그룹이나 동네가 바뀌면 이전 요청은 취소해서 늦게 온 응답이 섞이지 않게 한다.
 */
export function useRegionDetail(groupId: number, regionCode: string) {
  const [result, setResult] = useState<{
    groupId: number
    regionCode: string
    attempt: number
    state: RegionDetailState
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  // 현재 요청과 일치하는 결과만 표시해 그룹 전환·재시도 때 이전 결과가 섞이지 않게 한다.
  const state: RegionDetailState = result?.groupId === groupId
    && result.regionCode === regionCode && result.attempt === attempt
    ? result.state
    : { status: 'loading' }

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getRegionDetail(groupId, regionCode, controller.signal), getRegionOwnership(groupId, regionCode)]).then(
      ([detail, ownership]): RegionDetailState => ({ status: 'ready', detail, ownership }),
      (error: unknown): RegionDetailState => ({
        status: 'error', message: getErrorMessage(error, '동네 정보를 불러오지 못했어요.'),
      }),
    ).then((state) => {
      if (!controller.signal.aborted) setResult({ groupId, regionCode, attempt, state })
    })
    return () => controller.abort()
  }, [groupId, regionCode, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { state, retry }
}

/** "우리 그룹 방문 3번" 같은 한 줄 요약 */
export function describeVisits(detail: RegionDetail): string {
  return detail.visitCount > 0 ? `우리 그룹 방문 ${detail.visitCount}번` : '아직 우리 그룹이 방문하지 않았어요'
}
