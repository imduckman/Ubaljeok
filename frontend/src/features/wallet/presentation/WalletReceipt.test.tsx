import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WalletReceipt } from './WalletReceipt'

const names = new Map([['4111574000', '행궁동']])
const regionNameOf = (code: string | null) => (code ? names.get(code) ?? '' : '')

describe('WalletReceipt', () => {
  it('거래마다 이름, 동네, 들어오고 나간 코인을 보여준다', () => {
    render(
      <WalletReceipt
        state={{
          status: 'ready',
          balance: 310,
          hasMore: false,
          transactions: [
            { id: 2, type: 'toll_paid', amount: -30, regionCode: '4111574000', createdAt: '2026-11-22T16:00:01+09:00' },
            { id: 1, type: 'first_visit', amount: 100, regionCode: '4111574000', createdAt: '2026-11-22T16:00:00+09:00' },
          ],
        }}
        regionNameOf={regionNameOf}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: /^11월 2\d일$/ })).toBeTruthy()
    expect(screen.getByText('통행료 지불')).toBeTruthy()
    expect(screen.getAllByText('행궁동')).toHaveLength(2)
    expect(screen.getByText('−30')).toBeTruthy()
    expect(screen.getByText('잔액 310')).toBeTruthy()
    expect(screen.getByText('처음 방문')).toBeTruthy()
    expect(screen.getByText('+100')).toBeTruthy()
    expect(screen.getByText('잔액 340')).toBeTruthy()
  })

  it('거래가 없으면 안내 문구, 실패하면 다시 불러오기를 보여준다', () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <WalletReceipt state={{ status: 'ready', transactions: [], balance: 0, hasMore: false }} regionNameOf={regionNameOf} onRetry={onRetry} />,
    )
    expect(screen.getByText('코인을 받거나 쓰면 영수증이 여기에 쌓여요.')).toBeTruthy()

    rerender(<WalletReceipt state={{ status: 'error' }} regionNameOf={regionNameOf} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
