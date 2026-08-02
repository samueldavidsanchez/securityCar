'use client'

import type { GpsPosition } from '@securitycar/shared'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

// Free raster style backed by OpenStreetMap tiles — no API key required.
const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

interface Props {
  position: GpsPosition | null
  label: string
  recenterSignal: number
}

export function VehicleMap({ position, label, recenterSignal }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: position ? [position.lng, position.lat] : [-99.1332, 19.4326],
      zoom: position ? 15 : 4,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    // MapLibre sizes its canvas from the container's dimensions at
    // construction time and only re-syncs on a native `window` resize event
    // — a pure CSS/layout change to the container (sidebar toggle, flex
    // siblings changing width) doesn't trigger it. A ResizeObserver keeps
    // the canvas in sync whenever the container itself changes size.
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update marker on position change.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const lngLat: [number, number] = [position.lng, position.lat]

    if (!markerRef.current) {
      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      el.title = label
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
    } else {
      markerRef.current.setLngLat(lngLat)
    }
  }, [position, label])

  // Recenter when the button is pressed.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !position || recenterSignal === 0) return
    map.flyTo({ center: [position.lng, position.lat], zoom: 15, essential: true })
  }, [recenterSignal, position])

  return <div ref={containerRef} className="h-full w-full" />
}
