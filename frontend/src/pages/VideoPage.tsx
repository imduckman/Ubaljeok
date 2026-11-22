import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { listGroupPhotos } from '../api/endpoints/diary'
import { USE_MOCK_API } from '../api/client'
import { Screen } from '../shared/components/layout/Screen'
import { Button } from '../shared/components/ui/Button'
import { Character } from '../shared/components/ui/Character'
import { ApiError, getErrorMessage } from '../shared/types/api'
import { useGroups } from '../features/group/application/useGroups'
import { useDiaryJob } from '../features/video/application/useDiaryJob'
import { DiaryJobView } from '../features/video/presentation/DiaryJobView'
import { DiaryPhotoPicker } from '../features/video/presentation/DiaryPhotoPicker'
import { StylePicker } from '../features/video/presentation/StylePicker'
import {
  MAX_DIARY_PHOTOS,
  MIN_DIARY_PHOTOS,
  PROMPT_MAX_LENGTH,
  validateSelection,
  type DiaryStyle,
  type GroupPhoto,
} from '../features/video/domain/Video'
import pageStyles from './Pages.module.css'
import styles from './VideoPage.module.css'

type PhotosState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'unavailable' }
  | { status: 'ready'; photos: GroupPhoto[] }

/** 서버에 아직 없는 API(404·405·501)는 '준비 중'으로 보여준다. 실제 API 모드에서 백엔드 구현 전에 화면이 깨지지 않게 한다 */
function isNotReady(error: unknown): boolean {
  return error instanceof ApiError && [404, 405, 501].includes(error.status)
}

/** 영상 일기: 사진 3–5장 · 대표 사진 · 스타일 · 하고 싶은 말 → 만들기 → 진행 → 재생 */
export function VideoPage() {
  const { currentGroup, isLoading } = useGroups()
  const groupId = currentGroup?.groupId ?? null

  if (!currentGroup || groupId === null) {
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

  // 그룹이 바뀌면 고른 사진·작업을 모두 새로 시작한다
  return <VideoDiary key={groupId} groupId={groupId} groupName={currentGroup.name} />
}

function VideoDiary({ groupId, groupName }: { groupId: number; groupName: string }) {
  const navigate = useNavigate()
  const promptId = useId()
  const [photosState, setPhotosState] = useState<PhotosState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  // 고른 사진과 대표 사진은 같이 바뀌므로 한 상태로 둔다 (빠르게 여러 번 눌러도 어긋나지 않게)
  const [selection, setSelection] = useState<{ ids: number[]; representativeId: number | null }>({ ids: [], representativeId: null })
  const { ids: selectedIds, representativeId } = selection
  const [style, setStyle] = useState<DiaryStyle>('natural')
  const [prompt, setPrompt] = useState('')
  const diary = useDiaryJob(groupId)

  useEffect(() => {
    let isActive = true
    listGroupPhotos(groupId)
      .then((photos) => isActive && setPhotosState({ status: 'ready', photos }))
      .catch((error: unknown) => {
        if (!isActive) return
        setPhotosState(isNotReady(error) ? { status: 'unavailable' } : { status: 'error', message: getErrorMessage(error, '사진을 불러오지 못했어요.') })
      })
    return () => {
      isActive = false
    }
  }, [groupId, reloadKey])

  // 누른 순서가 영상 순서. 처음 고른 사진이 대표가 되고, 대표를 빼면 다음 사진이 대표가 된다.
  const toggle = (photoId: number) => {
    setSelection((current) => {
      if (current.ids.includes(photoId)) {
        const ids = current.ids.filter((id) => id !== photoId)
        return { ids, representativeId: current.representativeId === photoId ? (ids[0] ?? null) : current.representativeId }
      }
      if (current.ids.length >= MAX_DIARY_PHOTOS) return current
      return { ids: [...current.ids, photoId], representativeId: current.representativeId ?? photoId }
    })
  }

  const chooseRepresentative = (photoId: number) => setSelection((current) => ({ ...current, representativeId: photoId }))

  const selectionProblem = validateSelection(selectedIds, representativeId)
  const photos = photosState.status === 'ready' ? photosState.photos : []
  const representative = photos.find((photo) => photo.id === representativeId)
  const { job } = diary

  const submit = () => {
    if (selectionProblem || representativeId === null) return
    const trimmed = prompt.trim()
    void diary.start({ groupId, photoIds: selectedIds, representativePhotoId: representativeId, style, prompt: trimmed || undefined })
  }

  const topBar = (
    <div className={pageStyles.topBar}>
      <Link to="/map" className={pageStyles.backLink} aria-label="지도로 돌아가기">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <Link to="/groups" className={pageStyles.groupPill} aria-label={`${groupName} 영상 일기, 그룹 바꾸기`}>
        <span className={pageStyles.groupPillAvatar} aria-hidden="true">
          {groupName.charAt(0)}
        </span>
        {groupName}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Link>
    </div>
  )

  // 들어오자마자: 이 그룹에서 진행 중인 작업이 있는지 먼저 확인한다
  if (diary.isRestoring) {
    return (
      <Screen>
        {topBar}
        <p className={pageStyles.status} role="status">
          불러오는 중…
        </p>
      </Screen>
    )
  }

  // 작업이 시작된 뒤: 진행 · 완성 · 실패
  if (job) {
    const footer = diary.needsLogin ? (
      <Button onClick={() => navigate('/login')}>다시 로그인</Button>
    ) : job.status === 'completed' ? (
      <>
        <Button variant="secondary" onClick={diary.reset}>
          새로 만들기
        </Button>
        <Button onClick={() => navigate('/map')}>지도로 가기</Button>
      </>
    ) : job.status === 'failed' ? (
      <>
        <Button variant="secondary" onClick={diary.reset}>
          사진 다시 고르기
        </Button>
        {job.retryable && !selectionProblem ? (
          <Button isLoading={diary.isSubmitting} onClick={submit}>
            다시 만들기
          </Button>
        ) : null}
      </>
    ) : null

    return (
      <Screen footer={footer}>
        {topBar}
        <div className={styles.heading}>
          <h1 className={styles.title}>
            {job.status === 'completed' ? '영상 일기가 완성됐어요' : job.status === 'failed' ? '다시 만들어 볼까요?' : '영상을 만들고 있어요'}
          </h1>
        </div>
        <DiaryJobView job={job} representative={representative} />
        {diary.errorMessage ? (
          <p className={styles.error} role="alert">
            {diary.errorMessage}
          </p>
        ) : null}
      </Screen>
    )
  }

  // 만들기 전: 고르기
  const footer =
    photosState.status === 'ready' && photos.length >= MIN_DIARY_PHOTOS ? (
      <div className={styles.footerStack}>
        <p className={styles.footerHint} aria-live="polite">
          {selectionProblem ?? `${selectedIds.length}장으로 영상을 만들어요`}
        </p>
        <Button fullWidth disabled={Boolean(selectionProblem)} isLoading={diary.isSubmitting} onClick={submit}>
          영상 만들기
        </Button>
      </div>
    ) : null

  return (
    <Screen footer={footer}>
      {topBar}
      <div className={styles.heading}>
        <h1 className={styles.title}>영상 일기 만들기</h1>
        <p className={styles.subtitle}>
          사진 {MIN_DIARY_PHOTOS}–{MAX_DIARY_PHOTOS}장을 고르면 그날을 담은 짧은 영상이 돼요.
        </p>
        {USE_MOCK_API ? <p className={styles.mockBanner}>지금은 실제 AI 대신 테스트 영상으로 만들어요</p> : null}
      </div>

      {photosState.status === 'loading' ? (
        <p className={pageStyles.status} role="status">
          사진을 불러오는 중…
        </p>
      ) : photosState.status === 'unavailable' ? (
        <div className={styles.centerBox} role="status">
          <Character size={52} />
          <p className={styles.emptyTitle}>영상 일기는 아직 준비 중이에요. 곧 만들 수 있어요.</p>
          <Button variant="secondary" onClick={() => navigate('/map')}>
            지도로 가기
          </Button>
        </div>
      ) : photosState.status === 'error' ? (
        <div className={styles.centerBox} role="alert">
          <p>{photosState.message}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setPhotosState({ status: 'loading' })
              setReloadKey((key) => key + 1)
            }}
          >
            다시 불러오기
          </Button>
        </div>
      ) : photos.length < MIN_DIARY_PHOTOS ? (
        <div className={styles.centerBox}>
          <Character size={52} />
          <p className={styles.emptyTitle}>
            {photos.length === 0 ? '영상에 넣을 사진이 아직 없어요. 사진부터 올려볼까요?' : `사진이 ${MIN_DIARY_PHOTOS}장 이상 있어야 영상을 만들 수 있어요.`}
          </p>
          <Button onClick={() => navigate('/upload')}>사진 올리기</Button>
        </div>
      ) : (
        <div className={styles.sections}>
          <section className={styles.section} aria-labelledby="diary-photos">
            <div className={styles.sectionHeader}>
              <h2 id="diary-photos" className={styles.sectionTitle}>
                사진 고르기
              </h2>
              <span className={styles.counter}>
                {selectedIds.length}/{MAX_DIARY_PHOTOS}
              </span>
            </div>
            <DiaryPhotoPicker
              photos={photos}
              selectedIds={selectedIds}
              representativeId={representativeId}
              onToggle={toggle}
              onChooseRepresentative={chooseRepresentative}
            />
          </section>

          <section className={styles.section} aria-labelledby="diary-style">
            <h2 id="diary-style" className={styles.sectionTitle}>
              스타일
            </h2>
            <StylePicker value={style} onChange={setStyle} />
          </section>

          <section className={styles.section}>
            <label htmlFor={promptId} className={styles.sectionTitle}>
              하고 싶은 말 <span className={styles.optional}>(선택)</span>
            </label>
            <textarea
              id={promptId}
              className={styles.textarea}
              rows={3}
              maxLength={PROMPT_MAX_LENGTH}
              placeholder="친구들이랑 행궁동 골목을 천천히 걸었던 날"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <span className={styles.textCount}>
              {prompt.length}/{PROMPT_MAX_LENGTH}
            </span>
          </section>

          {diary.errorMessage ? (
            <p className={styles.error} role="alert">
              {diary.errorMessage}
            </p>
          ) : null}
        </div>
      )}
    </Screen>
  )
}
