import { useContext } from 'react'
import { GroupContext } from './groupContext'

export function useGroups() {
  const context = useContext(GroupContext)
  if (!context) throw new Error('useGroups는 GroupProvider 안에서만 쓸 수 있어요.')
  return context
}
