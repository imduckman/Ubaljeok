import { useState } from 'react'
import { useRegionDetail } from '../application/useRegionDetail'
import { RegionDetailSheet } from './RegionDetailSheet'
import { RegionPeekCard } from './RegionPeekCard'

interface RegionExplorerProps {
  groupId: number
  regionCode: string
  regionName: string
  onClose: () => void
}

/** 지도에서 고른 동네: 대표 카드 → 누르면 세부 시트. 세부 시트를 닫으면 대표 카드로 돌아간다. */
export function RegionExplorer({ groupId, regionCode, regionName, onClose }: RegionExplorerProps) {
  const { state, retry } = useRegionDetail(groupId, regionCode)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <RegionPeekCard state={state} regionName={regionName} onExpand={() => setIsExpanded(true)} onRetry={retry} onClose={onClose} />
      {isExpanded ? (
        <RegionDetailSheet state={state} regionName={regionName} onRetry={retry} onClose={() => setIsExpanded(false)} />
      ) : null}
    </>
  )
}
