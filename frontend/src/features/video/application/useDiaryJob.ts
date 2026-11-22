import { useCallback, useEffect, useRef, useState } from 'react'
import { createDiaryJob, getDiaryJob, listDiaryJobs } from '../../../api/endpoints/diary'
import { ApiError, getErrorMessage } from '../../../shared/types/api'
import { findActiveJob, isFinished, normalizeJob, pollDelayMs, type CreateDiaryJobRequest, type DiaryJob } from '../domain/Video'

/**
 * 그룹의 영상 작업 하나를 만들고, 끝날 때까지 상태를 조회한다.
 * - 화면에 들어오면 이 그룹에서 아직 끝나지 않은 작업을 먼저 찾아 이어서 보여준다 (나갔다 돌아온 경우)
 * - 만들기에서 409 VIDEO_JOB_ACTIVE가 오면 그 진행 중 작업으로 연결한다
 * - 처음 1분은 3초, 그 뒤 10초 간격 (pollDelayMs). 작업 생성 시각을 기준으로 잰다
 * - 완료·실패·화면 나감에서 멈추고, 화면이 숨겨지면 쉬었다가 다시 보이면 바로 조회한다
 */
export function useDiaryJob(groupId: number) {
  const [job, setJobState] = useState<DiaryJob | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedAtRef = useRef(0)

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
      try {
        showJob(await createDiaryJob(body))
      } catch (error) {
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
      } catch {
        // 조회가 잠깐 실패해도 작업은 서버에서 계속된다. 다음 차례에 다시 묻는다.
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
  }, [])

  return { job, isRestoring, isSubmitting, errorMessage, start, reset }
}
