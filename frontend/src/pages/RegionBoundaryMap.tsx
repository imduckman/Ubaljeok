import { useEffect, useRef, useState } from 'react'
import { Map, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { request } from '../api/client'

setWorkerUrl(workerUrl)

export function RegionBoundaryMap() {
  const container = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!container.current) return
    const controller = new AbortController()
    const mapInstance = { current: null as Map | null }
    const load = async () => {
      try {
        const boundaries = await request<Exclude<Parameters<GeoJSONSource['setData']>[0], string>>('/regions/geojson', { signal: controller.signal })
        const element = container.current
        if (controller.signal.aborted || !element) return
        const map = new Map({
          container: element,
          bounds: [126.9, 37.17, 127.13, 37.37],
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
        map.on('error', () => setStatus('error'))
        map.once('load', () => setStatus('ready'))
      } catch {
        if (!controller.signal.aborted) setStatus('error')
      }
    }
    void load()
    return () => {
      controller.abort()
      mapInstance.current?.remove()
    }
  }, [])

  return (
    <section aria-label="수원시 행정동 지도">
      <div ref={container} style={{ width: '100%', height: 420 }} />
      {status === 'loading' && <p role="status">동네 경계를 불러오는 중…</p>}
      {status === 'error' && <p role="alert">동네 경계를 불러오지 못했어요.</p>}
    </section>
  )
}
