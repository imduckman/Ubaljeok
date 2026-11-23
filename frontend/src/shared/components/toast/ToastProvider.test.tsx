import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider'
import { useToast } from './useToast'

function Trigger() {
  const { showToast } = useToast()
  return (
    <>
      <button type="button" onClick={() => showToast({ tone: 'coin', title: '+100 코인', description: '매탄1동 첫 방문으로 받았어요' })}>
        코인
      </button>
      <button type="button" onClick={() => showToast({ tone: 'error', title: '그룹장만 할 수 있어요' })}>
        오류
      </button>
    </>
  )
}

afterEach(() => vi.useRealTimers())

describe('ToastProvider', () => {
  it('알림을 띄우고 3초 뒤 지운다', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '코인' }))
    expect(screen.getByRole('status').textContent).toContain('+100 코인')
    expect(screen.getByText('매탄1동 첫 방문으로 받았어요')).toBeTruthy()

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('오류 알림은 바로 읽히도록 alert로 띄우고, 누르면 닫힌다', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '오류' }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('그룹장만 할 수 있어요')
    fireEvent.click(alert)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
