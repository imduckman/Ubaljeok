import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/types/api'
import type { RegionDetail } from '../domain/RegionDetail'
import { RegionExplorer } from './RegionExplorer'

vi.mock('../../../api/endpoints/visits', () => ({
  getRegionDetail: vi.fn(),
  getRegionOwnership: vi.fn(),
}))

import { getRegionDetail, getRegionOwnership } from '../../../api/endpoints/visits'

const detailApi = vi.mocked(getRegionDetail)
const ownershipApi = vi.mocked(getRegionOwnership)

const visited: RegionDetail = {
  region: { regionCode: '4111759000', name: '영통1동' },
  visitCount: 3,
  visits: [{ id: 1, visitDate: '2026-11-16', rewardEligible: true, photos: [{ id: 10, takenAt: null, fileUrl: '/api/photos/10/file' }] }],
}

function renderExplorer(onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <RegionExplorer groupId={101} regionCode="4111759000" regionName="영통1동" onClose={onClose} />
    </MemoryRouter>,
  )
  return onClose
}

afterEach(() => {
  detailApi.mockReset()
  ownershipApi.mockReset()
})

describe('RegionExplorer', () => {
  it('먼저 대표 카드만 보여주고, 누르면 세부 시트를 펼친다', async () => {
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'ours', level: 'landmark' })
    renderExplorer()

    expect(await screen.findByText('우리 그룹 방문 3번')).toBeTruthy()
    expect(screen.getByText('우리 랜드마크')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '영통1동 자세히 보기' }))
    expect(screen.getByRole('dialog', { name: '영통1동' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '11월 16일' })).toBeTruthy()
  })

  it('세부 시트를 닫으면 대표 카드로 돌아가고, 카드의 닫기는 선택을 끝낸다', async () => {
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'unowned' })
    const onClose = renderExplorer()

    fireEvent.click(await screen.findByRole('button', { name: '영통1동 자세히 보기' }))
    fireEvent.click(screen.getAllByRole('button', { name: '닫기' }).at(-1)!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('우리 그룹 방문 3번')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('불러오지 못하면 대표 카드에서 다시 불러올 수 있다', async () => {
    detailApi.mockRejectedValueOnce(new ApiError(500, 'UNKNOWN', '동네 정보를 불러오지 못했어요.'))
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'unowned' })
    renderExplorer()

    fireEvent.click(await screen.findByRole('button', { name: '다시 불러오기' }))
    expect(await screen.findByText('우리 그룹 방문 3번')).toBeTruthy()
  })
})
