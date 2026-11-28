import { describe, expect, it } from 'vitest'
import { getPropertyAction, toOwnership, type Property } from './Property'

const ready = { hasEligibleVisit: true, isGroupOwner: true, balance: 340 }

describe('소유 상태', () => {
  const property: Property = { regionCode: '4111759000', ownerGroupId: 102, ownerGroupName: '과동기 탐험대', level: 'building' }

  it('우리 그룹 것이면 ours, 다른 그룹 것이면 theirs, 없으면 unowned', () => {
    expect(toOwnership(property, 102)).toEqual({ status: 'ours', level: 'building' })
    expect(toOwnership(property, 101)).toEqual({ status: 'theirs', ownerGroupName: '과동기 탐험대', level: 'building' })
    expect(toOwnership(undefined, 101)).toEqual({ status: 'unowned' })
  })
})

describe('구매·업그레이드 버튼', () => {
  it('주인 없는 동네는 건물 구매(100), 우리 건물은 랜드마크 구매(80)', () => {
    expect(getPropertyAction({ ...ready, ownership: { status: 'unowned' } })).toEqual({ kind: 'purchase', price: 100, blockedReason: null })
    expect(getPropertyAction({ ...ready, ownership: { status: 'ours', level: 'building' } })).toEqual({ kind: 'upgrade', price: 80, blockedReason: null })
  })

  it('우리 랜드마크와 다른 그룹 땅에는 버튼이 없다', () => {
    expect(getPropertyAction({ ...ready, ownership: { status: 'ours', level: 'landmark' } })).toEqual({ kind: 'none' })
    expect(getPropertyAction({ ...ready, ownership: { status: 'theirs', ownerGroupName: '과동기 탐험대', level: 'building' } })).toEqual({ kind: 'none' })
  })

  it('보상 대상 방문, 그룹장, 코인 순서로 막힌 이유를 알려준다', () => {
    const unowned = { status: 'unowned' } as const
    expect(getPropertyAction({ ...ready, ownership: unowned, hasEligibleVisit: false })).toMatchObject({ blockedReason: '위치 정보가 있는 사진으로 방문해야 건물을 구매할 수 있어요.' })
    expect(getPropertyAction({ ...ready, ownership: unowned, isGroupOwner: false })).toMatchObject({ blockedReason: '그룹장만 건물을 구매할 수 있어요.' })
    expect(getPropertyAction({ ...ready, ownership: unowned, balance: 60 })).toMatchObject({ blockedReason: '코인이 40개 모자라요. (지금 60코인)' })
  })

  it('업그레이드는 방문 조건 없이 그룹장과 코인만 본다', () => {
    const ours = { status: 'ours', level: 'building' } as const
    expect(getPropertyAction({ ...ready, ownership: ours, hasEligibleVisit: false })).toMatchObject({ blockedReason: null })
    expect(getPropertyAction({ ...ready, ownership: ours, balance: 79 })).toMatchObject({ blockedReason: '코인이 1개 모자라요. (지금 79코인)' })
  })
})
