import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as groupApi from '../../../api/endpoints/groups'
import { getErrorMessage } from '../../../shared/types/api'
import { useAuth } from '../../auth/application/useAuth'
import type { CreateGroupRequest, Group, JoinGroupRequest } from '../domain/Group'
import { GroupContext, type GroupContextValue } from './groupContext'

const CURRENT_GROUP_KEY = 'ubaljeok-current-group'

function readSavedGroupId(key: string): number | null {
  try {
    const saved = localStorage.getItem(key)
    return saved ? Number(saved) : null
  } catch {
    return null
  }
}

function saveGroupId(key: string, groupId: number) {
  try {
    localStorage.setItem(key, String(groupId))
  } catch {
    // 저장 못 해도 이번 접속 동안은 선택이 유지된다.
  }
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <GroupSession key={user?.userId ?? 'guest'} userId={user?.userId}>{children}</GroupSession>
}

function GroupSession({ children, userId }: { children: ReactNode; userId?: number }) {
  const storageKey = `${CURRENT_GROUP_KEY}:${userId ?? 'guest'}`
  const [groups, setGroups] = useState<Group[]>([])
  const [currentGroupId, setCurrentGroupId] = useState(() => readSavedGroupId(storageKey))
  const [isLoading, setIsLoading] = useState(userId !== undefined)
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  const [groupNotice, setGroupNotice] = useState<string | null>(null)
  const pendingLoad = useRef<AbortController | null>(null)

  const loadGroups = useCallback(async () => {
    if (userId === undefined) return

    pendingLoad.current?.abort()
    const controller = new AbortController()
    pendingLoad.current = controller

    return groupApi.listMyGroups().then(
      (result) => {
        if (!controller.signal.aborted) {
          setGroups(result)
          setLoadErrorMessage(null)
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadErrorMessage(getErrorMessage(error, '그룹을 불러오지 못했어요.'))
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
  }, [userId])

  useEffect(() => {
    void loadGroups()
    return () => pendingLoad.current?.abort()
  }, [loadGroups])

  const refreshGroups = useCallback(async () => {
    if (userId === undefined) return
    setIsLoading(true)
    setLoadErrorMessage(null)
    await loadGroups()
  }, [loadGroups, userId])

  const selectGroup = useCallback((groupId: number) => {
    setCurrentGroupId(groupId)
    saveGroupId(storageKey, groupId)
  }, [storageKey])

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

  const removeGroup = useCallback((groupId: number) => {
    setGroups((previous) => previous.filter((item) => item.groupId !== groupId))
  }, [])

  const leaveGroup = useCallback(
    async (groupId: number) => {
      const name = groups.find((item) => item.groupId === groupId)?.name ?? '그룹'
      await groupApi.leaveGroup(groupId)
      setGroupNotice(`"${name}"에서 나왔어요.`)
      removeGroup(groupId)
    },
    [groups, removeGroup],
  )

  const deleteGroup = useCallback(
    async (groupId: number) => {
      const name = groups.find((item) => item.groupId === groupId)?.name ?? '그룹'
      await groupApi.deleteGroup(groupId)
      setGroupNotice(`"${name}" 그룹을 삭제했어요.`)
      removeGroup(groupId)
    },
    [groups, removeGroup],
  )

  const clearGroupNotice = useCallback(() => setGroupNotice(null), [])

  // 저장된 그룹이 목록에 없으면(탈퇴 등) 첫 그룹을 현재 그룹으로 본다.
  const currentGroup = groups.find((group) => group.groupId === currentGroupId) ?? groups[0] ?? null

  const value = useMemo<GroupContextValue>(
    () => ({
      groups,
      currentGroup,
      isLoading,
      loadErrorMessage,
      refreshGroups,
      selectGroup,
      createGroup,
      joinGroup,
      leaveGroup,
      deleteGroup,
      groupNotice,
      clearGroupNotice,
    }),
    [groups, currentGroup, isLoading, loadErrorMessage, refreshGroups, selectGroup, createGroup, joinGroup, leaveGroup, deleteGroup, groupNotice, clearGroupNotice],
  )

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}
