import type { GeoJSONSource } from 'maplibre-gl'
import { request, USE_MOCK_API } from '../client'

type RegionBoundaries = Exclude<Parameters<GeoJSONSource['setData']>[0], string>

export async function getRegionBoundaries(signal: AbortSignal): Promise<RegionBoundaries> {
  if (!USE_MOCK_API) return request<RegionBoundaries>('/regions/geojson', { signal })

  const response = await fetch(`${import.meta.env.BASE_URL}data/suwon-ver20261001.geojson`, { signal })
  if (!response.ok) throw new Error('Mock region boundaries could not be loaded')
  return response.json()
}
