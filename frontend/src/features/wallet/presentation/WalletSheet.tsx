import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { formatCoinChange } from '../domain/Wallet'
import styles from './WalletSheet.module.css'

interface WalletSheetProps {
  groupName: string
  balance: number
  /** 방금 바뀐 양. 0이면 표시하지 않는다. */
  recentChange?: number
  isOpen: boolean
  onClose: () => void
}

/**
 * 지갑 버튼을 누르면 여는 시트. 위에 그룹 카드(잔액), 아래 주머니에 영수증이 들어간다.
 * 거래 내역(영수증)은 4주차에 채운다.
 */
export function WalletSheet({ groupName, balance, recentChange = 0, isOpen, onClose }: WalletSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      title={<span className={styles.title}>지갑</span>}
      onClose={onClose}
    >
      <section className={styles.card} aria-label={`${groupName} 공동 지갑, ${balance}코인`}>
        <span className={styles.cardName}>{groupName} · 공동 지갑</span>
        <span className={styles.chip} aria-hidden="true" />
        <span className={styles.balance}>
          {balance}
          <span className={styles.unit}>코인</span>
          {recentChange ? <span className={styles.change}>({formatCoinChange(recentChange)})</span> : null}
        </span>
      </section>

      <section className={styles.receiptPocket} aria-label="영수증">
        <p className={styles.pocketLabel}>영수증</p>
        <div className={styles.receipt}>
          <p className={styles.receiptEmpty}>코인을 받거나 쓰면 영수증이 여기에 쌓여요.</p>
          <p className={styles.receiptNote}>위치 정보가 없거나 30일이 지난 사진은 지도에만 남고 코인은 받을 수 없어요.</p>
        </div>
      </section>
    </BottomSheet>
  )
}
