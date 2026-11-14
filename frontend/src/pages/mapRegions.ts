import type { LngLatBoundsLike } from 'maplibre-gl'
import { getRegionBoundaries } from '../api/endpoints/regions'

export const suwonRegion = {
  name: '수원시',
  bounds: [126.9, 37.17, 127.13, 37.37] satisfies LngLatBoundsLike,
  loadBoundaries: getRegionBoundaries,
}
