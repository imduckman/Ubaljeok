import { createContext } from 'react'
import type { Settlement } from '../domain/Wallet'

export interface SettlementAnnouncement {
  groupId: number
  groupName: string
  regionCode: string
  regionName: string
  /** `POST /api/photos` 응답의 settlement. 없으면 아무 알림도 띄우지 않는다. */
  settlement: Settlement | undefined
}

export interface WalletContextValue {
  /** 그룹별로 알고 있는 최신 잔액 */
  balances: Record<number, number>
  /** 방금 바뀐 양. 지갑에 "(+100)"처럼 잠깐 보여주고 지운다. */
  recentChanges: Record<number, number>
  /** 서버에서 지갑을 다시 불러온다. 실패하면 알고 있던 값을 그대로 둔다. */
  loadWallet: (groupId: number) => Promise<void>
  /**
   * 사진을 올린 뒤 정산 결과를 알린다: 지갑 숫자 갱신 + 코인 Toast,
   * 새 동네 첫 방문(+100)이면 큰 코인 카드까지. 업로드 화면에서 부른다.
   */
  announceSettlement: (announcement: SettlementAnnouncement) => void
}

export const WalletContext = createContext<WalletContextValue | null>(null)
