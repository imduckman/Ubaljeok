import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import type { WalletHistoryState } from '../application/useWalletHistory'
import { formatCoinChange } from '../domain/Wallet'
import { WalletReceipt } from './WalletReceipt'
import styles from './WalletSheet.module.css'

interface WalletSheetProps {
  groupName: string
  balance: number | undefined
  isLoading: boolean
  errorMessage: string | null
  onRetry: () => void
  /** 방금 바뀐 양. 0이면 표시하지 않는다. */
  recentChange?: number
  /** 영수증(거래 내역). 없으면 빈 영수증 안내만 보여준다. */
  history?: WalletHistoryState
  regionNameOf?: (regionCode: string | null) => string
  onRetryHistory?: () => void
  isOpen: boolean
  onClose: () => void
}

/**
 * 지갑 버튼을 누르면 여는 시트. 위에 그룹 카드(잔액), 아래 주머니에 영수증(거래 내역)이 들어간다.
 */
export function WalletSheet({
  groupName,
  balance,
  recentChange = 0,
  isLoading,
  errorMessage,
  onRetry,
  history = { status: 'ready', transactions: [], balance: 0, hasMore: false },
  regionNameOf = () => '',
  onRetryHistory = () => {},
  isOpen,
  onClose,
}: WalletSheetProps) {
  const unknownBalanceLabel = isLoading ? '잔액을 불러오는 중이에요' : '잔액 확인이 필요해요'
  return (
    <BottomSheet
      isOpen={isOpen}
      title={<span className={styles.title}>지갑</span>}
      onClose={onClose}
    >
      {isLoading ? <p role="status">지갑을 불러오는 중이에요.</p> : null}
      {errorMessage ? (
        <div>
          <p role="alert">{errorMessage}</p>
          <Button variant="secondary" onClick={onRetry}>다시 불러오기</Button>
        </div>
      ) : null}
      <section className={styles.card} aria-label={`${groupName} 공동 지갑, ${balance === undefined ? unknownBalanceLabel : `${balance}코인`}`}>
        <span className={styles.cardName}>{groupName} · 공동 지갑</span>
        <span className={styles.chip} aria-hidden="true" />
        <span className={styles.balance}>
          {balance === undefined ? <span className={styles.unit}>{unknownBalanceLabel}</span> : (
            <>{balance}<span className={styles.unit}>코인</span></>
          )}
          {recentChange ? <span className={styles.change}>({formatCoinChange(recentChange)})</span> : null}
        </span>
      </section>

      <section className={styles.receiptPocket} aria-label="영수증">
        <p className={styles.pocketLabel}>영수증</p>
        <div className={styles.receipt}>
          <WalletReceipt state={history} regionNameOf={regionNameOf} onRetry={onRetryHistory} />
          <p className={styles.receiptNote}>위치 정보가 없거나 30일이 지난 사진은 지도에만 남고 코인은 받을 수 없어요.</p>
        </div>
      </section>
    </BottomSheet>
  )
}
