import { render, screen } from '@testing-library/react'

import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('퍼센트 진행률을 읽을 수 있게 알려준다', () => {
    render(<ProgressBar label="사진 올리는 중" caption="3장 중 2장" value={66.6} />)

    const bar = screen.getByRole('progressbar', { name: '사진 올리는 중' })
    expect(bar.getAttribute('aria-valuenow')).toBe('67')
    expect(screen.getByText('3장 중 2장')).toBeTruthy()
  })

  it('0–100 밖의 값은 끝값으로 맞춘다', () => {
    render(<ProgressBar label="올리는 중" value={140} />)

    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })

  it('진행률을 모르면 aria-valuenow를 비운다', () => {
    render(<ProgressBar label="준비하는 중" value={null} />)

    expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false)
  })

  it('단계 모드는 지금 단계와 전체 단계를 알려준다', () => {
    render(<ProgressBar label="영상 만드는 중" steps={{ total: 3, current: 2 }} />)

    const bar = screen.getByRole('progressbar', { name: '영상 만드는 중' })
    expect(bar.getAttribute('aria-valuetext')).toBe('3단계 중 2단계')
    expect(bar.querySelectorAll('[data-step]')).toHaveLength(3)
  })

  it('실패 상태를 표시한다', () => {
    render(<ProgressBar label="영상을 만들지 못했어요" steps={{ total: 3, current: 2 }} status="error" />)

    expect(screen.getByRole('progressbar').getAttribute('aria-invalid')).toBe('true')
  })
})
