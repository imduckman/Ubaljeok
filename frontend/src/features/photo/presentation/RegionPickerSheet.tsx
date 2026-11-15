import { useEffect, useMemo, useState } from 'react'
import { listRegions } from '../../../api/endpoints/photos'
import { BottomSheet } from '../../../shared/components/ui/BottomSheet'
import { Button } from '../../../shared/components/ui/Button'
import { TextField } from '../../../shared/components/ui/TextField'
import { getErrorMessage } from '../../../shared/types/api'
import type { Region } from '../domain/Photo'
import styles from './Photo.module.css'

interface RegionPickerSheetProps {
  isOpen: boolean
  photoName?: string
  onClose: () => void
  onPick: (region: Region) => void
}

/** 위치 없는 사진에 동네를 직접 고르는 시트 */
export function RegionPickerSheet({ isOpen, photoName, onClose, onPick }: RegionPickerSheetProps) {
  const [regions, setRegions] = useState<Region[] | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isOpen || regions) return
    let isActive = true
    listRegions()
      .then((loaded) => isActive && setRegions(loaded))
      .catch((error: unknown) => isActive && setErrorMessage(getErrorMessage(error, '동네 목록을 불러오지 못했어요.')))
    return () => {
      isActive = false
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
    <BottomSheet
      isOpen={isOpen}
      title="어느 동네에서 찍었나요?"
      description={photoName ? `${photoName} · 직접 고른 동네는 지도에 남고, 코인은 받을 수 없어요.` : undefined}
      onClose={handleClose}
    >
      <TextField label="동네 이름" placeholder="행궁동" value={query} onChange={(event) => setQuery(event.target.value)} />
      {errorMessage ? (
        <div className={styles.sheetStatus} role="alert">
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
        <p className={styles.sheetStatus} role="status">
          동네 목록을 불러오는 중…
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.sheetStatus}>‘{query}’에 맞는 동네가 없어요. 지금은 수원시 동네만 고를 수 있어요.</p>
      ) : (
        <ul className={styles.regionList}>
          {filtered.map((region) => (
            <li key={region.regionCode}>
              <button
                type="button"
                className={styles.regionButton}
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
