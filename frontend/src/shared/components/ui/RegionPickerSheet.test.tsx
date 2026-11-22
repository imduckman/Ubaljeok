import { fireEvent, render, screen } from '@testing-library/react'
import type { Region } from '../../types/region'
import { RegionPickerSheet } from './RegionPickerSheet'

const regions: Region[] = [
  { regionCode: '4111560000', name: '행궁동', sigunguName: '수원시팔달구' },
  { regionCode: '4111759000', name: '영통1동', sigunguName: '수원시영통구' },
]

describe('RegionPickerSheet', () => {
  it('열면 동네 목록을 불러오고, 검색해서 고르면 동네를 넘겨준다', async () => {
    const onPick = vi.fn()
    render(<RegionPickerSheet isOpen onClose={() => {}} onPick={onPick} loadRegions={async () => regions} />)

    expect(await screen.findByRole('button', { name: /영통1동/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('동네 이름'), { target: { value: '행궁' } })
    expect(screen.queryByRole('button', { name: /영통1동/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /행궁동/ }))
    expect(onPick).toHaveBeenCalledWith(regions[0])
  })

  it('맞는 동네가 없으면 지원 지역을 안내한다', async () => {
    render(<RegionPickerSheet isOpen onClose={() => {}} onPick={() => {}} loadRegions={async () => regions} />)
    await screen.findByRole('button', { name: /행궁동/ })
    fireEvent.change(screen.getByLabelText('동네 이름'), { target: { value: '해운대' } })
    expect(screen.getByText(/지금은 수원시 동네만 고를 수 있어요/)).toBeTruthy()
  })

  it('못 불러오면 다시 불러올 수 있다', async () => {
    const loadRegions = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(regions)
    render(<RegionPickerSheet isOpen onClose={() => {}} onPick={() => {}} loadRegions={loadRegions} />)

    fireEvent.click(await screen.findByRole('button', { name: '다시 불러오기' }))
    expect(await screen.findByRole('button', { name: /행궁동/ })).toBeTruthy()
    expect(loadRegions).toHaveBeenCalledTimes(2)
  })

  it('닫혀 있으면 아무것도 불러오지 않는다', () => {
    const loadRegions = vi.fn(async () => regions)
    render(<RegionPickerSheet isOpen={false} onClose={() => {}} onPick={() => {}} loadRegions={loadRegions} />)
    expect(loadRegions).not.toHaveBeenCalled()
  })
})
