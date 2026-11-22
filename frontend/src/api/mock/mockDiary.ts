/**
 * 영상 일기용 가짜 서버.
 * - 사진 목록: 그림으로 만든 테스트 사진 8장 (실제 개인 사진·위치 없음)
 * - 작업: 만든 뒤 시간이 지나면 queued → generating → editing → completed 로 넘어간다
 * - 결과: 브라우저에서 고른 사진을 이어 붙인 짧은 테스트 영상(WebM)을 만든다
 * - 프롬프트에 "실패"를 넣으면 생성 단계에서 실패한다 (retryable)
 * - 녹화를 지원하지 않는 환경이면 결과 파일이 없으므로 EDIT_FAILED로 실패한다
 * - 작업은 모듈 메모리에 남아서, 화면을 나갔다 돌아와도 진행 중인 작업을 다시 찾을 수 있다
 */
import { ApiError } from '../../shared/types/api'
import type { CreateDiaryJobRequest, DiaryJob, GroupPhoto } from '../../features/video/domain/Video'
import { createTestVideo } from './testVideo'

const STAGE_MS = { queued: 2_500, generating: 6_000 }
const NETWORK_DELAY_MS = 300

const SAMPLE_PLACES = [
  { regionCode: '4111560000', regionName: '행궁동', hue: 12 },
  { regionCode: '4111759000', regionName: '영통1동', hue: 205 },
  { regionCode: '4111761000', regionName: '광교1동', hue: 150 },
  { regionCode: '4111156000', regionName: '파장동', hue: 280 },
  { regionCode: '4111560000', regionName: '행궁동', hue: 35 },
  { regionCode: '4111759000', regionName: '영통1동', hue: 330 },
  { regionCode: '4111761000', regionName: '광교1동', hue: 95 },
  { regionCode: '4111156000', regionName: '파장동', hue: 240 },
]

/** 사진 대신 쓰는 풍경 그림 (SVG). 외부 파일 없이 바로 보인다 */
function sampleImage(hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},72%,74%)"/><stop offset="1" stop-color="hsl(${hue + 35},58%,50%)"/></linearGradient></defs><rect width="480" height="480" fill="url(#g)"/><circle cx="340" cy="140" r="52" fill="#ffffff" fill-opacity=".55"/><path d="M0 370 L140 240 L270 350 L370 270 L480 360 L480 480 L0 480Z" fill="#000" fill-opacity=".2"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

interface StoredJob {
  job: DiaryJob
  startedAt: number
  photos: GroupPhoto[]
  shouldFail: boolean
  rendering: Promise<string | null> | null
}

const jobs = new Map<number, StoredJob>()
let nextJobId = 900

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function photosOf(groupId: number): GroupPhoto[] {
  return SAMPLE_PLACES.map((place, index) => ({
    id: groupId * 100 + index + 1,
    takenAt: null,
    visitDate: `2026-11-${String(14 - index).padStart(2, '0')}`,
    regionCode: place.regionCode,
    regionName: place.regionName,
    fileUrl: sampleImage(place.hue),
  }))
}

function advance(stored: StoredJob): DiaryJob {
  const { job } = stored
  if (job.status === 'completed' || job.status === 'failed') return job
  const elapsed = Date.now() - stored.startedAt
  const now = new Date().toISOString()

  if (elapsed < STAGE_MS.queued) return job
  // 실패 흉내: 생성 단계를 한 번 보여준 다음 조회에서 실패한다 (조회 간격과 상관없이)
  if (stored.shouldFail && job.status === 'generating') {
    stored.job = { ...job, status: 'failed', errorCode: 'PROVIDER_REJECTED', retryable: true, updatedAt: now }
    return stored.job
  }
  if (elapsed < STAGE_MS.generating || job.status === 'queued') {
    if (job.status !== 'generating') stored.job = { ...job, status: 'generating', updatedAt: now }
    return stored.job
  }

  // 편집 단계: 테스트 영상을 한 번만 만든다. 다 만들어지면 완료.
  if (!stored.rendering) {
    stored.job = { ...job, status: 'editing', updatedAt: now }
    stored.rendering = createTestVideo(
      stored.photos.map((photo) => ({ imageUrl: photo.fileUrl, title: photo.regionName, date: photo.visitDate })),
    ).then(
      (url) => {
        // 녹화를 못 하는 브라우저면 결과 파일이 없다. 완료로 두지 않고 실패로 알린다 (PR #28 리뷰)
        stored.job = url
          ? { ...stored.job, status: 'completed', resultUrl: url, updatedAt: new Date().toISOString() }
          : { ...stored.job, status: 'failed', errorCode: 'EDIT_FAILED', retryable: false, updatedAt: new Date().toISOString() }
        return url
      },
      () => {
        stored.job = { ...stored.job, status: 'failed', errorCode: 'EDIT_FAILED', retryable: true, updatedAt: new Date().toISOString() }
        return null
      },
    )
  }
  return stored.job
}

export const mockDiaryServer = {
  async listGroupPhotos(groupId: number): Promise<GroupPhoto[]> {
    await delay()
    return photosOf(groupId)
  },

  async createJob({ groupId, photoIds, representativePhotoId, style, prompt }: CreateDiaryJobRequest): Promise<DiaryJob> {
    await delay()
    const active = [...jobs.values()].find(({ job }) => job.groupId === groupId && job.status !== 'completed' && job.status !== 'failed')
    if (active) throw new ApiError(409, 'VIDEO_JOB_ACTIVE', '이 그룹에서 만들고 있는 영상이 있어요. 끝나면 다시 시도해 주세요.')

    const all = photosOf(groupId)
    const ordered = photoIds.map((id) => all.find((photo) => photo.id === id)).filter((photo): photo is GroupPhoto => Boolean(photo))
    if (ordered.length !== photoIds.length || !photoIds.includes(representativePhotoId)) {
      throw new ApiError(422, 'INVALID_VIDEO_INPUT', '고른 사진을 다시 확인해 주세요.')
    }

    const now = new Date().toISOString()
    const job: DiaryJob = {
      id: nextJobId++,
      groupId,
      status: 'queued',
      mode: 'mock',
      style,
      createdAt: now,
      updatedAt: now,
      errorCode: null,
      retryable: false,
      retryAfterSeconds: null,
      resultUrl: null,
    }
    jobs.set(job.id, { job, startedAt: Date.now(), photos: ordered, shouldFail: Boolean(prompt?.includes('실패')), rendering: null })
    return job
  },

  async listJobs(groupId: number): Promise<DiaryJob[]> {
    await delay(150)
    return [...jobs.values()]
      .filter(({ job }) => job.groupId === groupId)
      .map((stored) => advance(stored))
      .sort((a, b) => b.id - a.id)
  },

  async getJob(jobId: number): Promise<DiaryJob> {
    await delay(150)
    const stored = jobs.get(jobId)
    if (!stored) throw new ApiError(404, 'NOT_FOUND', '영상 작업을 찾을 수 없어요.')
    return advance(stored)
  },
}
