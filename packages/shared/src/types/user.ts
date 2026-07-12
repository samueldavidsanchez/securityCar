export interface Profile {
  id: string
  display_name: string | null
  phone: string | null
  avatar_url: string | null
  preferences: UserPreferences
  updated_at: string
}

export interface UserPreferences {
  speed_unit: 'km/h' | 'mph'
  distance_unit: 'km' | 'mi'
  dark_mode: boolean
  notification_sound: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  speed_unit: 'km/h',
  distance_unit: 'km',
  dark_mode: true,
  notification_sound: true,
}

export type ApiResponse<T> = {
  data: T | null
  error: string | null
}
