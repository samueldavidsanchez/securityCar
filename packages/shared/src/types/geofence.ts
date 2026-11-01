export type GeofenceShape = 'circle' | 'polygon'

export interface LatLng {
  lat: number
  lng: number
}

export interface CircleGeometry {
  center: LatLng
  radius_m: number
}

export interface PolygonGeometry {
  points: LatLng[]
}

/**
 * Zona dibujada por el usuario. La detección de entrada/salida la hace Flespi
 * (calculator con selector `geofence`); aquí solo vive la definición y el id
 * de su espejo en Flespi.
 */
export type Geofence = {
  id: string
  vehicle_id: string
  name: string
  alert_on_enter: boolean
  alert_on_exit: boolean
  created_at: string
} & (
  | { shape: 'circle'; geometry: CircleGeometry }
  | { shape: 'polygon'; geometry: PolygonGeometry }
)

/** Máximo de geocercas por vehículo — acota el coste en Flespi y la UI. */
export const MAX_GEOFENCES_PER_VEHICLE = 20
