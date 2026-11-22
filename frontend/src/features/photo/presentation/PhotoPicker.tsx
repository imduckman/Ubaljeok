import { useId, useRef, type ChangeEvent } from 'react'
import { Character } from '../../../shared/components/ui/Character'
import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import { MAX_PHOTOS_PER_UPLOAD } from '../domain/Photo'
import type { UploadItem } from '../application/usePhotoUpload'
import styles from './Photo.module.css'

interface PhotoPickerProps {
  items: UploadItem[]
  isLocked: boolean
  onAddFiles: (files: FileList) => void
  onRemove: (id: string) => void
}

/** 사진 고르기. 고르기 전에는 빈 화면, 고른 뒤에는 3칸 사진 목록 */
export function PhotoPicker({ items, isLocked, onAddFiles, onRemove }: PhotoPickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const canAddMore = !isLocked && items.length < MAX_PHOTOS_PER_UPLOAD

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) onAddFiles(event.target.files)
    // 같은 사진을 지웠다가 다시 고를 수 있게 비운다
    event.target.value = ''
  }

  const input = (
    <input
      ref={inputRef}
      id={inputId}
      className={styles.fileInput}
      type="file"
      accept="image/jpeg,.jpg,.jpeg"
      multiple
      onChange={handleChange}
      disabled={!canAddMore}
    />
  )

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        {input}
        <div className={styles.emptyCharacters} aria-hidden="true">
          <Character tone="gold" size={34} />
          <Character tone="pink" size={46} />
          <Character tone="indigo" size={34} />
        </div>
        <p className={styles.emptyTitle}>오늘 함께 걸은 사진을 골라주세요</p>
        <p className={styles.emptyText}>
          사진에 담긴 위치로 동네를 찾아 지도에 남겨요.
          <br />
          JPEG 사진만, 한 번에 {MAX_PHOTOS_PER_UPLOAD}장까지 올릴 수 있어요.
        </p>
        <label htmlFor={inputId} className={styles.pickButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m21 16-4.5-4.5L8 19" />
          </svg>
          사진 고르기
        </label>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {input}
      {items.map((item) => (
        <PhotoTile
          key={item.id}
          src={item.previewUrl}
          alt={item.file.name}
          status={item.status === 'uploading' ? 'uploading' : item.status === 'invalid' || item.status === 'failed' ? 'error' : 'default'}
          onRemove={isLocked ? undefined : () => onRemove(item.id)}
        />
      ))}
      {canAddMore ? (
        <label htmlFor={inputId} className={styles.addTile}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>
            더 고르기
            <small>
              {items.length}/{MAX_PHOTOS_PER_UPLOAD}
            </small>
          </span>
        </label>
      ) : null}
    </div>
  )
}
