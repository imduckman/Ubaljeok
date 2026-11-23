import { useEffect, useRef, useState } from 'react'
import { Map, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { suwonRegion } from './mapRegions'
import styles from './RegionBoundaryMap.module.css'
import type { ExpressionSpecification } from 'maplibre-gl'
import { getVisitMap, type VisitMapResponse } from '../api/endpoints/visits'

import { mountBuildingMarkers } from './mapBuildingMarkers'

setWorkerUrl(workerUrl)

const visitLabels = ['1회', '2회', '3–4회', '5–9회', '10회+']

export interface SelectedRegion {
  regionCode: string
  name: string
}

interface RegionBoundaryMapProps {
  region?: typeof suwonRegion
  groupId: number
  /** 있으면 동네를 눌렀을 때 이 함수로 알려주고, 지도 아래 임시 칸은 띄우지 않는다. */
  onSelectRegion?: (selected: SelectedRegion) => void
}

export function RegionBoundaryMap({ region = suwonRegion, groupId, onSelectRegion }: RegionBoundaryMapProps) {
  // 지도는 한 번만 만들기 때문에, 최신 콜백을 ref로 들고 있는다.
  const onSelectRef = useRef(onSelectRegion)
  useEffect(() => {
    onSelectRef.current = onSelectRegion
  }, [onSelectRegion])
  const popupRef = useRef<Popup | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [visitLoadFailed, setVisitLoadFailed] = useState(false)
  const [buildingLoadFailed, setBuildingLoadFailed] = useState(false)

  useEffect(() => {
    if (!container.current) return
    const controller = new AbortController()
    const mapInstance = { current: null as Map | null }
    const load = async () => {
      try {
        const [boundaries, visits] = await Promise.all([
  region.loadBoundaries(controller.signal),
  getVisitMap(groupId, controller.signal).catch(() => null),
])

const element = container.current
if (controller.signal.aborted || !element) return

setVisitLoadFailed(visits === null)

const defaultColor = '#ecedf1'
const theme = getComputedStyle(element)
const visitedRegions: VisitMapResponse['regions'] = visits?.regions ?? []
const [firstVisit, ...remainingVisits] = visitedRegions

const colorForLevel = (level: number) =>
  theme.getPropertyValue(`--visit-${level}`).trim() || defaultColor

const fillColor: string | ExpressionSpecification = firstVisit
  ? [
      'match',
      ['get', 'regionCode'],
      firstVisit.regionCode,
      colorForLevel(firstVisit.level),
      ...remainingVisits.flatMap(({ regionCode, level }) => [
        regionCode,
        colorForLevel(level),
      ]),
      defaultColor,
    ]
  : defaultColor
        const map = new Map({
          container: element,
          bounds: region.bounds,
          fitBoundsOptions: { padding: 20 },
          style: {
            version: 8,
            sources: {
              regions: {
                type: 'geojson',
                data: boundaries,
                attribution: '통계청 SGIS (공공누리 제1유형) · vuski/admdongkor (CC BY 4.0)',
              },
            },
            layers: [
              { id: 'regions', type: 'fill', source: 'regions', paint: { 'fill-color': fillColor } },
              { id: 'region-depth', type: 'line', source: 'regions', paint: {
                'line-color': '#d5d7de', 'line-width': 4, 'line-translate': [0, 4],
              } },
              { id: 'region-outline', type: 'line', source: 'regions', paint: {
                'line-color': '#ffffff', 'line-width': 3.5,
              } },
            ],
          },
        })
        mapInstance.current = map
        const popup = new Popup({
          className: styles.selectedLabel,
          closeButton: false,
          closeOnClick: false,
          offset: 8,
        })
        popupRef.current = popup
        mountBuildingMarkers(
          map,
          boundaries,
          groupId,
          controller.signal,
          ({ regionCode, name, position }) => {
            if (onSelectRef.current) {
              onSelectRef.current({ regionCode, name })
            } else {
              setSelection(name)
            }
            popup.setLngLat(position).setText(name).addTo(map)
          },
          () => setBuildingLoadFailed(true),
        )
        map.on('click', 'regions', (event) => {
          const properties = event.features?.[0]?.properties
          const fullName = properties?.adm_nm
          if (typeof fullName !== 'string') return
          const name = fullName.trim().split(/\s+/).at(-1)
          if (!name) return
          const regionCode = properties?.regionCode ?? properties?.adm_cd2
          if (onSelectRef.current && typeof regionCode === 'string') {
            onSelectRef.current({ regionCode, name })
          } else {
            setSelection(name)
          }
          popup.setLngLat(event.lngLat).setText(name).addTo(map)
        })
        map.on('error', () => setStatus('error'))
        map.once('load', () => setStatus('ready'))
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }
    void load()
    return () => {
      controller.abort()
      popupRef.current?.remove()
      popupRef.current = null
      mapInstance.current?.remove()
    }
  }, [region, groupId])

  return (
    <section aria-label={`${region.name} 행정동 지도`}>
      <div className={styles.mapFrame}>
        <div ref={container} className={styles.canvas} />
        {status === 'ready' && (
          <aside className={styles.legend} aria-label="방문 횟수 범례">
            <strong>방문 횟수</strong>
            <ul>
              {visitLabels.map((label, index) => (
                <li key={label}>
                  <span aria-hidden="true" style={{ backgroundColor: `var(--visit-${index + 1})` }} />
                  {label}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      {selection && (
        <section className={styles.sheet} aria-label="선택한 동네">
          <h3>{selection}</h3>
          <button type="button" onClick={() => {
            popupRef.current?.remove()
            setSelection(null)
          }}>닫기</button>
        </section>
      )}
      {status === 'ready' && buildingLoadFailed && <p role="status">건물 정보를 불러오지 못했어요.</p>}
      {status === 'loading' && <p role="status">동네 경계를 불러오는 중…</p>}
      {status === 'error' && <p role="alert">동네 경계를 불러오지 못했어요.</p>}
      {status === 'ready' && visitLoadFailed && <p role="status">방문 기록을 불러오지 못했어요.</p>}
    </section>
  )
}
