import { request, USE_MOCK_API } from '../client'
import { mockServer } from '../mock/mockServer'
import { ApiError } from '../../shared/types/api'
import type { Property, PropertyChangeResult } from '../../features/game/domain/Property'

/** 소유 정보를 바꾼 뒤 지도·동네 카드가 다시 불러오도록 알리는 이벤트 이름 */
export const PROPERTIES_CHANGED_EVENT = 'ubaljeok:properties-changed'

/** 같은 그룹의 소유 정보는 잠깐 동안 한 번만 불러온다 (지도 건물 아이콘이 동네마다 묻기 때문). */
const CACHE_MS = 3000
const cache = new Map<number, { at: number; promise: Promise<Property[]> }>()

/**
 * 모든 그룹이 함께 쓰는 지도판의 소유 정보 (MVP-IMPLEMENTATION.md 4장 `GET /api/game/properties`).
 * 서버에 아직 API가 없으면(404) 주인 없는 지도판으로 본다.
 */
export function listProperties(groupId: number): Promise<Property[]> {
  const cached = cache.get(groupId)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise

  const promise = (async () => {
    if (USE_MOCK_API) return mockServer.listProperties(groupId)
    try {
      const { properties } = await request<{ properties: Property[] }>(`/game/properties?groupId=${groupId}`)
      return properties
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return []
      throw error
    }
  })()
  cache.set(groupId, { at: Date.now(), promise })
  promise.catch(() => cache.delete(groupId))
  return promise
}

/** 구매·업그레이드 뒤: 캐시를 비우고 지도와 동네 카드에 알린다. */
function notifyChanged(groupId: number) {
  cache.clear()
  window.dispatchEvent(new CustomEvent(PROPERTIES_CHANGED_EVENT, { detail: { groupId } }))
}

/** 건물 구매 (그룹장만, 100코인). 같은 요청을 두 번 보내도 한 번만 처리되도록 Idempotency-Key를 붙인다. */
export async function purchaseBuilding(groupId: number, regionCode: string, idempotencyKey: string): Promise<PropertyChangeResult> {
  const result = USE_MOCK_API
    ? await mockServer.purchaseBuilding(groupId, regionCode)
    : await request<PropertyChangeResult>('/game/buildings/purchase', {
        method: 'POST',
        body: JSON.stringify({ groupId, regionCode }),
        headers: { 'Idempotency-Key': idempotencyKey },
      })
  notifyChanged(groupId)
  return result
}

/** 랜드마크 구매 (우리 그룹 건물, 그룹장만, 80코인) */
export async function upgradeBuilding(groupId: number, regionCode: string, idempotencyKey: string): Promise<PropertyChangeResult> {
  const result = USE_MOCK_API
    ? await mockServer.upgradeBuilding(groupId, regionCode)
    : await request<PropertyChangeResult>('/game/buildings/upgrade', {
        method: 'POST',
        body: JSON.stringify({ groupId, regionCode }),
        headers: { 'Idempotency-Key': idempotencyKey },
      })
  notifyChanged(groupId)
  return result
}
