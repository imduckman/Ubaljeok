import { createContext } from 'react'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../domain/Group'

export interface GroupContextValue {
  groups: Group[]
  /** 지금 선택된 그룹. 사진 업로드·지도 등 다른 화면도 이 값을 쓴다. */
  currentGroup: Group | null
  isLoading: boolean
  loadErrorMessage: string | null
  refreshGroups: () => Promise<void>
  selectGroup: (groupId: number) => void
  createGroup: (body: CreateGroupRequest) => Promise<Group>
  joinGroup: (body: JoinGroupRequest) => Promise<Group>
  leaveGroup: (groupId: number) => Promise<void>
  deleteGroup: (groupId: number) => Promise<void>
  /** 나가기·삭제가 끝난 뒤 그룹 목록 위에 한 번 보여줄 안내 */
  groupNotice: string | null
  clearGroupNotice: () => void
}

export const GroupContext = createContext<GroupContextValue | null>(null)
