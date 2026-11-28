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
  const [loadStates, setLoadStates] = useState<WalletContextValue['loadStates']>({})
  const [recentChanges, setRecentChanges] = useState<Record<number, number>>({})
  const [reward, setReward] = useState<CoinReward | null>(null)
  const changeTimers = useRef(new Map<number, number>())
  const balanceVersions = useRef(new Map<number, number>())

  const loadWallet = useCallback(async (groupId: number) => {
    const version = (balanceVersions.current.get(groupId) ?? 0) + 1
    balanceVersions.current.set(groupId, version)
    setLoadStates((previous) => ({ ...previous, [groupId]: { isLoading: true, errorMessage: null } }))
    try {
      const wallet = await getWallet(groupId)
      // 조회 중 새 정산이나 조회가 시작됐으면 이전 응답은 잔액에 반영하지 않는다.
      if (balanceVersions.current.get(groupId) !== version) return
      setBalances((previous) => ({ ...previous, [groupId]: wallet.balance }))
      setLoadStates((previous) => ({ ...previous, [groupId]: { isLoading: false, errorMessage: null } }))
    } catch {
      if (balanceVersions.current.get(groupId) !== version) return
      setLoadStates((previous) => ({
        ...previous,
        [groupId]: { isLoading: false, errorMessage: '지갑을 불러오지 못했어요. 다시 시도해 주세요.' },
      }))
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
      balanceVersions.current.set(groupId, (balanceVersions.current.get(groupId) ?? 0) + 1)
      setBalances((previous) => ({ ...previous, [groupId]: settlement.balance }))
      setLoadStates((previous) => ({ ...previous, [groupId]: { isLoading: false, errorMessage: null } }))
      const change = settlement.reward - settlement.tollPaid
      if (change !== 0) showChange(groupId, change)
      describeSettlement(settlement, regionName).forEach((notice) => showToast({ tone: 'coin', ...notice }))
      if (isFirstVisitReward(settlement)) {
        setReward({ groupName, regionCode, regionName, amount: settlement.reward, balance: settlement.balance })
      }
    },
    [showChange, showToast],
  )

  const applyBalance = useCallback(
    (groupId: number, balance: number, change: number) => {
      balanceVersions.current.set(groupId, (balanceVersions.current.get(groupId) ?? 0) + 1)
      setBalances((previous) => ({ ...previous, [groupId]: balance }))
      setLoadStates((previous) => ({ ...previous, [groupId]: { isLoading: false, errorMessage: null } }))
      if (change !== 0) showChange(groupId, change)
    },
    [showChange],
  )

  useEffect(() => {
    const timers = changeTimers.current
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const value = useMemo<WalletContextValue>(
    () => ({ balances, loadStates, recentChanges, loadWallet, announceSettlement, applyBalance }),
    [balances, loadStates, recentChanges, loadWallet, announceSettlement, applyBalance],
  )

  return (
    <WalletContext.Provider value={value}>
      {children}
      {reward ? <CoinRewardSheet reward={reward} onClose={() => setReward(null)} /> : null}
    </WalletContext.Provider>
  )
}
