import { request, USE_MOCK_API } from '../client'
import { mockDiaryServer } from '../mock/mockDiary'
import type { CreateDiaryJobRequest, DiaryJob, GroupPhoto } from '../../features/video/domain/Video'

/**
 * 영상 일기 API. 백엔드 구현 전이라 계약은 docs/MVP-IMPLEMENTATION.md 5장(PR #26)을 따른다.
 * 실제 API가 생기면 응답 모양이 같은지 다시 확인한다.
 */

/** 영상에 고를 수 있는 그룹 사진 (첫 페이지) */
export async function listGroupPhotos(groupId: number): Promise<GroupPhoto[]> {
  if (USE_MOCK_API) return mockDiaryServer.listGroupPhotos(groupId)
  const { photos } = await request<{ photos: GroupPhoto[]; nextCursor: string | null }>(`/photos?groupId=${groupId}`)
  return photos
}

/**
 * 영상 작업 만들기. 같은 요청을 다시 보낼 때(응답이 끊긴 뒤 재시도 등)는 같은 idempotencyKey를 넘겨야
 * 서버가 첫 작업을 돌려주고 새 작업(과금)을 만들지 않는다 (MVP 4장).
 */
export async function createDiaryJob(body: CreateDiaryJobRequest, idempotencyKey: string): Promise<DiaryJob> {
  if (USE_MOCK_API) return mockDiaryServer.createJob(body)
  const { job } = await request<{ job: DiaryJob }>('/diary/jobs', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return job
}

/** 그룹의 영상 작업 목록 (첫 페이지, 최신순). 화면에 다시 들어왔을 때 진행 중인 작업을 이어 보여주는 데 쓴다 */
export async function listDiaryJobs(groupId: number): Promise<DiaryJob[]> {
  if (USE_MOCK_API) return mockDiaryServer.listJobs(groupId)
  const { jobs } = await request<{ jobs: DiaryJob[]; nextCursor: string | null }>(`/diary/jobs?groupId=${groupId}`)
  return jobs
}

export async function getDiaryJob(jobId: number): Promise<DiaryJob> {
  if (USE_MOCK_API) return mockDiaryServer.getJob(jobId)
  const { job } = await request<{ job: DiaryJob }>(`/diary/jobs/${jobId}`)
  return job
}
