import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/types/api'
import type { RegionDetail } from '../domain/RegionDetail'
import { RegionExplorer } from './RegionExplorer'
import { useRegionDetail } from '../application/useRegionDetail'

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
  it('그룹·동네가 바뀌면 새로 로딩하고 이전 요청의 늦은 응답은 무시한다', async () => {
    let resolvePrevious!: (detail: RegionDetail) => void
    detailApi.mockReturnValueOnce(new Promise((resolve) => { resolvePrevious = resolve }))
    detailApi.mockResolvedValueOnce(visited)
    ownershipApi.mockResolvedValue({ status: 'unowned' })
    const { result, rerender } = renderHook(
      ({ groupId, regionCode }) => useRegionDetail(groupId, regionCode),
      { initialProps: { groupId: 101, regionCode: visited.region.regionCode } },
    )
    rerender({ groupId: 102, regionCode: visited.region.regionCode })
    await waitFor(() => expect(result.current.state.status).toBe('ready'))
    await act(async () => resolvePrevious({ ...visited, visitCount: 99 }))
    expect(result.current.state).toMatchObject({ status: 'ready', detail: { visitCount: 3 } })

    let resolveNext!: (detail: RegionDetail) => void
    detailApi.mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve }))
    rerender({ groupId: 102, regionCode: '4111156000' })
    expect(result.current.state.status).toBe('loading')
    await act(async () => resolveNext({
      ...visited, region: { regionCode: '4111156000', name: '파장동' },
    }))
    expect(result.current.state).toMatchObject({ status: 'ready', detail: { region: { name: '파장동' } } })
  })

  it('대표 카드의 [갤러리]·[건물 관리]가 상세 시트를 그 탭으로 열고, 시트 안 탭으로 바꿀 수 있다', async () => {
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'ours', level: 'landmark' })
    renderExplorer()

    expect(await screen.findByText(/우리 그룹 방문 3번/)).toBeTruthy()
    expect(screen.getByText('우리 랜드마크')).toBeTruthy()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '갤러리' }))
    const sheet = screen.getByRole('dialog', { name: '영통1동' })
    expect(within(sheet).getByRole('tab', { name: '갤러리', selected: true })).toBeTruthy()
    expect(within(within(sheet).getByRole('tabpanel')).getByRole('heading', { name: '11월 16일' })).toBeTruthy()
    expect(within(sheet).queryByRole('region', { name: '영통1동 건물 관리' })).toBeNull()

    fireEvent.click(within(sheet).getByRole('tab', { name: '건물 관리' }))
    const buildingPanel = within(sheet).getByRole('tabpanel')
    expect(within(buildingPanel).getByRole('region', { name: '영통1동 건물 관리' })).toBeTruthy()
    expect(within(buildingPanel).getByText('우리 그룹 랜드마크')).toBeTruthy()
    expect(within(sheet).queryByRole('heading', { name: '11월 16일' })).toBeNull()

    fireEvent.click(within(sheet).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '건물 관리' }))
    expect(within(screen.getByRole('dialog', { name: '영통1동' })).getByRole('tab', { name: '건물 관리', selected: true })).toBeTruthy()
  })

  it('세부 시트를 닫으면 대표 카드로 돌아가고, 카드의 닫기는 선택을 끝낸다', async () => {
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'unowned' })
    const onClose = renderExplorer()

    await screen.findByText(/우리 그룹 방문 3번/)
    fireEvent.click(screen.getByRole('button', { name: '갤러리' }))
    fireEvent.click(screen.getAllByRole('button', { name: '닫기' }).at(-1)!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(/우리 그룹 방문 3번/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('불러오지 못하면 대표 카드에서 다시 불러올 수 있다', async () => {
    detailApi.mockRejectedValueOnce(new ApiError(500, 'UNKNOWN', '동네 정보를 불러오지 못했어요.'))
    detailApi.mockResolvedValue(visited)
    ownershipApi.mockResolvedValue({ status: 'unowned' })
    renderExplorer()

    fireEvent.click(await screen.findByRole('button', { name: '다시 불러오기' }))
    expect(await screen.findByText(/우리 그룹 방문 3번/)).toBeTruthy()
  })
})
