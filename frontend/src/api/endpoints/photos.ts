import { request, USE_MOCK_API } from '../client'
import { mockPhotoServer } from '../mock/mockPhotos'
import type { UploadPhotoRequest, UploadPhotoResponse } from '../../features/photo/domain/Photo'

/** 사진 한 장을 올린다. 서버가 EXIF를 다시 읽고 동네를 판정한다. (API.md `POST /api/photos`) */
export async function uploadPhoto({ groupId, file, regionCode }: UploadPhotoRequest): Promise<UploadPhotoResponse> {
  if (USE_MOCK_API) return mockPhotoServer.uploadPhoto({ groupId, file, regionCode })

  const body = new FormData()
  body.append('groupId', String(groupId))
  body.append('file', file)
  if (regionCode) body.append('regionCode', regionCode)
  return request<UploadPhotoResponse>('/photos', { method: 'POST', body })
}
