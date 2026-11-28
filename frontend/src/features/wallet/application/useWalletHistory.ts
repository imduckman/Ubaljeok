import { useCallback, useEffect, useState } from 'react'
import { getWallet } from '../../../api/endpoints/wallet'
import { listRegions } from '../../../api/endpoints/regions'
import type { WalletTransaction } from '../domain/Wallet'

export type WalletHistoryState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; transactions: WalletTransaction[]; balance: number; hasMore: boolean }
  | { status: 'error' }

// 동네 이름은 거의 안 바뀌어서 한 번만 불러와 같이 쓴다. 실패하면 다음에 다시 시도한다.
let regionNamesPromise: Promise<Map<string, string>> | null = null
function loadRegionNames(): Promise<Map<string, string>> {
  regionNamesPromise ??= listRegions()
    .then((regions) => new Map(regions.map((region) => [region.regionCode, region.name])))
    .catch(() => {
      regionNamesPromise = null
      return new Map<string, string>()
    })
  return regionNamesPromise
}

/**
 * 지갑 시트의 영수증: 시트를 열 때마다 거래 내역을 새로 불러온다 (구매·보상 직후에도 최신).
 * 동네 코드는 이름으로 바꿔 보여주고, 이름을 못 찾으면 비워 둔다.
 */
export function useWalletHistory(groupId: number, isOpen: boolean) {
  const [state, setState] = useState<WalletHistoryState>({ status: 'idle' })
  const [regionNames, setRegionNames] = useState<Map<string, string>>(new Map())
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    let isCurrent = true
    setState({ status: 'loading' })
    Promise.all([getWallet(groupId), loadRegionNames()])
      .then(([wallet, names]) => {
        if (!isCurrent) return
        setRegionNames(names)
        setState({ status: 'ready', transactions: wallet.transactions ?? [], balance: wallet.balance, hasMore: Boolean(wallet.nextCursor) })
      })
      .catch(() => {
        if (isCurrent) setState({ status: 'error' })
      })
    return () => {
      isCurrent = false
    }
  }, [groupId, isOpen, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const regionNameOf = useCallback((regionCode: string | null) => (regionCode ? regionNames.get(regionCode) ?? '' : ''), [regionNames])

  return { state, retry, regionNameOf }
}
