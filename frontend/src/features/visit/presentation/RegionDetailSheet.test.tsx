import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { RegionDetailState } from '../application/useRegionDetail'
import type { RegionDetail } from '../domain/RegionDetail'
import { RegionDetailSheet, type RegionTab } from './RegionDetailSheet'

const visited: RegionDetail = {
  region: { regionCode: '4111759000', name: '영통1동' },
  visitCount: 2,
  visits: [
    { id: 2, visitDate: '2026-11-16', rewardEligible: true, photos: [{ id: 10, takenAt: null, fileUrl: '/api/photos/10/file' }] },
    { id: 1, visitDate: '2026-11-12', rewardEligible: false, photos: [{ id: 9, takenAt: null, fileUrl: '/api/photos/9/file' }] },
  ],
}

function renderSheet(state: RegionDetailState, onRetry = vi.fn(), tab: RegionTab = 'gallery', onTabChange = vi.fn()) {
  render(
    <MemoryRouter>
      <RegionDetailSheet state={state} regionName="영통1동" tab={tab} onTabChange={onTabChange} onRetry={onRetry} onClose={vi.fn()} />
    </MemoryRouter>,
  )
  return onRetry
}

describe('RegionDetailSheet', () => {
  it('방문 횟수와 날짜별 사진, 코인 대상 여부, 사진 올리기를 보여준다', () => {
    renderSheet({ status: 'ready', detail: visited, ownership: { status: 'unowned' } })

    expect(screen.getByText('우리 그룹 방문 2번')).toBeTruthy()
    expect(screen.getByRole('tab', { name: '갤러리', selected: true })).toBeTruthy()
    expect(screen.queryByRole('region', { name: '영통1동 건물 관리' })).toBeNull()
    expect(screen.getByRole('heading', { name: '11월 16일' })).toBeTruthy()
    expect(screen.getByText('코인 대상')).toBeTruthy()
    expect(screen.getByText('코인 제외')).toBeTruthy()
    expect(screen.getByRole('button', { name: '사진 올리기' })).toBeTruthy()
  })

  it('사진이 없으면 첫 발자국 안내와 사진 올리기 버튼을 보여준다', () => {
    renderSheet({
      status: 'ready',
      detail: { region: visited.region, visitCount: 0, visits: [] },
      ownership: { status: 'theirs', ownerGroupName: '과동기 탐험대', level: 'landmark' },
    })

    expect(screen.getByText('아직 이 동네 사진이 없어요. 첫 발자국을 남겨볼까요?')).toBeTruthy()
    expect(screen.getByRole('button', { name: '사진 올리기' })).toBeTruthy()
  })

  it('건물 관리 탭은 사진 대신 성장 길을 보여주고, 탭을 누르면 바꿔 달라고 알린다', () => {
    const onTabChange = vi.fn()
    renderSheet({ status: 'ready', detail: visited, ownership: { status: 'ours', level: 'landmark' } }, vi.fn(), 'building', onTabChange)

    const shown = screen.getByRole('tabpanel')
    expect(within(shown).getByRole('region', { name: '영통1동 건물 관리' })).toBeTruthy()
    expect(within(shown).getByText('우리 랜드마크 완성!')).toBeTruthy()
    expect(within(shown).getByText('우리 그룹 랜드마크')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: '11월 16일' })).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: '갤러리' }))
    expect(onTabChange).toHaveBeenCalledWith('gallery')
  })

  it('불러오지 못하면 다시 불러오기를 누를 수 있다', () => {
    const onRetry = renderSheet({ status: 'error', message: '동네 정보를 불러오지 못했어요.' })
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('더보기를 누른 방문의 사진만 모두 펼치고 사진 순서를 유지한다', () => {
    const detail: RegionDetail = {
      ...visited,
      visits: visited.visits.map((visit, visitIndex) => ({
        ...visit,
        photos: Array.from({ length: visitIndex === 0 ? 12 : 10 }, (_, index) => {
          const id = visit.id * 100 + index
          return { id, takenAt: null, fileUrl: `/api/photos/${id}/file` }
        }),
      })),
    }
    renderSheet({ status: 'ready', detail, ownership: { status: 'unowned' } })

    expect(screen.getAllByRole('img')).toHaveLength(16)
    fireEvent.click(screen.getByRole('button', { name: /11월 16일.*사진 5장 더 있음/ }))
    expect(screen.getAllByRole('img')).toHaveLength(20)
    expect(screen.queryByRole('button', { name: /11월 16일.*더 있음/ })).toBeNull()
    expect(screen.getByRole('button', { name: /11월 12일.*사진 3장 더 있음/ })).toBeTruthy()
    expect(screen.getAllByRole('img').slice(0, 12).map((image) => image.getAttribute('src')))
      .toEqual(detail.visits[0].photos.map((photo) => photo.fileUrl))

    fireEvent.click(screen.getByRole('button', { name: /11월 12일.*사진 3장 더 있음/ }))
    expect(screen.getAllByRole('img')).toHaveLength(22)
  })

  it('사진이 8장이면 모두 보여주고 더보기 버튼을 만들지 않는다', () => {
    renderSheet({
      status: 'ready',
      detail: {
        ...visited,
        visits: [{
          ...visited.visits[0],
          photos: Array.from({ length: 8 }, (_, id) => ({ id, takenAt: null, fileUrl: `/photos/${id}` })),
        }],
      },
      ownership: { status: 'unowned' },
    })
    expect(screen.getAllByRole('img')).toHaveLength(8)
    expect(screen.queryByRole('button', { name: /더 있음/ })).toBeNull()
  })
})
