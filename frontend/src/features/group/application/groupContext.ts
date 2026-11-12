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
}

export const GroupContext = createContext<GroupContextValue | null>(null)
