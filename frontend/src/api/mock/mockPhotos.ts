/**
 * 사진 업로드용 가짜 서버. 실제 서버처럼 EXIF를 읽지 않으므로 파일 이름으로 상황을 흉내 낸다.
 * - 이름에 nogps 가 들어가면: 위치 정보 없음 → 동네를 직접 골라야 함 (422 REGION_REQUIRED)
 * - 이름에 old 가 들어가면: 30일 지난 사진 → 기록은 되지만 코인 대상 아님
 * - 이름에 fail 이 들어가면: 처음 한 번은 서버 오류 (다시 올리기 확인용)
 * - 같은 그룹에 같은 이름·크기를 또 올리면: 409 DUPLICATE_PHOTO
 * 그 외에는 이름에 따라 수원시 동네 하나로 판정한다.
 */
import { ApiError } from '../../shared/types/api'
import type { UploadPhotoRequest, UploadPhotoResponse } from '../../features/photo/domain/Photo'
import { loadMockRegions } from './mockRegions'

const NETWORK_DELAY_MS = 700

const uploadedKeys = new Set<string>()
const failedOnce = new Set<string>()
let nextPhotoId = 500
let nextVisitId = 70

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

function todayKst() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

export const mockPhotoServer = {
  async uploadPhoto({ groupId, file, regionCode }: UploadPhotoRequest): Promise<UploadPhotoResponse> {
    await delay()
    const name = file.name.toLowerCase()
    const key = `${groupId}:${file.name}:${file.size}`

    if (name.includes('fail') && !failedOnce.has(key)) {
      failedOnce.add(key)
      throw new ApiError(500, 'UNKNOWN', '사진을 올리지 못했어요.')
    }
    if (uploadedKeys.has(key)) throw new ApiError(409, 'DUPLICATE_PHOTO', '이미 올린 사진이에요.')

    const regions = await loadMockRegions()
    const hasGps = !name.includes('nogps')
    if (!hasGps && !regionCode) {
      throw new ApiError(422, 'REGION_REQUIRED', '사진에 위치 정보가 없어요. 동네를 골라주세요.')
    }

    const region = hasGps
      ? regions[hash(file.name) % regions.length]
      : regions.find((candidate) => candidate.regionCode === regionCode)
    if (!region) throw new ApiError(422, 'UNKNOWN_REGION', '지원하지 않는 동네예요.')

    const ineligibleReason = !hasGps ? 'no_gps' : name.includes('old') ? 'older_than_30_days' : null
    const rewardEligible = ineligibleReason === null
    uploadedKeys.add(key)

    return {
      photo: {
        id: nextPhotoId++,
        takenAt: hasGps ? new Date().toISOString() : null,
        locationSource: hasGps ? 'exif' : 'manual',
        rewardEligible,
        ineligibleReason,
      },
      visit: {
        id: nextVisitId++,
        regionCode: region.regionCode,
        regionName: region.name,
        visitDate: todayKst(),
        rewardEligible,
        isNewVisit: true,
      },
    }
  },
}
