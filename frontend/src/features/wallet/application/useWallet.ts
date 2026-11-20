import { useContext, useEffect } from 'react'
import { WalletContext } from './walletContext'

export function useWalletContext() {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet은 WalletProvider 안에서만 쓸 수 있어요.')
  return context
}

/**
 * 한 그룹의 지갑 잔액. 화면에 처음 나올 때 서버에서 불러오고,
 * 아직 모르면 그룹 목록에 실린 값(없으면 0)을 보여준다.
 */
export function useWallet(groupId: number, fallbackBalance = 0) {
  const { balances, recentChanges, loadWallet } = useWalletContext()

  useEffect(() => {
    void loadWallet(groupId)
  }, [groupId, loadWallet])

  return {
    balance: balances[groupId] ?? fallbackBalance,
    recentChange: recentChanges[groupId] ?? 0,
  }
}
