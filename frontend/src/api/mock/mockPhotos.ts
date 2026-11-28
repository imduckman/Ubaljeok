/**
 * 사진 업로드용 가짜 서버.
 * EXIF 대신 파일 이름으로 GPS 없음·오래된 사진·실패를 흉내 낸다.
 * 방문 기록은 메모리에서 관리하며 새로고침하면 초기화된다.
 */
import { ApiError } from '../../shared/types/api'
import type { UploadPhotoRequest, UploadPhotoResponse } from '../../features/photo/domain/Photo'
import { loadMockRegions } from './mockRegions'
import { recordMockVisit } from './mockVisits'

const NETWORK_DELAY_MS = 700

const uploadedKeys = new Set<string>()
const failedOnce = new Set<string>()
let nextPhotoId = 500

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

function readPhotoUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new ApiError(500, 'UNKNOWN', '사진을 읽지 못했어요. 다시 시도해 주세요.'))
    reader.readAsDataURL(file)
  })
}

export const mockPhotoServer = {
  async uploadPhoto({ groupId, file, regionCode }: UploadPhotoRequest, signal?: AbortSignal): Promise<UploadPhotoResponse> {
    await delay()
    signal?.throwIfAborted()
    const name = file.name.toLowerCase()
    const key = `${groupId}:${file.name}:${file.size}`

    if (name.includes('fail') && !failedOnce.has(key)) {
      failedOnce.add(key)
      throw new ApiError(500, 'UNKNOWN', '사진을 올리지 못했어요.')
    }
    if (uploadedKeys.has(key)) {
      throw new ApiError(409, 'DUPLICATE_PHOTO', '이미 올린 사진이에요.')
    }

    const regions = await loadMockRegions()
    signal?.throwIfAborted()
    const hasGps = !name.includes('nogps')
    if (hasGps && name.includes('outside')) {
      throw new ApiError(422, 'OUT_OF_SUPPORTED_AREA', '수원시 밖에서 찍은 사진은 올릴 수 없어요.')
    }
    if (!hasGps && !regionCode) {
      throw new ApiError(422, 'REGION_REQUIRED', '사진에 위치 정보가 없어요. 동네를 골라주세요.')
    }

    const region = hasGps
      ? regions[hash(file.name) % regions.length]
      : regions.find((candidate) => candidate.regionCode === regionCode)
    if (!region) {
      throw new ApiError(422, 'UNKNOWN_REGION', '지원하지 않는 동네예요.')
    }

    const ineligibleReason = !hasGps
      ? 'no_gps'
      : name.includes('old') ? 'older_than_30_days' : null
    const rewardEligible = ineligibleReason === null
    const visitDate = todayKst()
    const fileUrl = await readPhotoUrl(file)
    signal?.throwIfAborted()
    // 파일을 읽는 사이 동일 사진 업로드가 완료된 경우도 중복 기록을 막는다.
    if (uploadedKeys.has(key)) {
      throw new ApiError(409, 'DUPLICATE_PHOTO', '이미 올린 사진이에요.')
    }
    const photoId = nextPhotoId++
    const takenAt = hasGps ? new Date().toISOString() : null
    const visit = recordMockVisit(
      groupId,
      region.regionCode,
      visitDate,
      rewardEligible,
      { id: photoId, takenAt, fileUrl },
    )
    uploadedKeys.add(key)

    return {
      photo: {
        id: photoId,
        takenAt,
        locationSource: hasGps ? 'exif' : 'manual',
        rewardEligible,
        ineligibleReason,
      },
      visit: {
        id: visit.id,
        regionCode: region.regionCode,
        regionName: region.name,
        visitDate,
        rewardEligible: visit.rewardEligible,
        isNewVisit: visit.isNewVisit,
      },
    }
  },
}
