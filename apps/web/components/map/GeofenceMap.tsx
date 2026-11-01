'use client'

import type { Geofence, GpsPosition, LatLng } from '@securitycar/shared'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

// Mismo estilo raster de OSM que VehicleMap — sin API key.
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

const ACCENT = '#9AB055'
const DRAFT = '#F5F5F4'

/** Borrador que el usuario está dibujando. */
export type GeofenceDraft =
  | { shape: 'circle'; center: LatLng | null; radius_m: number }
  | { shape: 'polygon'; points: LatLng[] }

/**
 * Aproxima un círculo geodésico con un polígono de 64 lados. MapLibre no tiene
 * círculos en metros (el `circle` layer es en píxeles); a las escalas de una
 * geocerca (≤ 50 km) la aproximación equirectangular es suficiente.
 */
function circleRing(center: LatLng, radiusM: number): [number, number][] {
  const ring: [number, number][] = []
  const dLat = radiusM / 111_320
  const dLng = radiusM / (111_320 * Math.cos((center.lat * Math.PI) / 180))
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI
    ring.push([center.lng + dLng * Math.cos(a), center.lat + dLat * Math.sin(a)])
  }
  return ring
}

function fenceRing(f: Geofence): [number, number][] {
  if (f.shape === 'circle') return circleRing(f.geometry.center, f.geometry.radius_m)
  const pts = f.geometry.points.map(p => [p.lng, p.lat] as [number, number])
  return [...pts, pts[0]]
}

function draftFeatures(draft: GeofenceDraft | null): GeoJSON.Feature[] {
  if (!draft) return []
  if (draft.shape === 'circle') {
    if (!draft.center) return []
    return [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [circleRing(draft.center, draft.radius_m)] },
      },
    ]
  }
  const coords = draft.points.map(p => [p.lng, p.lat] as [number, number])
  if (coords.length === 0) return []
  const features: GeoJSON.Feature[] = [
    { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: coords } },
  ]
  if (coords.length >= 3) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Polygon', coordinates: [[...coords, coords[0]]] },
    })
  } else if (coords.length === 2) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
  }
  return features
}

interface Props {
  position: GpsPosition | null
  geofences: Geofence[]
  draft: GeofenceDraft | null
  /** Clic en el mapa mientras se dibuja. */
  onMapClick: (p: LatLng) => void
}

/**
 * Mapa del editor de geocercas: dibuja las geocercas guardadas (verde), el
 * borrador en curso (claro) y el vehículo. Los clics se reenvían al padre, que
 * decide si son el centro del círculo o un vértice del polígono.
 */
export function GeofenceMap({ position, geofences, draft, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const clickRef = useRef(onMapClick)
  const fittedRef = useRef(false)

  useEffect(() => {
    clickRef.current = onMapClick
  }, [onMapClick])

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: position ? [position.lng, position.lat] : [-70.66, -33.45],
      zoom: position ? 14 : 10,
      attributionControl: { compact: true },
      doubleClickZoom: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      map.addSource('fences', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'fences-fill', type: 'fill', source: 'fences', paint: { 'fill-color': ACCENT, 'fill-opacity': 0.15 } })
      map.addLayer({ id: 'fences-line', type: 'line', source: 'fences', paint: { 'line-color': ACCENT, 'line-width': 2 } })
      map.addLayer({
        id: 'fences-label',
        type: 'symbol',
        source: 'fences',
        layout: { 'text-field': ['get', 'name'], 'text-size': 12 },
        paint: { 'text-color': '#1D1D1B', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
      })
      map.addSource('draft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'draft-fill',
        type: 'fill',
        source: 'draft',
        filter: ['==', '$type', 'Polygon'],
        paint: { 'fill-color': DRAFT, 'fill-opacity': 0.25 },
      })
      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft',
        filter: ['!=', '$type', 'Point'],
        paint: { 'line-color': DRAFT, 'line-width': 2, 'line-dasharray': [2, 1] },
      })
      map.addLayer({
        id: 'draft-points',
        type: 'circle',
        source: 'draft',
        filter: ['==', '$type', 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': DRAFT, 'circle-stroke-color': '#1D1D1B', 'circle-stroke-width': 1.5 },
      })
      map.fire('fences-ready')
    })
    map.on('click', e => clickRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Geocercas guardadas; encuadra una sola vez al cargarlas.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const src = map.getSource('fences') as maplibregl.GeoJSONSource | undefined
      if (!src) return
      src.setData({
        type: 'FeatureCollection',
        features: geofences.map(f => ({
          type: 'Feature',
          properties: { name: f.name },
          geometry: { type: 'Polygon', coordinates: [fenceRing(f)] },
        })),
      })
      if (!fittedRef.current && geofences.length > 0) {
        const bounds = new maplibregl.LngLatBounds()
        geofences.forEach(f => fenceRing(f).forEach(c => bounds.extend(c)))
        if (position) bounds.extend([position.lng, position.lat])
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 })
        fittedRef.current = true
      }
    }
    if (map.getSource('fences')) apply()
    else map.once('fences-ready', apply)
  }, [geofences, position])

  // Borrador.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const src = map.getSource('draft') as maplibregl.GeoJSONSource | undefined
      src?.setData({ type: 'FeatureCollection', features: draftFeatures(draft) })
    }
    if (map.getSource('draft')) apply()
    else map.once('fences-ready', apply)
    map.getCanvas().style.cursor = draft ? 'crosshair' : ''
  }, [draft])

  // Vehículo.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const lngLat: [number, number] = [position.lng, position.lat]
    if (!markerRef.current) {
      const el = document.createElement('div')
      el.className = 'vehicle-marker'
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map)
    } else {
      markerRef.current.setLngLat(lngLat)
    }
  }, [position])

  return <div ref={containerRef} className="h-full w-full" />
}
