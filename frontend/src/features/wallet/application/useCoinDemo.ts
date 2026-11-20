import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { USE_MOCK_API } from '../../../api/client'
import { mockServer } from '../../../api/mock/mockServer'
import { useWalletContext } from './useWallet'

/**
 * 개발용 (가짜 API에서만): 지도 주소 뒤에 `?demo=coin`을 붙이면 영통1동 첫 방문 +100을 받은 것처럼
 * 코인 Toast·지갑 숫자·코인 카드를 띄운다. 업로드 화면이 정산 결과를 연결하기 전 확인용.
 */
export function useCoinDemo(group: { groupId: number; name: string } | null) {
  const location = useLocation()
  const navigate = useNavigate()
  const { announceSettlement } = useWalletContext()
  // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 받게 한다.
  const handledKey = useRef<string | null>(null)

  useEffect(() => {
    if (!USE_MOCK_API || !group) return
    if (new URLSearchParams(location.search).get('demo') !== 'coin') return
    if (handledKey.current === location.key) return
    handledKey.current = location.key
    navigate(location.pathname, { replace: true })
    const reward = 100
    const balance = mockServer.addCoinsForDemo(group.groupId, reward)
    announceSettlement({
      groupId: group.groupId,
      groupName: group.name,
      regionCode: '4111759000',
      regionName: '영통1동',
      settlement: { reward, tollPaid: 0, balance },
    })
  }, [announceSettlement, group, location.key, location.pathname, location.search, navigate])
}
