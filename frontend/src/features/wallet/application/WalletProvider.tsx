import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getWallet } from '../../../api/endpoints/wallet'
import { useToast } from '../../../shared/components/toast/useToast'
import { describeSettlement, isFirstVisitReward } from '../domain/Wallet'
import { CoinRewardSheet, type CoinReward } from '../presentation/CoinRewardSheet'
import { WalletContext, type SettlementAnnouncement, type WalletContextValue } from './walletContext'

/** 지갑 옆 "(+100)"을 보여주는 시간 */
export const CHANGE_DISPLAY_MS = 4000

export function WalletProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast()
  const [balances, setBalances] = useState<Record<number, number>>({})
  const [recentChanges, setRecentChanges] = useState<Record<number, number>>({})
  const [reward, setReward] = useState<CoinReward | null>(null)
  const changeTimers = useRef(new Map<number, number>())

  const loadWallet = useCallback(async (groupId: number) => {
    try {
      const wallet = await getWallet(groupId)
      setBalances((previous) => ({ ...previous, [groupId]: wallet.balance }))
    } catch {
      // 지갑 API가 아직 없거나 실패하면 알고 있던 잔액(또는 0)을 그대로 보여준다.
    }
  }, [])

  const showChange = useCallback((groupId: number, amount: number) => {
    setRecentChanges((previous) => ({ ...previous, [groupId]: amount }))
    const timers = changeTimers.current
    const previousTimer = timers.get(groupId)
    if (previousTimer !== undefined) window.clearTimeout(previousTimer)
    timers.set(
      groupId,
      window.setTimeout(() => {
        setRecentChanges((previous) => {
          const next = { ...previous }
          delete next[groupId]
          return next
        })
        timers.delete(groupId)
      }, CHANGE_DISPLAY_MS),
    )
  }, [])

  const announceSettlement = useCallback(
    ({ groupId, groupName, regionCode, regionName, settlement }: SettlementAnnouncement) => {
      if (!settlement) return
      setBalances((previous) => ({ ...previous, [groupId]: settlement.balance }))
      const change = settlement.reward - settlement.tollPaid
      if (change !== 0) showChange(groupId, change)
      describeSettlement(settlement, regionName).forEach((notice) => showToast({ tone: 'coin', ...notice }))
      if (isFirstVisitReward(settlement)) {
        setReward({ groupName, regionCode, regionName, amount: settlement.reward, balance: settlement.balance })
      }
    },
    [showChange, showToast],
  )

  useEffect(() => {
    const timers = changeTimers.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const value = useMemo<WalletContextValue>(
    () => ({ balances, recentChanges, loadWallet, announceSettlement }),
    [balances, recentChanges, loadWallet, announceSettlement],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      {reward ? <CoinRewardSheet reward={reward} onClose={() => setReward(null)} /> : null}
    </WalletContext.Provider>
  )
}
