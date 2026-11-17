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
  const [state, setState] = useState<RegionDetailState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    Promise.all([getRegionDetail(groupId, regionCode, controller.signal), getRegionOwnership(groupId, regionCode)]).then(
      ([detail, ownership]) => {
        if (!controller.signal.aborted) setState({ status: 'ready', detail, ownership })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: getErrorMessage(error, '동네 정보를 불러오지 못했어요.') })
        }
      },
    )
    return () => controller.abort()
  }, [groupId, regionCode, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  return { state, retry }
}

/** "우리 그룹 방문 3번" 같은 한 줄 요약 */
export function describeVisits(detail: RegionDetail): string {
  return detail.visitCount > 0 ? `우리 그룹 방문 ${detail.visitCount}번` : '아직 우리 그룹이 방문하지 않았어요'
}
