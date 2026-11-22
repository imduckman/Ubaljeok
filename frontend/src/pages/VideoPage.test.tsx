import { fireEvent, render, screen } from '@testing-library/react'
import { mockDiaryServer } from '../api/mock/mockDiary'
import { MemoryRouter } from 'react-router'
import { GroupContext, type GroupContextValue } from '../features/group/application/groupContext'
import { VideoPage } from './VideoPage'

const defaultGroup = { groupId: 101, name: '밥친구들', inviteCode: 'WK7Q2M', members: [] }

function renderPage(group = defaultGroup) {
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
        <VideoPage />
      </GroupContext.Provider>
    </MemoryRouter>,
  )
}

const photoButtons = () => screen.getAllByRole('button', { name: /사진(,|$)/ })

describe('VideoPage', () => {
  it('3장을 고르기 전에는 만들 수 없고, 처음 고른 사진이 대표가 된다', async () => {
    renderPage()
    expect(await screen.findByText('사진 고르기')).toBeTruthy()
    const makeButton = screen.getByRole('button', { name: '영상 만들기' }) as HTMLButtonElement
    expect(makeButton.disabled).toBe(true)
    expect(screen.getByText('사진을 3장 더 골라주세요')).toBeTruthy()

    const [first, second, third] = photoButtons()
    fireEvent.click(first)
    fireEvent.click(second)
    expect(screen.getByText('사진을 1장 더 골라주세요')).toBeTruthy()
    fireEvent.click(third)

    expect(makeButton.disabled).toBe(false)
    expect(screen.getByText('3장으로 영상을 만들어요')).toBeTruthy()
    expect(screen.getByRole('radio', { name: /^1\./ }).getAttribute('aria-checked')).toBe('true')
  })

  it('대표 사진을 바꾸고, 5장까지만 고를 수 있다', async () => {
    renderPage()
    await screen.findByText('사진 고르기')
    photoButtons().slice(0, 6).forEach((button) => fireEvent.click(button))
    expect(screen.getByText('5/5')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: /^3\./ }))
    expect(screen.getByRole('radio', { name: /^3\./ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: /^1\./ }).getAttribute('aria-checked')).toBe('false')
  })

  it('빠르게 연달아 눌러도 고른 사진이 모두 남는다', async () => {
    renderPage()
    await screen.findByText('사진 고르기')
    const buttons = photoButtons()
    ;[0, 4, 1, 2].forEach((index) => buttons[index].click())
    expect(await screen.findByText('4/5')).toBeTruthy()
  })

  it('스타일을 하나 고를 수 있다', async () => {
    renderPage()
    await screen.findByText('사진 고르기')
    fireEvent.click(screen.getByRole('radio', { name: /영화처럼/ }))
    expect(screen.getByRole('radio', { name: /영화처럼/ }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('radio', { name: /자연스럽게/ }).getAttribute('aria-checked')).toBe('false')
  })

  it('만드는 중에 나갔다 돌아오면 진행 중인 작업을 이어서 보여준다', async () => {
    // 다른 테스트와 섞이지 않게 별도 그룹을 쓴다
    const group = { ...defaultGroup, groupId: 202 }
    await mockDiaryServer.createJob({ groupId: 202, photoIds: [20201, 20202, 20203], representativePhotoId: 20201, style: 'natural' })

    const first = renderPage(group)
    expect(await screen.findByText('영상을 만들고 있어요')).toBeTruthy()
    first.unmount()

    renderPage(group)
    expect(await screen.findByText('영상을 만들고 있어요')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '영상 만들기' })).toBeNull()
  })
})
