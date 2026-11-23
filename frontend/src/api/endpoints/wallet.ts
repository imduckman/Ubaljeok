import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import type { Wallet } from '../../features/wallet/domain/Wallet'

/** 그룹 공동 지갑 잔액과 거래 내역 (MVP-IMPLEMENTATION.md 4장, 서버는 아직 구현 전) */
export async function getWallet(groupId: number, signal?: AbortSignal): Promise<Wallet> {
  if (USE_MOCK_API) return mockServer.getWallet(groupId)
  return request<Wallet>(`/groups/${groupId}/wallet`, { signal })
}
