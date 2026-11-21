import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../../shared/components/toast/ToastProvider'
import { WalletButton } from '../presentation/WalletButton'
import { WalletProvider } from './WalletProvider'
import { useWalletContext } from './useWallet'
import type { Settlement, Wallet } from '../domain/Wallet'
import { getWallet } from '../../../api/endpoints/wallet'

vi.mock('../../../api/endpoints/wallet', () => ({
  getWallet: vi.fn().mockResolvedValue({ balance: 340, transactions: [], nextCursor: null }),
}))

function Announce({ settlement }: { settlement: Settlement | undefined }) {
  const { announceSettlement, loadWallet } = useWalletContext()
  return (
    <>
      <button
        type="button"
        onClick={() => announceSettlement({ groupId: 101, groupName: '밥친구들', regionCode: '4111759000', regionName: '영통1동', settlement })}
      >
        정산
      </button>
      <button type="button" onClick={() => void loadWallet(101)}>
        지갑 새로고침
      </button>
    </>
  )
}

function renderWith(settlement: Settlement | undefined) {
  render(
    <MemoryRouter>
      <ToastProvider>
        <WalletProvider>
          <WalletButton groupId={101} groupName="밥친구들" />
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

  it('정산 전에 시작한 지갑 조회가 늦게 끝나도 최신 정산 잔액을 유지한다', async () => {
    let resolveWallet!: (wallet: Wallet) => void
    vi.mocked(getWallet).mockReturnValueOnce(new Promise((resolve) => { resolveWallet = resolve }))
    renderWith({ reward: 10, tollPaid: 0, balance: 350 })

    fireEvent.click(screen.getByRole('button', { name: '정산' }))
    expect(screen.getByRole('button', { name: /그룹 지갑 350코인/ })).toBeTruthy()
    await act(async () => resolveWallet({ balance: 340, transactions: [], nextCursor: null }))
    expect(screen.getByRole('button', { name: /그룹 지갑 350코인/ })).toBeTruthy()
  })

  it('여러 지갑 조회가 역순으로 끝나도 마지막에 요청한 잔액을 유지한다', async () => {
    let resolveFirst!: (wallet: Wallet) => void
    let resolveLatest!: (wallet: Wallet) => void
    vi.mocked(getWallet)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveLatest = resolve }))
    renderWith(undefined)
    fireEvent.click(screen.getByRole('button', { name: '지갑 새로고침' }))

    await act(async () => resolveLatest({ balance: 300, transactions: [], nextCursor: null }))
    await act(async () => resolveFirst({ balance: 400, transactions: [], nextCursor: null }))
    expect(screen.getByRole('button', { name: /그룹 지갑 300코인/ })).toBeTruthy()
  })

  it('최초 조회 실패는 0코인 대신 확인 필요를 표시하고 재시도로 복구한다', async () => {
    vi.mocked(getWallet).mockRejectedValueOnce(new Error('offline'))
    renderWith(undefined)
    fireEvent.click(await screen.findByRole('button', { name: /그룹 지갑 확인 필요/ }))
    expect(screen.getByRole('alert').textContent).toContain('지갑을 불러오지 못했어요')
    expect(screen.queryByRole('button', { name: /그룹 지갑 0코인/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    await screen.findByRole('button', { name: /그룹 지갑 340코인/ })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('재조회 실패 시 기존 잔액을 유지하면서 실패를 알린다', async () => {
    renderWith(undefined)
    await screen.findByRole('button', { name: /그룹 지갑 340코인/ })
    vi.mocked(getWallet).mockRejectedValueOnce(new Error('offline'))
    fireEvent.click(screen.getByRole('button', { name: '지갑 새로고침' }))
    fireEvent.click(await screen.findByRole('button', { name: /그룹 지갑 340코인, 잔액 조회 실패/ }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('region', { name: /공동 지갑, 340코인/ })).toBeTruthy()
  })

  it('정산 전에 시작한 조회가 실패해도 새 정산의 성공 상태를 유지한다', async () => {
    let rejectWallet!: (error: Error) => void
    vi.mocked(getWallet).mockReturnValueOnce(new Promise((_resolve, reject) => { rejectWallet = reject }))
    renderWith({ reward: 10, tollPaid: 0, balance: 350 })
    fireEvent.click(screen.getByRole('button', { name: '정산' }))
    await act(async () => rejectWallet(new Error('late failure')))
    expect(screen.getByRole('button', { name: /그룹 지갑 350코인/ })).toBeTruthy()
    expect(screen.queryByText('확인 필요')).toBeNull()
  })
})
