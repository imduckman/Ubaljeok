import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { ProgressBar } from '../shared/components/ui/ProgressBar'
import { useGroups } from '../features/group/application/useGroups'
import { usePhotoUpload } from '../features/photo/application/usePhotoUpload'
import { PhotoPicker } from '../features/photo/presentation/PhotoPicker'
import { RegionPickerSheet } from '../features/photo/presentation/RegionPickerSheet'
import { UploadResultList } from '../features/photo/presentation/UploadResultList'
import pageStyles from './Pages.module.css'
import styles from './UploadPage.module.css'

/** 사진 올리기: 고르기 → 올리기(진행) → 결과(동네·코인 대상·동네 고르기·다시 올리기) */
export function UploadPage() {
  const { currentGroup, isLoading } = useGroups()
  const navigate = useNavigate()
  const upload = usePhotoUpload(currentGroup?.groupId ?? null)
  const [regionTargetId, setRegionTargetId] = useState<string | null>(null)

  if (!currentGroup) {
    if (isLoading) {
      return (
        <Screen>
          <p className={pageStyles.status} role="status">
            불러오는 중…
          </p>
        </Screen>
      )
    }
    return <Navigate to="/groups" replace />
  }

  const { items, phase, notice, progress, readyCount, invalidCount } = upload
  const doneCount = items.filter((item) => item.status === 'done').length
  const uploadedTotal = items.filter((item) => item.status !== 'invalid').length
  const needsActionCount = items.filter((item) => item.status === 'needsRegion' || item.status === 'failed').length
  const regionTarget = items.find((item) => item.id === regionTargetId)

  const footer =
    phase === 'finished' ? (
      <>
        <Button variant="secondary" onClick={upload.reset}>
          더 올리기
        </Button>
        <Button onClick={() => navigate('/map')}>지도에서 보기</Button>
      </>
    ) : items.length > 0 ? (
      <Button fullWidth isLoading={phase === 'uploading'} disabled={readyCount === 0} onClick={() => void upload.startUpload()}>
        {readyCount > 0 ? `${readyCount}장 올리기` : '올릴 사진이 없어요'}
      </Button>
    ) : null

  return (
    <Screen footer={footer}>
      <div className={pageStyles.topBar}>
        <Link to="/map" className={pageStyles.backLink} aria-label="지도로 돌아가기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className={styles.groupChip}>
          <span className={styles.groupAvatar} aria-hidden="true">
            {currentGroup.name.charAt(0)}
          </span>
          {currentGroup.name}에 올려요
        </span>
      </div>

      {phase === 'finished' ? (
        <div className={styles.heading}>
          <h1 className={styles.title}>
            {uploadedTotal}장 중 {doneCount}장을
            <br />
            지도에 남겼어요
          </h1>
          <p className={styles.subtitle}>
            {needsActionCount > 0 ? `${needsActionCount}장은 아래에서 확인해 주세요.` : '같은 날 같은 동네 사진은 방문 1번으로 묶여요.'}
          </p>
        </div>
      ) : (
        <div className={styles.heading}>
          <h1 className={styles.title}>사진 올리기</h1>
          <p className={styles.subtitle}>사진을 올리면 찍은 동네가 우리 그룹 지도에 칠해져요.</p>
        </div>
      )}

      <div className={styles.body}>
        {phase === 'uploading' ? (
          <ProgressBar label="사진 올리는 중" caption={`${progress.total}장 중 ${progress.done}장`} value={(progress.done / Math.max(progress.total, 1)) * 100} />
        ) : null}

        {phase === 'finished' ? (
          <UploadResultList items={items} onPickRegion={setRegionTargetId} onRetry={upload.retryItem} />
        ) : (
          <>
            <PhotoPicker items={items} isLocked={phase === 'uploading'} onAddFiles={upload.addFiles} onRemove={upload.removeItem} />

            {notice ? (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            ) : null}

            {invalidCount > 0 && phase === 'selecting' ? (
              <p className={styles.invalidNote} role="alert">
                빨간 표시 {invalidCount}장은 JPEG가 아니거나 너무 커서 빠져요.
              </p>
            ) : null}

            {items.length > 0 && phase === 'selecting' ? (
              <div className={styles.tip}>
                <b>위치 정보가 없는 사진</b>은 올린 뒤 동네를 직접 고르면 지도에 남아요. 이때는 코인을 받을 수 없어요.
              </div>
            ) : null}
          </>
        )}
      </div>

      <RegionPickerSheet
        isOpen={Boolean(regionTarget)}
        photoName={regionTarget?.file.name}
        onClose={() => setRegionTargetId(null)}
        onPick={(region) => {
          if (regionTargetId) upload.assignRegion(regionTargetId, region.regionCode)
          setRegionTargetId(null)
        }}
      />
    </Screen>
  )
}
