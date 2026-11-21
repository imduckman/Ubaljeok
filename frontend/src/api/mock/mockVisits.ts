/**
 * 동네 상세용 가짜 서버. 동네 코드마다 정해진 예시를 돌려준다.
 * - 4개 중 1개 동네는 사진이 없다 (빈 화면 확인용)
 * - 소유 상태는 주인 없음 / 우리 건물 / 우리 랜드마크 / 다른 그룹이 골고루 나온다
 * 업로드한 사진과는 연결되지 않는다.
 */
import type { RegionDetail, RegionOwnership, RegionPhoto, RegionVisit } from '../../features/visit/domain/RegionDetail'
import { loadMockRegions } from './mockRegions'

const NETWORK_DELAY_MS = 400
const PHOTO_COLORS = ['#ffbdcb', '#fc93ab', '#ffe3e9', '#e4e8ff', '#c9d0fb', '#fff1c9', '#f5dc93']

function delay(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0
  return value
}

/** 사진 대신 쓰는 색 네모 그림 */
function samplePhotoUrl(seed: number) {
  const background = PHOTO_COLORS[seed % PHOTO_COLORS.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${background}"/><circle cx="70" cy="32" r="11" fill="#ffffff" opacity="0.85"/><path d="M0 80 L32 48 L58 72 L74 58 L100 82 V100 H0 Z" fill="#ffffff" opacity="0.6"/></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function dateDaysAgo(days: number) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000 - days * 24 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 10)
}

export const mockVisitServer = {
  async getRegionDetail(groupId: number, regionCode: string, signal?: AbortSignal): Promise<RegionDetail> {
    await delay()
    signal?.throwIfAborted()
    const regions = await loadMockRegions()
    signal?.throwIfAborted()
    const name = regions.find((region) => region.regionCode === regionCode)?.name ?? '이 동네'
    const seed = hash(`${groupId}:${regionCode}`)

    if (seed % 4 === 0) return { region: { regionCode, name }, visitCount: 0, visits: [] }

    const visitTotal = (seed % 3) + 1
    const visits: RegionVisit[] = Array.from({ length: visitTotal }, (_, index) => {
      const photoTotal = index === 0 && seed % 5 === 1 ? 11 : ((seed >>> (index + 2)) % 4) + 1
      const photos: RegionPhoto[] = Array.from({ length: photoTotal }, (_, photoIndex) => {
        const id = (seed % 1000) * 100 + index * 20 + photoIndex
        return { id, takenAt: null, fileUrl: samplePhotoUrl(id) }
      })
      return {
        id: (seed % 1000) * 10 + index,
        visitDate: dateDaysAgo(index * 4 + (seed % 3)),
        // 가장 오래된 방문 하나는 코인 제외(위치 직접 고름 등)로 둔다
        rewardEligible: !(visitTotal > 1 && index === visitTotal - 1),
        photos,
      }
    })
    return { region: { regionCode, name }, visitCount: visitTotal, visits }
  },

  async getRegionOwnership(groupId: number, regionCode: string): Promise<RegionOwnership> {
    await delay(150)
    // 방문하지 않은 동네는 우리 땅일 수 없다
    const isVisited = hash(`${groupId}:${regionCode}`) % 4 !== 0
    switch (hash(`${groupId}:${regionCode}:owner`) % 4) {
      case 1:
        return isVisited ? { status: 'ours', level: 'building' } : { status: 'unowned' }
      case 2:
        return isVisited ? { status: 'ours', level: 'landmark' } : { status: 'unowned' }
      case 3:
        return { status: 'theirs', ownerGroupName: '과동기 탐험대', level: hash(regionCode) % 2 ? 'landmark' : 'building' }
      default:
        return { status: 'unowned' }
    }
  },
}
