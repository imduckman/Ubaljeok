import { fireEvent, render, screen } from '@testing-library/react'

import { PhotoTile } from './PhotoTile'

describe('PhotoTile', () => {
  it('사진을 설명과 함께 보여준다', () => {
    render(<PhotoTile src="/sample.jpg" alt="행궁동 사진" />)

    expect(screen.getByRole('img', { name: '행궁동 사진' })).toBeTruthy()
  })

  it('누르면 onSelect가 불리고 선택 순서를 읽어준다', () => {
    const onSelect = vi.fn()
    render(<PhotoTile src="/sample.jpg" alt="행궁동 사진" selectedOrder={2} isCover onSelect={onSelect} />)

    const button = screen.getByRole('button', { name: '행궁동 사진, 2번째로 선택됨, 대표 사진' })
    expect(button.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('클릭 가능한 더 보기 타일은 일반 버튼이다', () => {
    const onSelect = vi.fn()
    render(<PhotoTile src="/sample.jpg" alt="행궁동 사진" moreCount={30} onSelect={onSelect} />)

    const button = screen.getByRole('button', { name: '행궁동 사진, 사진 30장 더 있음' })
    expect(button.hasAttribute('aria-pressed')).toBe(false)
    fireEvent.click(button)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('지우기 버튼은 선택 동작과 따로 동작한다', () => {
    const onSelect = vi.fn()
    const onRemove = vi.fn()
    render(<PhotoTile src="/sample.jpg" alt="행궁동 사진" onSelect={onSelect} onRemove={onRemove} />)

    fireEvent.click(screen.getByRole('button', { name: '사진 빼기: 행궁동 사진' }))
    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('사진을 불러오지 못하면 빈 사진 칸으로 바꾼다', () => {
    render(<PhotoTile src="/broken.jpg" alt="행궁동 사진" />)

    fireEvent.error(screen.getByRole('img', { name: '행궁동 사진' }))
    expect(screen.getByRole('img', { name: '행궁동 사진 (불러오지 못함)' })).toBeTruthy()
  })

  it('올리는 중·실패·더 보기 상태를 글로도 알려준다', () => {
    const { rerender } = render(<PhotoTile src="/sample.jpg" alt="사진 1" status="uploading" progress={40} />)
    expect(screen.getByText('올리는 중')).toBeTruthy()

    rerender(<PhotoTile src="/sample.jpg" alt="사진 1" status="error" />)
    expect(screen.getByText('올리지 못함')).toBeTruthy()

    rerender(<PhotoTile src="/sample.jpg" alt="사진 1" moreCount={30} />)
    expect(screen.getByText('+30')).toBeTruthy()
    expect(screen.getByText('사진 30장 더 있음')).toBeTruthy()
  })
})
