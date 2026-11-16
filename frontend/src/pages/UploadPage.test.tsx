import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { GroupContext, type GroupContextValue } from '../features/group/application/groupContext'
import { UploadPage } from './UploadPage'

const group = { groupId: 101, name: '밥친구들', inviteCode: 'WK7Q2M', members: [] }

function renderPage() {
  const value: GroupContextValue = {
    groups: [group],
    currentGroup: group,
    isLoading: false,
    loadErrorMessage: null,
    refreshGroups: async () => {},
    selectGroup: () => {},
    createGroup: async () => group,
    joinGroup: async () => group,
  }
  return render(
    <MemoryRouter>
      <GroupContext.Provider value={value}>
        <UploadPage />
      </GroupContext.Provider>
    </MemoryRouter>,
  )
}

const jpeg = (name: string) => new File([new Uint8Array(2048)], name, { type: 'image/jpeg' })

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})

describe('UploadPage', () => {
  it('처음에는 사진 고르기 안내를 보여준다', () => {
    renderPage()
    expect(screen.getByText('오늘 함께 걸은 사진을 골라주세요')).toBeTruthy()
    expect(screen.getByRole('link', { name: '밥친구들에 올려요, 그룹 바꾸기' }).getAttribute('href')).toBe('/groups')
  })

  it('JPEG가 아닌 사진은 빼고 올릴 장수를 센다', () => {
    const { container } = renderPage()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [jpeg('a.jpg'), new File(['x'], 'b.png', { type: 'image/png' })] } })

    expect(screen.getByRole('button', { name: '1장 올리기' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('1장은 JPEG가 아니거나')
  })

  it('올리면 동네 결과를 보여주고, 위치 없는 사진은 동네를 고르게 한다', async () => {
    const { container } = renderPage()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [jpeg('walk.jpg'), jpeg('nogps.jpg')] } })
    fireEvent.click(screen.getByRole('button', { name: '2장 올리기' }))

    expect(await screen.findByText(/2장 중 1장을/, undefined, { timeout: 4000 })).toBeTruthy()
    expect(screen.getByText('코인 대상')).toBeTruthy()
    expect(screen.getByText('동네를 골라주세요')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '동네 고르기' }))
    const sheet = await screen.findByRole('dialog', { name: '어느 동네에서 찍었나요?' })
    const regionButton = await within(sheet).findAllByRole('button', { name: /동/ }, { timeout: 4000 })
    fireEvent.click(regionButton[1])

    expect(await screen.findByText('위치 정보가 없어 직접 고른 동네로 기록했어요', undefined, { timeout: 4000 })).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('동네를 골라주세요')).toBeNull())
  })
})
