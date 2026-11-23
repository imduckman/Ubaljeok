import { act, renderHook, waitFor } from '@testing-library/react'
import { ApiError } from '../../../shared/types/api'
import type { CreateDiaryJobRequest, DiaryJob } from '../domain/Video'
import { useDiaryJob } from './useDiaryJob'

const api = vi.hoisted(() => ({
  createDiaryJob: vi.fn(),
  getDiaryJob: vi.fn(),
  listDiaryJobs: vi.fn(),
}))
vi.mock('../../../api/endpoints/diary', () => api)

const body: CreateDiaryJobRequest = { groupId: 7, photoIds: [1, 2, 3], representativePhotoId: 1, style: 'natural' }

function makeJob(overrides: Partial<DiaryJob> = {}): DiaryJob {
  return {
    id: 50,
    groupId: 7,
    status: 'queued',
    mode: 'real',
    style: 'natural',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    errorCode: null,
    retryable: false,
    retryAfterSeconds: null,
    resultUrl: null,
    ...overrides,
  }
}

async function renderReady() {
  const hook = renderHook(() => useDiaryJob(7))
  await waitFor(() => expect(hook.result.current.isRestoring).toBe(false))
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  api.listDiaryJobs.mockResolvedValue([])
})

describe('useDiaryJob 만들기 재시도 키', () => {
  it('응답이 끊긴 뒤 같은 내용으로 다시 만들면 같은 Idempotency-Key를 쓴다', async () => {
    api.createDiaryJob.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(makeJob())
    const { result } = await renderReady()

    await act(() => result.current.start(body))
    await act(() => result.current.start(body))

    const [first, second] = api.createDiaryJob.mock.calls.map((call) => call[1])
    expect(first).toBe(second)
  })

  it('서버가 확실히 거절했거나 내용이 바뀌면 새 키를 쓴다', async () => {
    api.createDiaryJob
      .mockRejectedValueOnce(new ApiError(422, 'INVALID_VIDEO_INPUT', '고른 사진을 다시 확인해 주세요.'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const { result } = await renderReady()

    await act(() => result.current.start(body))
    await act(() => result.current.start(body))
    await act(() => result.current.start({ ...body, style: 'funny' }))

    const keys = api.createDiaryJob.mock.calls.map((call) => call[1])
    expect(keys[0]).not.toBe(keys[1])
    expect(keys[1]).not.toBe(keys[2])
  })
})

describe('useDiaryJob 상태 조회', () => {
  afterEach(() => vi.useRealTimers())

  it.each([
    [401, true],
    [403, false],
    [404, false],
  ])('%i 오류면 조회를 멈추고 안내한다', async (status, needsLogin) => {
    api.createDiaryJob.mockResolvedValue(makeJob())
    api.getDiaryJob.mockRejectedValue(new ApiError(status, 'X', 'x'))
    const { result } = await renderReady()
    vi.useFakeTimers()

    await act(() => result.current.start(body))
    await act(() => vi.advanceTimersByTimeAsync(3_000))
    expect(api.getDiaryJob).toHaveBeenCalledTimes(1)
    expect(result.current.errorMessage).toBeTruthy()
    expect(result.current.needsLogin).toBe(needsLogin)

    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(api.getDiaryJob).toHaveBeenCalledTimes(1)
  })

  it('네트워크 오류는 계속 다시 묻는다', async () => {
    api.createDiaryJob.mockResolvedValue(makeJob())
    api.getDiaryJob.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = await renderReady()
    vi.useFakeTimers()

    await act(() => result.current.start(body))
    await act(() => vi.advanceTimersByTimeAsync(9_500))
    expect(api.getDiaryJob).toHaveBeenCalledTimes(3)
    expect(result.current.errorMessage).toBeNull()
  })
})
