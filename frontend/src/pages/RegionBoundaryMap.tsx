import { useEffect, useRef, useState } from 'react'
import { Map, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { suwonRegion } from './mapRegions'
import styles from './RegionBoundaryMap.module.css'

setWorkerUrl(workerUrl)

const visitLabels = ['1회', '2회', '3–4회', '5–9회', '10회+']

export function RegionBoundaryMap({ region = suwonRegion }: { region?: typeof suwonRegion }) {
  const popupRef = useRef<Popup | null>(null)
  const [selection, setSelection] = useState<string | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!container.current) return
    const controller = new AbortController()
    const mapInstance = { current: null as Map | null }
    const load = async () => {
      try {
        const boundaries = await region.loadBoundaries(controller.signal)
        const element = container.current
        if (controller.signal.aborted || !element) return
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
              { id: 'regions', type: 'fill', source: 'regions', paint: { 'fill-color': '#ecedf1' } },
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
        map.on('click', 'regions', (event) => {
          const fullName = event.features?.[0]?.properties?.adm_nm
          if (typeof fullName !== 'string') return
          const name = fullName.trim().split(/\s+/).at(-1)
          if (!name) return
          setSelection(name)
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
  }, [region])

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
      {status === 'loading' && <p role="status">동네 경계를 불러오는 중…</p>}
      {status === 'error' && <p role="alert">동네 경계를 불러오지 못했어요.</p>}
    </section>
  )
}
