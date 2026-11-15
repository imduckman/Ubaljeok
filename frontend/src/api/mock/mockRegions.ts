/** 가짜 서버용 동네 목록. 지도와 같은 경계 파일(public/data)에서 이름·코드를 읽는다. */
import type { Region } from '../../shared/types/region'

const FALLBACK_REGIONS: Region[] = [
  { regionCode: '4111156000', name: '파장동', sigunguName: '수원시장안구' },
  { regionCode: '4111560000', name: '행궁동', sigunguName: '수원시팔달구' },
  { regionCode: '4111759000', name: '영통1동', sigunguName: '수원시영통구' },
  { regionCode: '4111761000', name: '광교1동', sigunguName: '수원시영통구' },
]

let regionsCache: Region[] | null = null

export async function loadMockRegions(): Promise<Region[]> {
  if (regionsCache) return regionsCache
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/suwon-ver20261001.geojson`)
    const data = (await response.json()) as {
      features: { properties: { regionCode: string; adm_nm: string; sggnm: string } }[]
    }
    regionsCache = data.features
      .map(({ properties }) => ({
        regionCode: properties.regionCode,
        name: properties.adm_nm.split(' ').at(-1) ?? properties.adm_nm,
        sigunguName: properties.sggnm,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  } catch {
    regionsCache = FALLBACK_REGIONS
  }
  return regionsCache
}
