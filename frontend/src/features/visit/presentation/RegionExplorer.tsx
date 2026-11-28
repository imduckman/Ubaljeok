import { useState } from 'react'
import { useRegionDetail } from '../application/useRegionDetail'
import { RegionDetailSheet, type RegionTab } from './RegionDetailSheet'
import { RegionPeekCard } from './RegionPeekCard'

/** 처음부터 상세 시트를 열 때 고를 탭 */
export type RegionSheet = RegionTab

interface RegionExplorerProps {
  groupId: number
  regionCode: string
  regionName: string
  /** 처음부터 상세 시트를 이 탭으로 열어 둔다 (예: 코인 카드의 "건물 구매하러 가기" → 건물 관리) */
  initialSheet?: RegionSheet | null
  onClose: () => void
}

/**
 * 지도에서 고른 동네: 대표 카드 → 상세 시트([갤러리] / [건물 관리] 탭).
 * 시트를 닫으면 대표 카드로 돌아간다. 두 탭은 한 번 불러온 데이터를 같이 쓴다.
 */
export function RegionExplorer({ groupId, regionCode, regionName, initialSheet = null, onClose }: RegionExplorerProps) {
  const { state, retry, setOwnership } = useRegionDetail(groupId, regionCode)
  const [openTab, setOpenTab] = useState<RegionTab | null>(initialSheet)

  return (
    <>
      <RegionPeekCard
        state={state}
        regionName={regionName}
        onOpenGallery={() => setOpenTab('gallery')}
        onOpenBuilding={() => setOpenTab('building')}
        onRetry={retry}
        onClose={onClose}
      />
      {openTab ? (
        <RegionDetailSheet
          state={state}
          regionName={regionName}
          tab={openTab}
          onTabChange={setOpenTab}
          groupId={groupId}
          onOwnershipChange={setOwnership}
          onRetry={retry}
          onClose={() => setOpenTab(null)}
        />
      ) : null}
    </>
  )
}
