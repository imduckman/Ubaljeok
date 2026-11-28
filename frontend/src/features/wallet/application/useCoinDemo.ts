import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { USE_MOCK_API } from '../../../api/client'
import { mockServer } from '../../../api/mock/mockServer'
import { useWalletContext } from './useWallet'

/** 개발용 데모 동네: coin은 주인 없는 영통1동, toll은 과동기 탐험대 랜드마크 행궁동 */
const DEMO_REGIONS = {
  coin: { regionCode: '4111757000', regionName: '영통1동' },
  toll: { regionCode: '4111574000', regionName: '행궁동' },
} as const

/**
 * 개발용 (가짜 API에서만): 지도 주소 뒤에 `?demo=coin`을 붙이면 영통1동 첫 방문 +100,
 * `?demo=toll`이면 행궁동(다른 그룹 랜드마크) 첫 방문 +100과 통행료를 낸 것처럼
 * 코인 Toast·지갑 숫자·코인 카드·영수증을 만든다. 업로드 화면이 정산 결과를 연결하기 전 확인용.
 */
export function useCoinDemo(group: { groupId: number; name: string } | null) {
  const location = useLocation()
  const navigate = useNavigate()
  const { announceSettlement } = useWalletContext()
  // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 받게 한다.
  const handledKey = useRef<string | null>(null)

  useEffect(() => {
    if (!USE_MOCK_API || !group) return
    const demo = new URLSearchParams(location.search).get('demo')
    if (demo !== 'coin' && demo !== 'toll') return
    if (handledKey.current === location.key) return
    handledKey.current = location.key
    navigate(location.pathname, { replace: true })
    const { regionCode, regionName } = DEMO_REGIONS[demo]
    const settlement = mockServer.settleVisitForDemo(group.groupId, regionCode, 100)
    announceSettlement({ groupId: group.groupId, groupName: group.name, regionCode, regionName, settlement })
  }, [announceSettlement, group, location.key, location.pathname, location.search, navigate])
}
