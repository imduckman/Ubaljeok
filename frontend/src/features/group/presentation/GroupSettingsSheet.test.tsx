import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../../shared/types/api'
import type { Group } from '../domain/Group'
import { GroupSettingsSheet } from './GroupSettingsSheet'

const group: Group = {
  groupId: 101,
  name: '밥친구들',
  inviteCode: 'WK7Q2M',
  members: [
    { userId: 1, nickname: '승제', role: 'OWNER' },
    { userId: 2, nickname: '윤하', role: 'MEMBER' },
  ],
}

function renderSheet(userId: number, overrides: Partial<Parameters<typeof GroupSettingsSheet>[0]> = {}) {
  const props = {
    group,
    userId,
    isOpen: true,
    onClose: vi.fn(),
    onLeave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<GroupSettingsSheet {...props} />)
  return props
}

describe('GroupSettingsSheet', () => {
  it('그룹장에게는 나가기와 삭제가 모두 보인다', () => {
    renderSheet(1)
    expect(screen.getByRole('button', { name: '그룹 나가기' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '그룹 삭제' })).toBeTruthy()
  })

  it('멤버에게는 삭제 버튼이 보이지 않는다', () => {
    renderSheet(2)
    expect(screen.getByRole('button', { name: '그룹 나가기' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '그룹 삭제' })).toBeNull()
  })

  it('그룹장이 나가려고 하면 다음 그룹장을 알려주고, 확인하면 나간다', async () => {
    const props = renderSheet(1)
    fireEvent.click(screen.getByRole('button', { name: '그룹 나가기' }))
    expect(screen.getByText(/윤하님이 그룹장이 돼요/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '나가기' }))
    await waitFor(() => expect(props.onLeave).toHaveBeenCalledTimes(1))
  })

  it('혼자 남은 그룹에서 나가면 그룹이 삭제된다고 알려준다', () => {
    renderSheet(1, { group: { ...group, members: [group.members[0]] } })
    fireEvent.click(screen.getByRole('button', { name: '그룹 나가기' }))
    expect(screen.getByText(/혼자 남은 그룹이라 나가면 그룹이 삭제돼요/)).toBeTruthy()
  })

  it('삭제에 실패하면 이유를 보여준다', async () => {
    renderSheet(1, { onDelete: vi.fn().mockRejectedValue(new ApiError(403, 'NOT_GROUP_OWNER', '그룹장만 그룹을 삭제할 수 있어요.')) })
    fireEvent.click(screen.getByRole('button', { name: '그룹 삭제' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '그룹장만 그룹을 삭제할 수 있어요.')
  })
})
