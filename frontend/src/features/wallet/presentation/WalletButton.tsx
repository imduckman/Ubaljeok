import { useState } from 'react'
import { useWallet } from '../application/useWallet'
import { formatCoinChange } from '../domain/Wallet'
import { WalletSheet } from './WalletSheet'
import styles from '../../../pages/Pages.module.css'

/** 지도 위 지갑 (스타일가이드 WalletPill). 누르면 잔액 시트를 연다. 방금 바뀐 양은 "(+100)"으로 잠깐 보인다. */
export function WalletButton({ groupId, groupName, fallbackBalance }: { groupId: number; groupName: string; fallbackBalance: number }) {
  const { balance, recentChange } = useWallet(groupId, fallbackBalance)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.walletPill}
        onClick={() => setIsOpen(true)}
        aria-label={`그룹 지갑 ${balance}코인${recentChange ? `, 방금 ${formatCoinChange(recentChange)}` : ''}, 자세히 보기`}
      >
        <span className={styles.walletDot} aria-hidden="true" />
        {balance}
        {recentChange ? (
          <span className={recentChange > 0 ? styles.walletGain : styles.walletLoss} aria-hidden="true">
            ({formatCoinChange(recentChange)})
          </span>
        ) : null}
        <span className={styles.walletSnap} aria-hidden="true" />
      </button>
      <WalletSheet groupName={groupName} balance={balance} recentChange={recentChange} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
