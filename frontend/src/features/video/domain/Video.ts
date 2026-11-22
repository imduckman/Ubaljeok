/**
 * AI 영상 일기 규칙과 서버 응답 모양.
 * 기준 문서: docs/MVP-IMPLEMENTATION.md 5장(PR #26), docs/UI-STATES.md 4장
 */

export const MIN_DIARY_PHOTOS = 3
export const MAX_DIARY_PHOTOS = 5
export const PROMPT_MAX_LENGTH = 200

export type DiaryStyle = 'cinematic' | 'animation' | 'natural' | 'funny'
export type DiaryJobStatus = 'queued' | 'generating' | 'editing' | 'completed' | 'failed'
export type DiaryMode = 'mock' | 'real'

export const STYLE_OPTIONS: { value: DiaryStyle; label: string; description: string }[] = [
  { value: 'cinematic', label: '영화처럼', description: '천천히 다가가는 장면' },
  { value: 'animation', label: '애니처럼', description: '선명한 색과 그림체' },
  { value: 'natural', label: '자연스럽게', description: '찍은 그대로 담담하게' },
  { value: 'funny', label: '웃기게', description: '통통 튀는 움직임' },
]

/** 영상에 고를 수 있는 그룹 사진 (GET /api/photos?groupId=) */
export interface GroupPhoto {
  id: number
  takenAt: string | null
  visitDate: string
  regionCode: string
  regionName: string
  fileUrl: string
}

export interface DiaryJob {
  id: number
  groupId: number
  status: DiaryJobStatus
  mode: DiaryMode
  style: DiaryStyle
  createdAt: string
  updatedAt: string
  errorCode: string | null
  retryable: boolean
  retryAfterSeconds: number | null
  resultUrl: string | null
}

export interface CreateDiaryJobRequest {
  groupId: number
  photoIds: number[]
  representativePhotoId: number
  style: DiaryStyle
  prompt?: string
}

/** 고른 사진이 영상을 만들 수 있는 상태인지. 문제가 없으면 null */
export function validateSelection(photoIds: number[], representativePhotoId: number | null): string | null {
  if (photoIds.length < MIN_DIARY_PHOTOS) return `사진을 ${MIN_DIARY_PHOTOS - photoIds.length}장 더 골라주세요`
  if (photoIds.length > MAX_DIARY_PHOTOS) return `사진은 ${MAX_DIARY_PHOTOS}장까지 고를 수 있어요`
  if (representativePhotoId === null || !photoIds.includes(representativePhotoId)) return '대표 사진을 골라주세요'
  return null
}

/** 진행 막대 단계(1–3). 완료·실패는 막대를 숨긴다 */
export function stepOf(status: DiaryJobStatus): number | null {
  if (status === 'queued') return 1
  if (status === 'generating') return 2
  if (status === 'editing') return 3
  return null
}

const STATUS_TEXT: Record<DiaryJobStatus, string> = {
  queued: '차례를 기다리는 중이에요',
  generating: '대표 사진을 영상으로 만드는 중이에요',
  editing: '사진을 이어 붙이는 중이에요',
  completed: '영상이 완성됐어요',
  failed: '영상을 만들지 못했어요',
}

export function statusText(status: DiaryJobStatus): string {
  return STATUS_TEXT[status]
}

export function isFinished(status: DiaryJobStatus): boolean {
  return status === 'completed' || status === 'failed'
}

/** 결과 파일 없이 '완료'로 온 작업은 볼 수 있는 영상이 없으므로 실패로 다룬다 (PR #28 리뷰) */
export const RESULT_MISSING = 'RESULT_MISSING'

export function normalizeJob(job: DiaryJob): DiaryJob {
  if (job.status === 'completed' && !job.resultUrl) {
    return { ...job, status: 'failed', errorCode: RESULT_MISSING, retryable: false }
  }
  return job
}

/** 같은 그룹에서 아직 끝나지 않은 작업 (가장 최근 것) */
export function findActiveJob(jobs: DiaryJob[]): DiaryJob | null {
  return jobs.filter((job) => !isFinished(job.status)).sort((a, b) => b.id - a.id)[0] ?? null
}

/** 상태 조회 간격: 처음 1분은 3초, 그 뒤로는 10초 (MVP-IMPLEMENTATION 5장) */
export function pollDelayMs(elapsedMs: number): number {
  return elapsedMs < 60_000 ? 3_000 : 10_000
}
