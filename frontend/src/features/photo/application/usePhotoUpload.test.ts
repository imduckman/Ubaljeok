import { act, renderHook } from '@testing-library/react'
import { uploadPhoto } from '../../../api/endpoints/photos'
import { ApiError } from '../../../shared/types/api'
import { usePhotoUpload } from './usePhotoUpload'

vi.mock('../../../api/endpoints/photos')
const upload = vi.mocked(uploadPhoto)
const jpeg = (name: string) => new File(['photo'], name, { type: 'image/jpeg' })

beforeEach(() => {
  upload.mockReset()
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:photo')
    static revokeObjectURL = vi.fn()
  })
})

afterEach(() => vi.unstubAllGlobals())

it('화면을 떠나면 진행 중 요청을 취소하고 다음 사진을 보내지 않는다', async () => {
  let finish!: (reason: Error) => void
  upload.mockImplementationOnce(() => new Promise((_resolve, reject) => { finish = reject }))
  const { result, unmount } = renderHook(() => usePhotoUpload(101))
  act(() => result.current.addFiles([jpeg('first.jpg'), jpeg('second.jpg')]))

  const pending = result.current.startUpload()
  const signal = upload.mock.calls[0][1]
  unmount()
  expect(signal?.aborted).toBe(true)

  finish(new Error('late response'))
  await pending
  expect(upload).toHaveBeenCalledTimes(1)
})

it('일시 오류 뒤 다시 올릴 때 직접 고른 동네 코드를 유지한다', async () => {
  upload
    .mockRejectedValueOnce(new ApiError(422, 'REGION_REQUIRED', '동네를 골라주세요'))
    .mockRejectedValueOnce(new ApiError(500, 'UNKNOWN', '다시 시도해 주세요'))
    .mockRejectedValueOnce(new ApiError(500, 'UNKNOWN', '다시 시도해 주세요'))
  const { result } = renderHook(() => usePhotoUpload(101))
  act(() => result.current.addFiles([jpeg('manual.jpg')]))
  await act(() => result.current.startUpload())
  const id = result.current.items[0].id
  await act(async () => result.current.assignRegion(id, '4111573000'))
  await act(async () => result.current.retryItem(id))

  expect(upload).toHaveBeenCalledTimes(3)
  expect(upload.mock.calls[2][0].regionCode).toBe('4111573000')
})
