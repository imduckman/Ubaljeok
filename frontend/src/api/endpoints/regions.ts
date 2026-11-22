import type { GeoJSONSource } from 'maplibre-gl'
import { request, USE_MOCK_API } from '../client'
import { loadMockRegions } from '../mock/mockRegions'
import type { Region } from '../../shared/types/region'

/** 동네 직접 고르기에 쓰는 지원 지역 행정동 목록 (API.md `GET /api/regions`) */
export async function listRegions(): Promise<Region[]> {
  if (USE_MOCK_API) return loadMockRegions()
  const { regions } = await request<{ regions: Region[] }>('/regions')
  return regions
}

type RegionBoundaries = Exclude<Parameters<GeoJSONSource['setData']>[0], string>

export async function getRegionBoundaries(signal: AbortSignal): Promise<RegionBoundaries> {
  if (!USE_MOCK_API) return request<RegionBoundaries>('/regions/geojson', { signal })

  const response = await fetch(`${import.meta.env.BASE_URL}data/suwon-ver20261001.geojson`, { signal })
  if (!response.ok) throw new Error('Mock region boundaries could not be loaded')
  return response.json()
}
