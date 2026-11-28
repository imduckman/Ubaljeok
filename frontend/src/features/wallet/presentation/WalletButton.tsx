import { useState } from 'react'
import { useWallet } from '../application/useWallet'
import { useWalletHistory } from '../application/useWalletHistory'
import { formatCoinChange } from '../domain/Wallet'
import { WalletSheet } from './WalletSheet'
import styles from '../../../pages/Pages.module.css'

/** 지도 위 지갑 (스타일가이드 WalletPill). 누르면 잔액 시트를 연다. 방금 바뀐 양은 "(+100)"으로 잠깐 보인다. */
export function WalletButton({ groupId, groupName, fallbackBalance }: { groupId: number; groupName: string; fallbackBalance?: number }) {
  const { balance, recentChange, isLoading, errorMessage, retry } = useWallet(groupId, fallbackBalance)
  const [isOpen, setIsOpen] = useState(false)
  const history = useWalletHistory(groupId, isOpen)
  const balanceLabel = balance === undefined ? (isLoading ? '불러오는 중' : '확인 필요') : `${balance}코인`

  return (
    <>
      <button
        type="button"
        className={styles.walletPill}
        onClick={() => setIsOpen(true)}
        aria-label={`그룹 지갑 ${balanceLabel}${recentChange ? `, 방금 ${formatCoinChange(recentChange)}` : ''}${errorMessage ? ', 잔액 조회 실패' : ''}, 자세히 보기`}
      >
        <span className={styles.walletDot} aria-hidden="true" />
        {balance ?? balanceLabel}
        {errorMessage && balance !== undefined ? <span className={styles.walletLoss}>확인 필요</span> : null}
        {recentChange ? (
          <span className={recentChange > 0 ? styles.walletGain : styles.walletLoss} aria-hidden="true">
            ({formatCoinChange(recentChange)})
          </span>
        ) : null}
        <span className={styles.walletSnap} aria-hidden="true" />
      </button>
      <WalletSheet
        groupName={groupName}
        balance={balance}
        recentChange={recentChange}
        history={history.state}
        regionNameOf={history.regionNameOf}
        onRetryHistory={history.retry}
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={() => void retry()}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
