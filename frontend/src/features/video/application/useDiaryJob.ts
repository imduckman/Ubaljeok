import { useCallback, useEffect, useRef, useState } from 'react'
import { createDiaryJob, getDiaryJob, listDiaryJobs } from '../../../api/endpoints/diary'
import { ApiError, getErrorMessage } from '../../../shared/types/api'
import { createUuid } from '../../../shared/utils/uuid'
import { findActiveJob, isFinished, normalizeJob, pollDelayMs, type CreateDiaryJobRequest, type DiaryJob } from '../domain/Video'

/**
 * 그룹의 영상 작업 하나를 만들고, 끝날 때까지 상태를 조회한다.
 * - 화면에 들어오면 이 그룹에서 아직 끝나지 않은 작업을 먼저 찾아 이어서 보여준다 (나갔다 돌아온 경우)
 * - 만들기에서 409 VIDEO_JOB_ACTIVE가 오면 그 진행 중 작업으로 연결한다
 * - 처음 1분은 3초, 그 뒤 10초 간격 (pollDelayMs). 작업 생성 시각을 기준으로 잰다
 * - 완료·실패·화면 나감에서 멈추고, 화면이 숨겨지면 쉬었다가 다시 보이면 바로 조회한다
 * - 401·403·404는 기다려도 풀리지 않으므로 조회를 멈추고 안내한다 (401이면 needsLogin)
 * - 만들기 재시도: 같은 내용이면 같은 Idempotency-Key를 다시 쓴다. 서버가 확실히 답한 뒤에만 키를 버린다
 */

/** 기다려도 결과가 바뀌지 않는 조회 오류 */
const STOP_POLLING_STATUSES = [401, 403, 404]

const STOP_POLLING_TEXT: Record<number, string> = {
  401: '로그인이 끝났어요. 다시 로그인하면 영상 상태를 이어서 볼 수 있어요.',
  403: '이 그룹의 영상을 볼 수 없어요. 그룹을 다시 확인해 주세요.',
  404: '영상 작업을 찾을 수 없어요. 삭제됐을 수 있어요.',
}

/** 재시도해도 같은 키를 써도 되는 오류인지: 네트워크 끊김·서버 오류·처리 중 */
function mayHaveReachedServer(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return error.status >= 500 || error.code === 'REQUEST_IN_PROGRESS'
}
export function useDiaryJob(groupId: number) {
  const [job, setJobState] = useState<DiaryJob | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const startedAtRef = useRef(0)
  // 아직 확실한 답을 못 받은 만들기 요청 (같은 내용으로 다시 누르면 이 키를 다시 쓴다)
  const pendingCreateRef = useRef<{ body: string; key: string } | null>(null)

  const showJob = useCallback((next: DiaryJob) => {
    const parsed = Date.parse(next.createdAt)
    startedAtRef.current = Number.isNaN(parsed) ? Date.now() : Math.min(parsed, Date.now())
    setJobState(normalizeJob(next))
  }, [])

  // 들어올 때 진행 중인 작업 찾기. 목록을 못 불러와도 새로 만들 수 있게 조용히 넘어간다.
  useEffect(() => {
    let isActive = true
    listDiaryJobs(groupId)
      .then((jobs) => {
        const active = findActiveJob(jobs)
        if (isActive && active) showJob(active)
      })
      .catch(() => {})
      .finally(() => isActive && setIsRestoring(false))
    return () => {
      isActive = false
    }
  }, [groupId, showJob])

  const start = useCallback(
    async (body: CreateDiaryJobRequest) => {
      setIsSubmitting(true)
      setErrorMessage(null)
      setNeedsLogin(false)
      const bodyText = JSON.stringify(body)
      if (pendingCreateRef.current?.body !== bodyText) pendingCreateRef.current = { body: bodyText, key: createUuid() }
      try {
        showJob(await createDiaryJob(body, pendingCreateRef.current.key))
        pendingCreateRef.current = null
      } catch (error) {
        if (!mayHaveReachedServer(error)) pendingCreateRef.current = null
        if (error instanceof ApiError && error.code === 'VIDEO_JOB_ACTIVE') {
          const active = await listDiaryJobs(body.groupId).then(findActiveJob, () => null)
          if (active) {
            showJob(active)
            return
          }
        }
        setErrorMessage(getErrorMessage(error, '영상 만들기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      } finally {
        setIsSubmitting(false)
      }
    },
    [showJob],
  )

  const jobId = job?.id ?? null
  const isRunning = job !== null && !isFinished(job.status)

  useEffect(() => {
    if (jobId === null || !isRunning) return
    // 다음 조회 예약과 화면을 떠났는지를 한곳에 둔다
    const polling: { timer?: ReturnType<typeof setTimeout>; isActive: boolean } = { isActive: true }

    const schedule = (delayMs: number) => {
      clearTimeout(polling.timer)
      polling.timer = setTimeout(() => void poll(), delayMs)
    }

    const poll = async () => {
      if (!polling.isActive || document.hidden) return
      try {
        const latest = await getDiaryJob(jobId)
        if (!polling.isActive) return
        setJobState(normalizeJob(latest))
        if (isFinished(latest.status)) return
      } catch (error) {
        if (error instanceof ApiError && STOP_POLLING_STATUSES.includes(error.status)) {
          if (!polling.isActive) return
          setErrorMessage(STOP_POLLING_TEXT[error.status])
          setNeedsLogin(error.status === 401)
          polling.isActive = false
          return
        }
        // 네트워크·서버 오류는 잠깐일 수 있다. 작업은 서버에서 계속되므로 다음 차례에 다시 묻는다.
      }
      if (polling.isActive) schedule(pollDelayMs(Date.now() - startedAtRef.current))
    }

    const handleVisibility = () => {
      clearTimeout(polling.timer)
      if (!document.hidden) void poll()
    }

    schedule(pollDelayMs(0))
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      polling.isActive = false
      clearTimeout(polling.timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [jobId, isRunning])

  const reset = useCallback(() => {
    setJobState(null)
    setErrorMessage(null)
    setNeedsLogin(false)
  }, [])

  return { job, isRestoring, isSubmitting, errorMessage, needsLogin, start, reset }
}
