export function formatSpeed(kmh: number | null, unit: 'km/h' | 'mph' = 'km/h'): string {
  if (kmh === null) return '—'
  const value = unit === 'mph' ? kmh * 0.621371 : kmh
  return `${Math.round(value)} ${unit}`
}

export function formatDistance(km: number | null, unit: 'km' | 'mi' = 'km'): string {
  if (km === null) return '—'
  const value = unit === 'mi' ? km * 0.621371 : km
  return `${value.toFixed(1)} ${unit}`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function formatVoltage(volts: number | null): string {
  if (volts === null) return '—'
  return `${volts.toFixed(1)}V`
}

export function formatOdometer(km: number | null): string {
  if (km === null) return '—'
  return `${Math.round(km).toLocaleString('es')} km`
}

export function formatEngineHours(hours: number | null): string {
  if (hours === null) return '—'
  return `${hours.toFixed(1)} h`
}

export function formatRpm(rpm: number | null): string {
  if (rpm === null) return '—'
  return `${Math.round(rpm).toLocaleString('es')} rpm`
}

export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return '—'
  return `${Math.round(celsius)}°C`
}

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000

/**
 * Whether a device counts as online, given the current time. `now` is passed
 * in so callers can source it from a render-safe clock.
 */
export function isOnline(lastSeen: string | null, now: number): boolean {
  if (!lastSeen || !now) return false
  return now - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Nunca'
  const diff = Date.now() - new Date(isoString).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'Hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Hace ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  return `Hace ${Math.floor(hours / 24)}d`
}
