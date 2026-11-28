/** 그룹 공동 지갑 (MVP-IMPLEMENTATION.md 4장 `GET /api/groups/{groupId}/wallet`) */
export interface Wallet {
  balance: number
  /** 거래 내역 (4주차에 화면에 붙인다) */
  transactions: WalletTransaction[]
  nextCursor: string | null
}

export type WalletTransactionType = 'first_visit' | 'revisit' | 'purchase' | 'upgrade' | 'toll_paid' | 'toll_received'

export interface WalletTransaction {
  id: number
  type: WalletTransactionType
  /** 들어오면 양수, 나가면 음수 */
  amount: number
  regionCode: string | null
  createdAt: string
}

/**
 * 사진을 올린 뒤 서버가 알려주는 코인 정산 결과 (`POST /api/photos` 응답의 `settlement`).
 * 정산 기능이 들어오기 전에는 응답에 없을 수 있다.
 */
export interface Settlement {
  /** 받은 보상. 첫 방문 100, 다른 날 다시 방문 10, 없으면 0 */
  reward: number
  /** 다른 그룹 랜드마크라서 낸 통행료. 없으면 0 */
  tollPaid: number
  /** 정산 뒤 지갑 잔액 */
  balance: number
}

export const FIRST_VISIT_REWARD = 100
export const REVISIT_REWARD = 10
/** 다른 그룹 랜드마크에서 내는 통행료 최대치 (잔액이 적으면 잔액만큼) */
export const TOLL_LIMIT = 30

/** 영수증 한 줄의 이름 */
export const TRANSACTION_LABELS: Record<WalletTransactionType, string> = {
  first_visit: '처음 방문',
  revisit: '다시 방문',
  purchase: '건물 구매',
  upgrade: '랜드마크 구매',
  toll_paid: '통행료 지불',
  toll_received: '통행료 수익',
}

export interface ReceiptLine extends WalletTransaction {
  /** 이 거래 직후의 잔액 */
  balanceAfter: number
}

export interface ReceiptDay {
  /** "11월 22일" */
  date: string
  lines: ReceiptLine[]
}

/**
 * 최신순 거래를 날짜별로 묶고, 줄마다 그 거래 직후 잔액을 붙인다.
 * 서버는 잔액 이력을 주지 않아서, 지금 잔액에서 최신 거래부터 거꾸로 빼 가며 계산한다.
 */
export function buildReceipt(transactions: WalletTransaction[], currentBalance: number): ReceiptDay[] {
  const days: ReceiptDay[] = []
  let balance = currentBalance
  for (const transaction of transactions) {
    const date = formatTransactionDate(transaction.createdAt)
    const line = { ...transaction, balanceAfter: balance }
    balance -= transaction.amount
    const last = days.at(-1)
    if (last && last.date === date) last.lines.push(line)
    else days.push({ date, lines: [line] })
  }
  return days
}

/** "2026-11-28T23:10:00+09:00" → "11월 28일" (사용자 기기 시간 기준) */
export function formatTransactionDate(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

/** 100 → "+100", -30 → "−30", 0 → "0" */
export function formatCoinChange(amount: number): string {
  if (amount > 0) return `+${amount}`
  if (amount < 0) return `−${Math.abs(amount)}`
  return '0'
}

export interface RewardNotice {
  title: string
  description: string
}

/**
 * 정산 결과를 알림 문구로 바꾼다. 보상도 통행료도 없으면 null (알림 없음).
 * UI-STATES: 코인 Toast는 settlement가 지급을 알려줄 때만 띄운다.
 */
export function describeSettlement(settlement: Settlement | undefined, regionName: string): RewardNotice[] {
  if (!settlement) return []
  const notices: RewardNotice[] = []
  if (settlement.reward > 0) {
    notices.push({
      title: `${formatCoinChange(settlement.reward)} 코인`,
      description:
        settlement.reward >= FIRST_VISIT_REWARD
          ? `${regionName} 첫 방문으로 받았어요`
          : `${regionName}에 다시 와서 받았어요`,
    })
  }
  if (settlement.tollPaid > 0) {
    notices.push({
      title: `${formatCoinChange(-settlement.tollPaid)} 코인`,
      description: `${regionName} 랜드마크 통행료를 냈어요`,
    })
  }
  return notices
}

/** 새 동네를 처음 방문해서 받은 보상인지 (큰 코인 카드를 띄울지) */
export function isFirstVisitReward(settlement: Settlement | undefined): boolean {
  return (settlement?.reward ?? 0) >= FIRST_VISIT_REWARD
}
