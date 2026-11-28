import type { WalletHistoryState } from '../application/useWalletHistory'
import { buildReceipt, formatCoinChange, TRANSACTION_LABELS, type WalletTransactionType } from '../domain/Wallet'
import styles from './WalletSheet.module.css'

interface WalletReceiptProps {
  state: WalletHistoryState
  regionNameOf: (regionCode: string | null) => string
  onRetry: () => void
}

/**
 * 지갑 시트 아래 주머니 속 영수증: 날짜별로 묶은 코인 기록 (최신순).
 * 한 줄 = [아이콘] 무슨 일 [동네] …… 금액 / 그 직후 잔액. 들어온 코인은 금색 +, 나간 코인은 핑크 −.
 */
export function WalletReceipt({ state, regionNameOf, onRetry }: WalletReceiptProps) {
  if (state.status === 'idle' || state.status === 'loading') {
    return (
      <p className={styles.receiptStatus} role="status">
        영수증을 불러오는 중이에요.
      </p>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.receiptStatus} role="alert">
        영수증을 불러오지 못했어요.
        <button type="button" className={styles.receiptRetry} onClick={onRetry}>
          다시 불러오기
        </button>
      </div>
    )
  }
  if (state.transactions.length === 0) {
    return <p className={styles.receiptEmpty}>코인을 받거나 쓰면 영수증이 여기에 쌓여요.</p>
  }

  const days = buildReceipt(state.transactions, state.balance)
  return (
    <>
      {days.map((day) => (
        <section key={day.date} className={styles.receiptDay} aria-label={day.date}>
          <h3 className={styles.receiptDate}>{day.date}</h3>
          <ul className={styles.receiptList}>
            {day.lines.map((line) => {
              const region = regionNameOf(line.regionCode)
              const isGain = line.amount > 0
              return (
                <li key={line.id} className={styles.receiptRow}>
                  <span className={`${styles.receiptIcon} ${styles[`icon_${line.type}`]}`} aria-hidden="true">
                    <TransactionIcon type={line.type} />
                  </span>
                  <span className={styles.receiptText}>
                    <span className={styles.receiptLabel}>{TRANSACTION_LABELS[line.type]}</span>
                    {region ? <span className={styles.receiptRegion}>{region}</span> : null}
                  </span>
                  <span className={styles.receiptRight}>
                    <span className={`${styles.receiptAmount} ${isGain ? styles.gain : styles.loss}`}>{formatCoinChange(line.amount)}</span>
                    <span className={styles.receiptBalance}>잔액 {line.balanceAfter}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {state.hasMore ? <p className={styles.receiptMore}>더 오래된 영수증은 아직 여기서 볼 수 없어요.</p> : null}
    </>
  )
}

/** 거래 종류 아이콘 (선 아이콘, 18px) */
function TransactionIcon({ type }: { type: WalletTransactionType }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (type) {
    case 'first_visit':
    case 'revisit':
      // 발자국 대신 위치 핀
      return (
        <svg {...common}>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      )
    case 'purchase':
      return (
        <svg {...common}>
          <path d="M4 20V10l8-6 8 6v10" />
          <path d="M10 20v-5h4v5" />
        </svg>
      )
    case 'upgrade':
      return (
        <svg {...common}>
          <path d="M6 21V4" />
          <path d="M6 4h12l-3 4 3 4H6" />
        </svg>
      )
    case 'toll_paid':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="m6 13 6 6 6-6" />
        </svg>
      )
    case 'toll_received':
      return (
        <svg {...common}>
          <path d="M12 19V5" />
          <path d="m6 11 6-6 6 6" />
        </svg>
      )
  }
}
