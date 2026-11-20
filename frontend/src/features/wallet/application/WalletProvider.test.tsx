import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../shared/components/toast/ToastProvider'
import { WalletButton } from '../presentation/WalletButton'
import { WalletProvider } from './WalletProvider'
import { useWalletContext } from './useWallet'
import type { Settlement } from '../domain/Wallet'

vi.mock('../../../api/endpoints/wallet', () => ({
  getWallet: vi.fn().mockResolvedValue({ balance: 340, transactions: [], nextCursor: null }),
}))

function Announce({ settlement }: { settlement: Settlement | undefined }) {
  const { announceSettlement } = useWalletContext()
  return (
    <button
      type="button"
      onClick={() => announceSettlement({ groupId: 101, groupName: '밥친구들', regionCode: '4111759000', regionName: '영통1동', settlement })}
    >
      정산
    </button>
  )
}

function renderWith(settlement: Settlement | undefined) {
  render(
    <MemoryRouter>
      <ToastProvider>
        <WalletProvider>
          <WalletButton groupId={101} groupName="밥친구들" fallbackBalance={0} />
          <Announce settlement={settlement} />
        </WalletProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('WalletProvider', () => {
  it('지갑 API의 잔액을 보여준다', async () => {
    renderWith(undefined)
    expect(await screen.findByRole('button', { name: /그룹 지갑 340코인/ })).toBeTruthy()
  })

  it('첫 방문 보상이면 지갑 숫자, 코인 Toast, 코인 카드를 모두 띄운다', async () => {
    renderWith({ reward: 100, tollPaid: 0, balance: 440 })
    await screen.findByRole('button', { name: /340코인/ })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '정산' })))

    expect(screen.getByRole('button', { name: /그룹 지갑 440코인, 방금 \+100/ })).toBeTruthy()
    expect(screen.getByText('영통1동 첫 방문으로 받았어요')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '새 동네 발견' })).toBeTruthy()
  })

  it('다시 방문 보상은 Toast만 띄우고 코인 카드는 띄우지 않는다', async () => {
    renderWith({ reward: 10, tollPaid: 0, balance: 350 })
    await screen.findByRole('button', { name: /340코인/ })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '정산' })))

    expect(screen.getByText('영통1동에 다시 와서 받았어요')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('정산 결과가 없으면 아무것도 바꾸지 않는다', async () => {
    renderWith(undefined)
    await screen.findByRole('button', { name: /340코인/ })
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '정산' })))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: /그룹 지갑 340코인, 자세히 보기/ })).toBeTruthy()
  })
})
