import { afterEach, expect, it, vi } from 'vitest'
import { listProperties, purchaseBuilding, upgradeBuilding } from './game'

vi.mock('../client', () => ({
  USE_MOCK_API: false,
  request: vi.fn(),
}))

import { request } from '../client'
import { ApiError } from '../../shared/types/api'

const http = vi.mocked(request)
const property = { regionCode: '4111759000', ownerGroupId: 101, ownerGroupName: '밥친구들', level: 'building' as const }

afterEach(() => http.mockReset())

it('reads the shared property board for a group', async () => {
  http.mockResolvedValueOnce({ properties: [property] })
  await expect(listProperties(201)).resolves.toEqual([property])
  expect(http).toHaveBeenCalledWith('/game/properties?groupId=201')
})

it('treats a missing properties API as an empty board', async () => {
  http.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', '없음'))
  await expect(listProperties(202)).resolves.toEqual([])
})

it('sends purchase and upgrade with an idempotency key', async () => {
  const result = { property, walletBalance: 240, transactionId: 9 }
  http.mockResolvedValue(result)
  await expect(purchaseBuilding(101, '4111759000', 'key-1')).resolves.toEqual(result)
  expect(http).toHaveBeenCalledWith('/game/buildings/purchase', {
    method: 'POST',
    body: JSON.stringify({ groupId: 101, regionCode: '4111759000' }),
    headers: { 'Idempotency-Key': 'key-1' },
  })
  await upgradeBuilding(101, '4111759000', 'key-2')
  expect(http).toHaveBeenLastCalledWith('/game/buildings/upgrade', {
    method: 'POST',
    body: JSON.stringify({ groupId: 101, regionCode: '4111759000' }),
    headers: { 'Idempotency-Key': 'key-2' },
  })
})
