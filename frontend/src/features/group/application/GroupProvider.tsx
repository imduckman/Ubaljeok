import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as groupApi from '../../../api/endpoints/groups'
import { getErrorMessage } from '../../../shared/types/api'
import { useAuth } from '../../auth/application/useAuth'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../domain/Group'
import { GroupContext, type GroupContextValue } from './groupContext'

const CURRENT_GROUP_KEY = 'ubaljeok-current-group'

function readSavedGroupId(): number | null {
  try {
    const saved = localStorage.getItem(CURRENT_GROUP_KEY)
    return saved ? Number(saved) : null
  } catch {
    return null
  }
}

function saveGroupId(groupId: number) {
  try {
    localStorage.setItem(CURRENT_GROUP_KEY, String(groupId))
  } catch {
    // 저장 못 해도 이번 접속 동안은 선택이 유지된다.
  }
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [currentGroupId, setCurrentGroupId] = useState<number | null>(readSavedGroupId)
  const [isLoading, setIsLoading] = useState(false)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)

  const refreshGroups = useCallback(async () => {
    setIsLoading(true)
    setLoadErrorMessage(null)
    try {
      setGroups(await groupApi.listMyGroups())
    } catch (error) {
      setLoadErrorMessage(getErrorMessage(error, '그룹을 불러오지 못했어요.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      void refreshGroups()
    } else {
      setGroups([])
    }
  }, [user, refreshGroups])

  const selectGroup = useCallback((groupId: number) => {
    setCurrentGroupId(groupId)
    saveGroupId(groupId)
  }, [])

  const createGroup = useCallback(
    async (body: CreateGroupRequest) => {
      const group = await groupApi.createGroup(body)
      setGroups((previous) => [...previous, group])
      selectGroup(group.groupId)
      return group
    },
    [selectGroup],
  )

  const joinGroup = useCallback(
    async (body: JoinGroupRequest) => {
      const group = await groupApi.joinGroup(body)
      setGroups((previous) => [...previous.filter((item) => item.groupId !== group.groupId), group])
      selectGroup(group.groupId)
      return group
    },
    [selectGroup],
  )

  // 저장된 그룹이 목록에 없으면(탈퇴 등) 첫 그룹을 현재 그룹으로 본다.
  const currentGroup = groups.find((group) => group.groupId === currentGroupId) ?? groups[0] ?? null

  const value = useMemo<GroupContextValue>(
    () => ({ groups, currentGroup, isLoading, loadErrorMessage, refreshGroups, selectGroup, createGroup, joinGroup }),
    [groups, currentGroup, isLoading, loadErrorMessage, refreshGroups, selectGroup, createGroup, joinGroup],
  )

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}
