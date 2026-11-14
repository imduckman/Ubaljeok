import { useEffect, useRef } from 'react'
import { Map, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export default function SuwonMap() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    const map = new Map({
      container: container.current,
      bounds: [126.9, 37.17, 127.13, 37.37],
      fitBoundsOptions: { padding: 20 },
      style: {
        version: 8,
        sources: {
          suwon: {
            type: 'geojson',
            data: `${import.meta.env.BASE_URL}data/suwon.geojson`,
          },
        },
        layers: [
          {
            id: 'suwon-fill',
            type: 'fill',
            source: 'suwon',
            paint: {
  'fill-color': [
    'case',
    ['==', ['to-string', ['get', 'adm_cd2']], '4111156000'],
    '#ffe3e9',
    '#e4e8ff',
  ],
},
          },
          {
            id: 'suwon-outline',
            type: 'line',
            source: 'suwon',
            paint: {
              'line-color': '#4f62a0',
              'line-width': 1.5,
            },
          },
        ],
      },
    })

    return () => map.remove()
  }, [])

  return (
    <section aria-label="수원시 행정동 지도">
      <h2>수원시 행정동 경계</h2>
      <div ref={container} style={{ width: '100%', height: 420 }} />
    </section>
  )
}