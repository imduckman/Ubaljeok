import type { RegionOwnership } from '../../visit/domain/RegionDetail'

/** 동네 소유 정보 (MVP-IMPLEMENTATION.md 4장 `GET /api/game/properties`) */
export interface Property {
  regionCode: string
  ownerGroupId: number
  ownerGroupName: string
  level: 'building' | 'landmark'
}

/** 구매·업그레이드 응답 */
export interface PropertyChangeResult {
  property: Property
  walletBalance: number
  transactionId: number
}

/** 건물 값 (기획: 건물 100) */
export const BUILDING_PRICE = 100
/** 랜드마크 업그레이드 값 (기획: 업그레이드 80) */
export const LANDMARK_UPGRADE_PRICE = 80

/** 소유 정보를 "우리 그룹 기준" 소유 상태로 바꾼다. */
export function toOwnership(property: Property | undefined, groupId: number): RegionOwnership {
  if (!property) return { status: 'unowned' }
  if (property.ownerGroupId === groupId) return { status: 'ours', level: property.level }
  return { status: 'theirs', ownerGroupName: property.ownerGroupName, level: property.level }
}

export type PropertyAction =
  | { kind: 'none' }
  | { kind: 'purchase' | 'upgrade'; price: number; blockedReason: string | null }

interface PropertyActionInput {
  ownership: RegionOwnership
  /** 이 동네에 코인을 받을 수 있는(보상 대상) 방문이 있는지 */
  hasEligibleVisit: boolean
  isGroupOwner: boolean
  balance: number
}

/**
 * 동네 상세에서 보여줄 버튼과, 누를 수 없다면 그 이유.
 * 기획 규칙: 보상 대상 방문이 있어야 구매, 그룹장만 구매·업그레이드, 동네당 주인 하나, 잔액은 음수가 될 수 없음.
 */
export function getPropertyAction({ ownership, hasEligibleVisit, isGroupOwner, balance }: PropertyActionInput): PropertyAction {
  if (ownership.status === 'theirs') return { kind: 'none' }
  if (ownership.status === 'ours' && ownership.level === 'landmark') return { kind: 'none' }

  const kind = ownership.status === 'unowned' ? 'purchase' : 'upgrade'
  const price = kind === 'purchase' ? BUILDING_PRICE : LANDMARK_UPGRADE_PRICE
  let blockedReason: string | null = null
  if (kind === 'purchase' && !hasEligibleVisit) {
    blockedReason = '위치 정보가 있는 사진으로 방문해야 건물을 구매할 수 있어요.'
  } else if (!isGroupOwner) {
    blockedReason = kind === 'purchase' ? '그룹장만 건물을 구매할 수 있어요.' : '그룹장만 랜드마크를 구매할 수 있어요.'
  } else if (balance < price) {
    blockedReason = `코인이 ${price - balance}개 모자라요. (지금 ${balance}코인)`
  }
  return { kind, price, blockedReason }
}
