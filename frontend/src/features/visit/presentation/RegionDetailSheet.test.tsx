import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { RegionDetailState } from '../application/useRegionDetail'
import type { RegionDetail } from '../domain/RegionDetail'
import { RegionDetailSheet } from './RegionDetailSheet'

const visited: RegionDetail = {
  region: { regionCode: '4111759000', name: '영통1동' },
  visitCount: 2,
  visits: [
    { id: 2, visitDate: '2026-11-16', rewardEligible: true, photos: [{ id: 10, takenAt: null, fileUrl: '/api/photos/10/file' }] },
    { id: 1, visitDate: '2026-11-12', rewardEligible: false, photos: [{ id: 9, takenAt: null, fileUrl: '/api/photos/9/file' }] },
  ],
}

function renderSheet(state: RegionDetailState, onRetry = vi.fn()) {
  render(
    <MemoryRouter>
      <RegionDetailSheet state={state} regionName="영통1동" onRetry={onRetry} onClose={vi.fn()} />
    </MemoryRouter>,
  )
  return onRetry
}

describe('RegionDetailSheet', () => {
  it('방문 횟수와 날짜별 사진, 코인 대상 여부, 사진 올리기를 보여준다', () => {
    renderSheet({ status: 'ready', detail: visited, ownership: { status: 'unowned' } })

    expect(screen.getByText('우리 그룹 방문 2번')).toBeTruthy()
    expect(screen.getByText('아직 주인이 없는 동네예요')).toBeTruthy()
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
    expect(screen.getByText('과동기 탐험대의 랜드마크')).toBeTruthy()
  })

  it('불러오지 못하면 다시 불러오기를 누를 수 있다', () => {
    const onRetry = renderSheet({ status: 'error', message: '동네 정보를 불러오지 못했어요.' })
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
