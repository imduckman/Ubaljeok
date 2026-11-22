import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type { GeoJSON, Geometry, Position } from 'geojson'
import { getRegionOwnership } from '../api/endpoints/visits'
import styles from './mapBuildingMarkers.module.css'

type BuildingSelection = {
  regionCode: string
  name: string
  position: [number, number]
}

/** 오목한 경계와 구멍을 고려해 경계 내부의 표시 위치를 찾는다. */
export function findBuildingPosition(geometry: Geometry | null): [number, number] | null {
  if (!geometry) return null
  const polygons = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon' ? geometry.coordinates : []

  let best: [number, number] | null = null
  let bestWidth = 0

  for (const rings of polygons) {
    const outer = rings[0]
    if (!outer || outer.length < 4) continue

    const latitudes = outer.map((point) => point[1])
    const south = Math.min(...latitudes)
    const north = Math.max(...latitudes)
    if (!Number.isFinite(south) || !Number.isFinite(north) || north <= south) continue

    for (let row = 0; row < 17; row++) {
      const latitude = south + (north - south) * (row + 0.5) / 17
      const crossings: number[] = []

      for (const ring of rings) {
        for (let index = 0; index < ring.length; index++) {
          const start: Position = ring[index]
          const end: Position = ring[(index + 1) % ring.length]
          if ((start[1] > latitude) === (end[1] > latitude)) continue

          crossings.push(
            start[0] +
            (latitude - start[1]) * (end[0] - start[0]) / (end[1] - start[1]),
          )
        }
      }

      crossings.sort((left, right) => left - right)
      for (let index = 0; index + 1 < crossings.length; index += 2) {
        const width = crossings[index + 1] - crossings[index]
        if (width > bestWidth) {
          bestWidth = width
          best = [(crossings[index] + crossings[index + 1]) / 2, latitude]
        }
      }
    }
  }

  return best
}

/** 기존 소유 정보로 건물 마커만 표시한다. 그룹 전환 시 요청 결과와 마커를 폐기한다. */
export function mountBuildingMarkers(
  map: MapLibreMap,
  boundaries: GeoJSON,
  groupId: number,
  signal: AbortSignal,
  onSelect: (region: BuildingSelection) => void,
  onLoadError: () => void,
) {
  if (signal.aborted) return

  const markers: Marker[] = []
  const candidates = new globalThis.Map<string, BuildingSelection & { width: number }>()

  const features = boundaries.type === 'FeatureCollection'
    ? boundaries.features
    : boundaries.type === 'Feature' ? [boundaries] : []

  for (const feature of features) {
    const properties = feature.properties
    const regionCode = properties?.regionCode ?? properties?.adm_cd2
    const fullName = properties?.adm_nm
    if (typeof regionCode !== 'string' || typeof fullName !== 'string') continue

    const position = findBuildingPosition(feature.geometry)
    if (!position) continue

    // 같은 동네가 여러 Feature로 나뉘어 있으면 아이콘은 한 개만 표시한다.
    if (!candidates.has(regionCode)) {
      candidates.set(regionCode, {
        regionCode,
        name: fullName.trim().split(/\s+/).at(-1) ?? fullName,
        position,
        width: 0,
      })
    }
  }

  const cleanup = () => {
    for (const marker of markers) marker.remove()
    markers.length = 0
  }
  signal.addEventListener('abort', cleanup, { once: true })

  const load = async () => {
    const results = await Promise.allSettled(
      [...candidates.values()].map(async (region) => ({
        region,
        ownership: await getRegionOwnership(groupId, region.regionCode),
      })),
    )

    if (signal.aborted) return

    let hasFailure = false
    for (const result of results) {
      if (result.status === 'rejected') {
        hasFailure = true
        continue
      }

      const { region, ownership } = result.value
      if (ownership.status === 'unowned' || ownership.level !== 'building') continue

      const button = document.createElement('button')
      button.type = 'button'
      button.className = `${styles.marker} ${
        ownership.status === 'ours' ? styles.ours : styles.theirs
      }`
      const owner = ownership.status === 'ours' ? '우리 그룹' : ownership.ownerGroupName
      button.setAttribute('aria-label', `${region.name}, ${owner} 건물, 동네 상세 열기`)
      button.title = `${region.name} · ${owner} 건물`
      button.innerHTML = '<svg viewBox="0 0 48 56" aria-hidden="true" focusable="false"><ellipse cx="24" cy="49" rx="17" ry="5" fill="#000" opacity=".12"/><path d="M8 39 24 31 40 39 24 47Z" fill="currentColor" opacity=".5"/><path d="M8 39 24 47V53L8 45Z" fill="currentColor"/><path d="M24 47 40 39V45L24 53Z" fill="currentColor" opacity=".8"/><path d="M14 20 24 15 34 20 24 25Z" fill="currentColor" opacity=".45"/><path d="M14 20 24 25V43L14 38Z" fill="currentColor"/><path d="M24 25 34 20V38L24 43Z" fill="currentColor" opacity=".8"/><path d="M18 26V30M18 33V37M29 26V30M29 33V37" stroke="#fff" stroke-width="2" opacity=".8"/></svg>'
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        if (!signal.aborted) onSelect(region)
      })

      markers.push(
        new Marker({ element: button, anchor: 'center' })
          .setLngLat(region.position)
          .addTo(map),
      )
    }

    if (hasFailure) onLoadError()
  }

  void load().catch(() => {
    if (!signal.aborted) onLoadError()
  })
}
