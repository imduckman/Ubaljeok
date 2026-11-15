/** 사진 업로드 규칙과 서버 응답 모양. 기준 문서: API.md `POST /api/photos`, docs/UI-STATES.md 3장 */

export const MAX_PHOTOS_PER_UPLOAD = 10
export const MAX_UPLOAD_MB = 15
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export type LocationSource = 'exif' | 'manual'

export type IneligibleReason =
  | 'no_gps'
  | 'out_of_area'
  | 'ambiguous_location'
  | 'no_taken_at'
  | 'future_date'
  | 'older_than_30_days'

export interface UploadedPhoto {
  id: number
  takenAt: string | null
  locationSource: LocationSource
  rewardEligible: boolean
  ineligibleReason: IneligibleReason | null
}

export interface PhotoVisit {
  id: number
  regionCode: string
  regionName: string
  visitDate: string
  rewardEligible: boolean
  isNewVisit: boolean
}

export interface UploadPhotoResponse {
  photo: UploadedPhoto
  visit: PhotoVisit
}

export interface UploadPhotoRequest {
  groupId: number
  file: File
  /** GPS로 동네를 못 정했을 때 직접 고른 동네 */
  regionCode?: string
}

export interface Region {
  regionCode: string
  name: string
  sigunguName: string
}

/** 올리기 전에 브라우저에서 바로 걸러낼 수 있는 문제 */
export function validatePhotoFile(file: File): string | null {
  const name = file.name.toLowerCase()
  const isJpeg = file.type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')
  if (!isJpeg) return 'JPEG 사진만 올릴 수 있어요'
  if (file.size > MAX_UPLOAD_BYTES) return `${MAX_UPLOAD_MB}MB보다 큰 사진은 올릴 수 없어요`
  return null
}

const INELIGIBLE_MESSAGES: Record<IneligibleReason, string> = {
  no_gps: '위치 정보가 없어 직접 고른 동네로 기록했어요',
  out_of_area: '수원시 밖에서 찍은 사진이라 코인은 받을 수 없어요',
  ambiguous_location: '동네 경계에서 찍혀서 직접 고른 동네로 기록했어요',
  no_taken_at: '찍은 시각 정보가 없어 코인은 받을 수 없어요',
  future_date: '찍은 날짜가 미래로 되어 있어 코인은 받을 수 없어요',
  older_than_30_days: '30일이 지난 사진이라 코인은 받을 수 없어요',
}

/** 코인을 못 받는 이유를 화면 문구로 바꾼다 */
export function describeIneligibleReason(reason: IneligibleReason | null): string | null {
  return reason ? INELIGIBLE_MESSAGES[reason] : null
}

/** 2026-11-14 → 11월 14일 */
export function formatVisitDate(visitDate: string): string {
  const [, month, day] = visitDate.split('-').map(Number)
  if (!month || !day) return visitDate
  return `${month}월 ${day}일`
}
