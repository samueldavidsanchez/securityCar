'use client'

import type { GpsPosition } from '@securitycar/shared'
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

interface Props {
  route: GpsPosition[]
}

/**
 * Mapa que dibuja la ruta de un viaje como polilínea, con marcadores de
 * inicio (verde) y fin, y ajusta el encuadre a la ruta.
 */
export function TripRouteMap({ route }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [-70.66, -33.45],
      zoom: 10,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Dibuja / actualiza la ruta cuando cambian los puntos.
  useEffect(() => {
    const map = mapRef.current
    if (!map || route.length === 0) return

    const coords: [number, number][] = route.map(p => [p.lng, p.lat])
    const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: coords },
    }

    const draw = () => {
      const src = map.getSource('trip-route') as maplibregl.GeoJSONSource | undefined
      if (src) {
        src.setData(geojson)
      } else {
        map.addSource('trip-route', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'trip-route-line',
          type: 'line',
          source: 'trip-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#9AB055', 'line-width': 4 },
        })
      }

      // Marcadores inicio/fin (se recrean en cada actualización).
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      const start = route[0]
      const end = route[route.length - 1]
      const mkMarker = (p: GpsPosition, color: string) =>
        new maplibregl.Marker({ color }).setLngLat([p.lng, p.lat]).addTo(map)
      markersRef.current.push(mkMarker(start, '#9AB055'))
      markersRef.current.push(mkMarker(end, '#1D1D1B'))

      // Encuadra la ruta.
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      )
      map.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 0 })
    }

    if (map.isStyleLoaded()) draw()
    else map.once('load', draw)
  }, [route])

  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-lg" />
}
