/**
 * 가짜 서버의 동네 소유 정보 (메모리, 새로고침하면 처음 상태로 돌아간다).
 * 처음에는 과동기 탐험대(102)가 행궁동 랜드마크와 파장동 건물을 가지고 있다.
 */
import type { Property } from '../../features/game/domain/Property'

const properties = new Map<string, Property>([
  ['4111574000', { regionCode: '4111574000', ownerGroupId: 102, ownerGroupName: '과동기 탐험대', level: 'landmark' }],
  ['4111156000', { regionCode: '4111156000', ownerGroupId: 102, ownerGroupName: '과동기 탐험대', level: 'building' }],
])

export function listMockProperties(): Property[] {
  return [...properties.values()].map((property) => ({ ...property }))
}

export function getMockProperty(regionCode: string): Property | undefined {
  const property = properties.get(regionCode)
  return property ? { ...property } : undefined
}

export function setMockProperty(property: Property) {
  properties.set(property.regionCode, { ...property })
}
