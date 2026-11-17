import { PhotoTile } from '../../../shared/components/ui/PhotoTile'
import { formatShortDate } from './format'
import { MAX_DIARY_PHOTOS, type GroupPhoto } from '../domain/Video'
import styles from './Video.module.css'

interface DiaryPhotoPickerProps {
  photos: GroupPhoto[]
  selectedIds: number[]
  representativeId: number | null
  onToggle: (photoId: number) => void
  onChooseRepresentative: (photoId: number) => void
}

/** 영상에 넣을 사진 고르기. 누른 순서가 영상 순서이고, 대표 사진 하나를 따로 정한다 */
export function DiaryPhotoPicker({ photos, selectedIds, representativeId, onToggle, onChooseRepresentative }: DiaryPhotoPickerProps) {
  const isFull = selectedIds.length >= MAX_DIARY_PHOTOS
  const selectedPhotos = selectedIds
    .map((id) => photos.find((photo) => photo.id === id))
    .filter((photo): photo is GroupPhoto => Boolean(photo))

  return (
    <div className={styles.pickerBlock}>
      <div className={styles.photoGrid}>
        {photos.map((photo) => {
          const order = selectedIds.indexOf(photo.id)
          const isSelected = order >= 0
          return (
            <div key={photo.id} className={isFull && !isSelected ? styles.dimmed : undefined}>
              <PhotoTile
                src={photo.fileUrl}
                alt={`${formatShortDate(photo.visitDate)} ${photo.regionName} 사진`}
                selectedOrder={isSelected ? order + 1 : undefined}
                isCover={photo.id === representativeId}
                onSelect={() => onToggle(photo.id)}
              />
              <p className={styles.photoCaption}>{photo.regionName}</p>
            </div>
          )
        })}
      </div>

      {selectedPhotos.length > 0 ? (
        <div className={styles.coverBox}>
          <p className={styles.coverTitle}>대표 사진</p>
          <p className={styles.coverHint}>대표 사진만 AI로 움직이고, 나머지는 고른 순서대로 이어 붙여요.</p>
          <div className={styles.coverRow} role="radiogroup" aria-label="대표 사진 고르기">
            {selectedPhotos.map((photo, index) => {
              const isCover = photo.id === representativeId
              return (
                <button
                  key={photo.id}
                  type="button"
                  role="radio"
                  aria-checked={isCover}
                  className={`${styles.coverOption} ${isCover ? styles.coverOptionActive : ''}`}
                  onClick={() => onChooseRepresentative(photo.id)}
                >
                  <img src={photo.fileUrl} alt="" />
                  <span>
                    {index + 1}. {photo.regionName}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
