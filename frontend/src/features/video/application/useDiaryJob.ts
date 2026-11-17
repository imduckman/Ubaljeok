import { useCallback, useEffect, useRef, useState } from 'react'
import { createDiaryJob, getDiaryJob } from '../../../api/endpoints/diary'
import { getErrorMessage } from '../../../shared/types/api'
import { isFinished, pollDelayMs, type CreateDiaryJobRequest, type DiaryJob } from '../domain/Video'

/**
 * 영상 작업 하나를 만들고, 끝날 때까지 상태를 조회한다.
 * - 처음 1분은 3초, 그 뒤 10초 간격 (pollDelayMs)
 * - 완료·실패·화면 나감에서 멈추고, 화면이 숨겨지면 쉬었다가 다시 보이면 바로 조회한다
 */
export function useDiaryJob() {
  const [job, setJob] = useState<DiaryJob | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const startedAtRef = useRef(0)

  const start = useCallback(async (body: CreateDiaryJobRequest) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const created = await createDiaryJob(body)
      startedAtRef.current = Date.now()
      setJob(created)
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '영상 만들기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.'))
    } finally {
      setIsSubmitting(false)
    }
  }, [])

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
        setJob(latest)
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
    setJob(null)
    setErrorMessage(null)
  }, [])

  return { job, isSubmitting, errorMessage, start, reset }
}
