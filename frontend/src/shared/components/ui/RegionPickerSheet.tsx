import { useEffect, useMemo, useRef, useState } from 'react'
import { listRegions } from '../../../api/endpoints/regions'
import { getErrorMessage } from '../../types/api'
import type { Region } from '../../types/region'
import { BottomSheet } from './BottomSheet'
import { Button } from './Button'
import { TextField } from './TextField'
import styles from './RegionPickerSheet.module.css'

interface RegionPickerSheetProps {
  isOpen: boolean
  /** 시트 제목. 기본: 어느 동네에서 찍었나요? */
  title?: string
  /** 제목 아래 안내. 예: 사진 이름 · 직접 고른 동네는 코인을 받을 수 없어요 */
  description?: string
  onClose: () => void
  /** 동네를 고르면 불린다. region.regionCode를 API에 그대로 보내면 된다 */
  onPick: (region: Region) => void
  /** 동네 목록을 불러오는 함수. 기본은 GET /api/regions (테스트·다른 지역에서 바꿔 끼울 수 있다) */
  loadRegions?: () => Promise<Region[]>
}

/**
 * 지원 지역의 동네를 검색해서 하나 고르는 바텀시트.
 * 위치 없는 사진, 동네 경계에 걸린 사진처럼 동네를 직접 정해야 하는 곳에서 같이 쓴다.
 * 목록은 처음 열 때 한 번만 불러온다.
 */
export function RegionPickerSheet({
  isOpen,
  title = '어느 동네에서 찍었나요?',
  description,
  onClose,
  onPick,
  loadRegions = listRegions,
}: RegionPickerSheetProps) {
  const [regions, setRegions] = useState<Region[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  // 부르는 쪽이 매번 새 함수를 넘겨도 다시 불러오지 않게 최신 함수만 기억한다
  const loadRef = useRef(loadRegions)
  useEffect(() => {
    loadRef.current = loadRegions
  }, [loadRegions])

  useEffect(() => {
    if (!isOpen || regions) return
    // 시트를 닫거나 다시 불러오면 늦게 온 이전 응답은 버린다
    const request = { isActive: true }
    loadRef.current()
      .then((loaded) => request.isActive && setRegions(loaded))
      .catch((error: unknown) => request.isActive && setErrorMessage(getErrorMessage(error, '동네 목록을 불러오지 못했어요.')))
    return () => {
      request.isActive = false
    }
  }, [isOpen, regions, reloadKey])

  const filtered = useMemo(() => {
    const keyword = query.trim()
    if (!regions) return []
    return keyword ? regions.filter((region) => region.name.includes(keyword)) : regions
  }, [regions, query])

  const handleClose = () => {
    setQuery('')
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} title={title} description={description} onClose={handleClose}>
      <TextField label="동네 이름" placeholder="행궁동" value={query} onChange={(event) => setQuery(event.target.value)} />
      {errorMessage ? (
        <div className={styles.status} role="alert">
          <p>{errorMessage}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setErrorMessage(null)
              setReloadKey((key) => key + 1)
            }}
          >
            다시 불러오기
          </Button>
        </div>
      ) : !regions ? (
        <p className={styles.status} role="status">
          동네 목록을 불러오는 중…
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.status}>‘{query}’에 맞는 동네가 없어요. 지금은 수원시 동네만 고를 수 있어요.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((region) => (
            <li key={region.regionCode}>
              <button
                type="button"
                className={styles.option}
                onClick={() => {
                  setQuery('')
                  onPick(region)
                }}
              >
                <span>{region.name}</span>
                <small>{region.sigunguName}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
